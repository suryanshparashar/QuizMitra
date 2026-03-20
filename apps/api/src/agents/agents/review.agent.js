import { createModel } from "../utils/modelFactory.js"
import { z } from "zod"
import { StructuredOutputParser } from "@langchain/core/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { createDevLogger } from "../../utils/devLogger.js"

const devLog = createDevLogger("agent.review")
const OUTPUT_PARSING_TROUBLESHOOTING_URL =
    "https://docs.langchain.com/oss/javascript/langchain/errors/OUTPUT_PARSING_FAILURE/"
const MAX_REVIEW_REFERENCE_CHARS = 8000

const getResponseSnippet = (content, limit = 1200) => {
    return String(content || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limit)
}

const isOutputParsingFailure = (error) => {
    const message = String(error?.message || "").toLowerCase()
    return message.includes("output_parsing_failure")
}

const buildReferenceContent = (sourceContent) => {
    return String(sourceContent || "")
        .replace(/\s+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, MAX_REVIEW_REFERENCE_CHARS)
}

const splitAnswerCandidates = (rawAnswer) => {
    const answer = String(rawAnswer || "").trim()
    if (!answer) return []

    return [
        ...new Set(
            answer
                .split(/[,;\n]|\s\|\s/)
                .map((entry) => entry.trim())
                .filter(Boolean)
        ),
    ]
}

