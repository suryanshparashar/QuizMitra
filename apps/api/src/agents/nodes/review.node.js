// apps/api/src/agents/nodes/review.node.js
import { createModel } from "../utils/modelFactory.js"
import { z } from "zod"
import { StructuredOutputParser } from "@langchain/core/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { createDevLogger } from "../../utils/devLogger.js"

const devLog = createDevLogger("node.review")

const reviewParser = StructuredOutputParser.fromZodSchema(
    z.array(
        z.object({
            keep: z.boolean(),
            correctedQuestionText: z.string().optional(),
            correctedAnswer: z.string().optional(),
            correctedOptions: z.array(z.string()).optional(),
            reason: z.string().optional(),
        })
    )
)

const normalizeOptions = (options = []) => {
    const normalized = (Array.isArray(options) ? options : [])
        .map((option) => String(option || "").trim())
        .filter(Boolean)

    return [...new Set(normalized)]
}

const normalizeReviewedQuestion = (originalQuestion, reviewItem) => {
    const originalOptions = normalizeOptions(originalQuestion?.options)
    const reviewedOptions = normalizeOptions(reviewItem?.correctedOptions)

    const questionText = String(
        reviewItem?.correctedQuestionText ||
            originalQuestion?.questionText ||
            ""
    ).trim()

    const correctAnswer = String(
        reviewItem?.correctedAnswer || originalQuestion?.correctAnswer || ""
    ).trim()

    const options =
        reviewedOptions.length >= 2 ? reviewedOptions : originalOptions

    if (correctAnswer && !options.includes(correctAnswer)) {
        options.push(correctAnswer)
    }

    return {
        ...originalQuestion,
        questionText,
        correctAnswer,
        options: normalizeOptions(options),
    }
}

const isQuestionValid = (question) => {
    if (!question?.questionText) return false
    if (!question?.correctAnswer) return false
    if (!Array.isArray(question?.options) || question.options.length < 2) {
        return false
    }

    if (!question.options.includes(question.correctAnswer)) {
        question.options.push(question.correctAnswer)
    }

    return true
}

const getQuestionKey = (question) => {
    return String(question?.questionText || "")
        .trim()
        .toLowerCase()
}

export const reviewNode = async (state) => {
    const { draftQuestions, input, requirements } = state
    const model = createModel({
        apiKey: input.apiKey,
        provider: "sarvam",
        purpose: "quizGeneration",
        temperature: 0.1,
    })
    const pipelineRunId = input?.pipelineRunId || "unknown"

    devLog.info("Entered review node", {
        pipelineRunId,
        draftCount: draftQuestions?.length || 0,
        requestedCount: requirements?.numQuestions,
    })

    const reviewPrompt = PromptTemplate.fromTemplate(`
    You are a strict quiz-review agent.

    Review each question and decide if it should be kept.
    You may lightly correct wording, options, and correct answer when needed.

    Return EXACTLY one review object per input question in the same order.

    RULES:
    - keep = false only when the question is invalid, ambiguous, or cannot be fixed reliably.
    - If you keep a question but make no correction, you may omit corrected fields.
    - correctedOptions should contain at least 2 options when provided.
    - correctedAnswer must be present in correctedOptions when both are provided.

    QUIZ REQUIREMENTS:
    - Target difficulty: {difficulty}
    - Target topics: {topics}

    QUESTIONS TO REVIEW:
    {questionsJson}

    OUTPUT FORMAT:
    {format_instructions}
  `)

    let reviewItems = []
    try {
        const formattedPrompt = await reviewPrompt.format({
            difficulty: requirements?.difficultyLevel || "Mixed",
            topics: Array.isArray(requirements?.topics)
                ? requirements.topics.join(", ")
                : "General",
            questionsJson: JSON.stringify(draftQuestions, null, 2),
            format_instructions: reviewParser.getFormatInstructions(),
        })

        const reviewResponse = await model.invoke(formattedPrompt)
        reviewItems = await reviewParser.parse(reviewResponse.content)
    } catch (error) {
        devLog.warn("LLM review failed, falling back to deterministic review", {
            pipelineRunId,
            message: error?.message,
        })
        reviewItems = []
    }

    const reviewedQuestions = draftQuestions
        .map((question, index) => {
            const reviewItem = reviewItems[index]

            if (reviewItem?.keep === false) {
                return null
            }

            if (!reviewItem) {
                return question
            }

            return normalizeReviewedQuestion(question, reviewItem)
        })
        .filter(Boolean)
        .filter((question) => isQuestionValid(question))

    const verifiedQuestions = []
    const seenKeys = new Set()

    for (const question of reviewedQuestions) {
        const key = getQuestionKey(question)
        if (!key || seenKeys.has(key)) continue
        seenKeys.add(key)
        verifiedQuestions.push(question)
    }

    // If LLM review is too strict, backfill with valid original questions
    if (verifiedQuestions.length < requirements.numQuestions) {
        for (const question of draftQuestions) {
            if (!isQuestionValid(question)) continue
            const key = getQuestionKey(question)
            if (!key || seenKeys.has(key)) continue
            seenKeys.add(key)
            verifiedQuestions.push(question)
            if (verifiedQuestions.length >= requirements.numQuestions) break
        }
    }

    if (verifiedQuestions.length === 0) {
        devLog.warn("Review rejected all questions", {
            pipelineRunId,
        })
        return {
            status: "failed",
            errors: ["All questions failed verification"],
        }
    }

    if (verifiedQuestions.length < requirements.numQuestions) {
        devLog.warn("Review produced insufficient questions", {
            pipelineRunId,
            requested: requirements.numQuestions,
            verified: verifiedQuestions.length,
        })
        return {
            status: "failed",
            errors: [
                `Insufficient verified questions: expected ${requirements.numQuestions}, got ${verifiedQuestions.length}`,
            ],
        }
    }

    devLog.info("Review node completed", {
        pipelineRunId,
        verifiedCount: verifiedQuestions.length,
    })

    return {
        verifiedQuestions: verifiedQuestions.slice(
            0,
            requirements.numQuestions
        ),
        status: "reviewing",
    }
}