const reviewParser = StructuredOutputParser.fromZodSchema(
    z.array(
        z.object({
            keep: z.boolean(),
            correctedQuestionText: z.string().optional(),
            correctedAnswer: z.string().optional(),
            correctedOptions: z.array(z.string()).optional(),
            correctedCorrectOptions: z.array(z.string()).optional(),
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

const pickPrimaryAnswer = (question) => {
    const direct = String(question?.correctAnswer || "").trim()
    if (direct) return direct

    const fromCorrectOptions = normalizeOptions(question?.correctOptions)[0]
    if (fromCorrectOptions) return fromCorrectOptions

    const fromOptions = normalizeOptions(question?.options)[0]
    if (fromOptions) return fromOptions

    return ""
}

const coerceQuestionForValidation = (question) => {
    const questionType = String(question?.questionType || "multiple-choice")
        .trim()
        .toLowerCase()

    if (questionType === "short-answer" || questionType === "long-answer") {
        return {
            ...question,
            correctAnswer: pickPrimaryAnswer(question),
            options: [],
            correctOptions: undefined,
        }
    }

    const options = normalizeOptions(question?.options)

    if (questionType === "multiple-select") {
        const correctOptions = normalizeOptions(question?.correctOptions)
        let inOptions = correctOptions.filter((entry) =>
            options.includes(entry)
        )

        if (options.length < 3) {
            const syntheticIncorrect = "None of the above"
            if (!options.includes(syntheticIncorrect)) {
                options.push(syntheticIncorrect)
            }
        }

        if (inOptions.length >= options.length) {
            inOptions = inOptions.slice(0, Math.max(1, options.length - 1))
        }

        // If only one correct option survives, degrade to single-answer MCQ instead of dropping.
        if (inOptions.length < 2) {
            const fallbackAnswer = inOptions[0] || pickPrimaryAnswer(question)
            const ensuredOptions = normalizeOptions([
                ...options,
                fallbackAnswer,
            ])

            return {
                ...question,
                questionType: "multiple-choice",
                options: ensuredOptions,
                correctAnswer: fallbackAnswer,
                correctOptions: undefined,
            }
        }

        return {
            ...question,
            options,
            correctAnswer: undefined,
            correctOptions: inOptions,
        }
    }

    const correctAnswer = pickPrimaryAnswer(question)
    return {
        ...question,
        options: normalizeOptions([...options, correctAnswer]),
        correctAnswer,
        correctOptions: undefined,
    }
}

const normalizeReviewedQuestion = (originalQuestion, reviewItem) => {
    const questionType = String(
        originalQuestion?.questionType || "multiple-choice"
    )
        .trim()
        .toLowerCase()
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

    if (
        correctAnswer &&
        questionType !== "short-answer" &&
        questionType !== "long-answer" &&
        !options.includes(correctAnswer)
    ) {
        options.push(correctAnswer)
    }

    if (questionType === "short-answer" || questionType === "long-answer") {
        return {
            ...originalQuestion,
            questionText,
            correctAnswer,
            options: [],
            correctOptions: undefined,
        }
    }

    if (questionType === "multiple-select") {
        const derivedFromAnswer = splitAnswerCandidates(correctAnswer)
        const correctOptions = normalizeOptions(
            reviewItem?.correctedCorrectOptions ||
                originalQuestion?.correctOptions || [correctAnswer]
        )

        const normalizedCorrectOptions =
            correctOptions.length > 0
                ? correctOptions
                : normalizeOptions(derivedFromAnswer)

        const mergedOptions = normalizeOptions([
            ...options,
            ...normalizedCorrectOptions,
        ])

        const finalCorrectOptions = normalizedCorrectOptions.filter((entry) =>
            mergedOptions.includes(entry)
        )

        return {
            ...originalQuestion,
            questionText,
            options: mergedOptions,
            correctAnswer: undefined,
            correctOptions: finalCorrectOptions,
        }
    }

    return {
        ...originalQuestion,
        questionText,
        correctAnswer,
        options: normalizeOptions(options),
    }
}

const isQuestionValid = (question) => {
    const questionType = String(question?.questionType || "multiple-choice")
        .trim()
        .toLowerCase()

    if (!question?.questionText) return false

    if (questionType === "short-answer" || questionType === "long-answer") {
        return Boolean(question?.correctAnswer)
    }

    if (questionType === "multiple-select") {
        if (
            !Array.isArray(question?.correctOptions) ||
            question.correctOptions.length < 2
        ) {
            return false
        }

        if (!Array.isArray(question?.options) || question.options.length < 2) {
            return false
        }

        if (question.correctOptions.length >= question.options.length) {
            return false
        }

        return question.correctOptions.every((entry) =>
            question.options.includes(entry)
        )
    }

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

const getInvalidReason = (question) => {
    const questionType = String(question?.questionType || "multiple-choice")
        .trim()
        .toLowerCase()

    if (!String(question?.questionText || "").trim()) {
        return "missing_question_text"
    }

    if (questionType === "short-answer" || questionType === "long-answer") {
        if (!String(question?.correctAnswer || "").trim()) {
            return "missing_subjective_answer"
        }
        return "valid"
    }

    if (questionType === "multiple-select") {
        if (
            !Array.isArray(question?.correctOptions) ||
            question.correctOptions.length < 2
        ) {
            return "insufficient_correct_options"
        }

        if (!Array.isArray(question?.options) || question.options.length < 2) {
            return "insufficient_options"
        }

        if (question.correctOptions.length >= question.options.length) {
            return "all_options_marked_correct"
        }

        const allInOptions = question.correctOptions.every((entry) =>
            question.options.includes(entry)
        )

        return allInOptions ? "valid" : "correct_option_not_in_options"
    }

    if (!String(question?.correctAnswer || "").trim()) {
        return "missing_correct_answer"
    }

    if (!Array.isArray(question?.options) || question.options.length < 2) {
        return "insufficient_options"
    }

    return "valid"
}

export const reviewAgent = async (state) => {
    const { draftQuestions, input, requirements, sourceContent } = state
    const model = createModel({
        apiKey: input.apiKey,
        provider: "sarvam",
        purpose: "quizGeneration",
        temperature: 0.1,
    })
    const pipelineRunId = input?.pipelineRunId || "unknown"

    devLog.info("Entered review agent", {
        pipelineRunId,
        draftCount: draftQuestions?.length || 0,
        requestedCount: requirements?.numQuestions,
    })

    const reviewPrompt = PromptTemplate.fromTemplate(`
        You are a quiz review agent. Review each question against the reference content.

        RULES:
        1. Set keep=false if a question is ambiguous, factually wrong, or unfixable.
        2. If kept with no changes, omit corrected fields.
        3. Return exactly one review object per question, in the same order.

        BY TYPE:
        - multiple-choice / true-false:
        · correctedAnswer = exactly one valid option
        · correctedOptions = full option list (if changed)
        - multiple-select:
        · correctedOptions = full option list
        · correctedCorrectOptions = 2+ correct options (all must exist in correctedOptions)
        - short-answer / long-answer:
        · correctedAnswer = model answer aligned with reference content

        DIFFICULTY: {difficulty}
        TOPICS: {topics}

        REFERENCE CONTENT:
        {referenceContent}

        QUESTIONS:
        {questionsJson}

        OUTPUT FORMAT:
        {format_instructions}
  `)

    let reviewItems = []
    let reviewRawContent = ""
    try {
        const formattedPrompt = await reviewPrompt.format({
            difficulty: requirements?.difficultyLevel || "Mixed",
            topics: Array.isArray(requirements?.topics)
                ? requirements.topics.join(", ")
                : "General",
            referenceContent:
                buildReferenceContent(sourceContent) ||
                "No reference content provided.",
            questionsJson: JSON.stringify(draftQuestions, null, 2),
            format_instructions: reviewParser.getFormatInstructions(),
        })

        const reviewResponse = await model.invoke(formattedPrompt)
        reviewRawContent = reviewResponse?.content || ""
        reviewItems = await reviewParser.parse(reviewResponse.content)
    } catch (error) {
        devLog.warn("LLM review failed, falling back to deterministic review", {
            pipelineRunId,
            message: error?.message,
            outputParsingFailure: isOutputParsingFailure(error),
            troubleshootingUrl: OUTPUT_PARSING_TROUBLESHOOTING_URL,
            responseSnippet: getResponseSnippet(reviewRawContent),
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
                return coerceQuestionForValidation(question)
            }

            return coerceQuestionForValidation(
                normalizeReviewedQuestion(question, reviewItem)
            )
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

    if (verifiedQuestions.length < requirements.numQuestions) {
        for (const question of draftQuestions) {
            const normalized = coerceQuestionForValidation(question)
            if (!isQuestionValid(normalized)) continue
            const key = getQuestionKey(normalized)
            if (!key || seenKeys.has(key)) continue
            seenKeys.add(key)
            verifiedQuestions.push(normalized)
            if (verifiedQuestions.length >= requirements.numQuestions) break
        }
    }

    if (verifiedQuestions.length === 0) {
        const reasonCounts = draftQuestions.reduce((acc, question) => {
            const reason = getInvalidReason(question)
            acc[reason] = (acc[reason] || 0) + 1
            return acc
        }, {})

        devLog.warn("Review rejected all questions", {
            pipelineRunId,
            draftCount: draftQuestions?.length || 0,
            reasonCounts,
            sampleQuestions: (draftQuestions || []).slice(0, 3).map((q) => ({
                questionText: String(q?.questionText || "").slice(0, 160),
                questionType: q?.questionType,
                optionsCount: Array.isArray(q?.options) ? q.options.length : 0,
                hasCorrectAnswer: Boolean(q?.correctAnswer),
                correctOptionsCount: Array.isArray(q?.correctOptions)
                    ? q.correctOptions.length
                    : 0,
            })),
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

    devLog.info("Review agent completed", {
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
