import { createModel } from "../utils/modelFactory.js"
import { z } from "zod"
import { StructuredOutputParser } from "@langchain/core/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { createDevLogger } from "../../utils/devLogger.js"

const devLog = createDevLogger("agent.options")

const normalizeText = (value) => String(value || "").trim()

const uniqueNonEmpty = (entries = []) => {
    return [
        ...new Set(
            (Array.isArray(entries) ? entries : [])
                .map((entry) => normalizeText(entry))
                .filter(Boolean)
        ),
    ]
}

const getPrimaryCorrectAnswer = (question) => {
    const direct = normalizeText(question?.correctAnswer)
    if (direct) return direct

    const fromArray = uniqueNonEmpty(question?.correctOptions)[0]
    if (fromArray) return fromArray

    return "Correct answer"
}

const getAllCorrectOptions = (question) => {
    const combined = uniqueNonEmpty([
        question?.correctAnswer,
        ...(Array.isArray(question?.correctOptions)
            ? question.correctOptions
            : []),
    ])

    if (combined.length > 0) {
        return combined
    }

    return ["Correct answer"]
}

const buildFallbackDistractors = (correctAnswer) => {
    const base = String(correctAnswer || "Correct answer").trim()
    return [
        `${base} (alternative A)`,
        `${base} (alternative B)`,
        `${base} (alternative C)`,
    ]
}

const normalizeDistractors = (correctAnswer, distractors) => {
    const correct = normalizeText(correctAnswer)

    const cleaned = (Array.isArray(distractors) ? distractors : [])
        .map((d) => String(d || "").trim())
        .filter((d) => d && d.toLowerCase() !== correct.toLowerCase())

    const unique = [...new Set(cleaned)]

    while (unique.length < 3) {
        const fallback = buildFallbackDistractors(correct)[unique.length]
        unique.push(fallback)
    }

    return unique.slice(0, 3)
}

const parseDistractorsFallback = (rawContent) => {
    const cleaned = String(rawContent || "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()

    let payload = null

    try {
        payload = JSON.parse(cleaned)
    } catch {
        const objectMatch = cleaned.match(/\{[\s\S]*\}/)
        if (objectMatch) {
            try {
                payload = JSON.parse(objectMatch[0])
            } catch {
                payload = null
            }
        }
    }

    if (Array.isArray(payload)) {
        return payload
    }

    if (!payload || typeof payload !== "object") {
        return []
    }

    const candidates = ["foo", "options", "distractors", "choices", "items"]
    for (const key of candidates) {
        if (Array.isArray(payload[key])) {
            return payload[key]
        }
    }

    return []
}

const buildObjectiveQuestionWithOptions = ({
    question,
    questionType,
    distractors,
}) => {
    const primaryCorrectAnswer = getPrimaryCorrectAnswer(question)
    const allCorrectOptions = getAllCorrectOptions(question)

    const safeDistractors = normalizeDistractors(
        primaryCorrectAnswer,
        distractors
    )

    const baseOptions = uniqueNonEmpty([
        ...allCorrectOptions,
        ...safeDistractors,
        ...(Array.isArray(question?.options) ? question.options : []),
    ])

    const shuffled = baseOptions.sort(() => Math.random() - 0.5)

    if (questionType === "multiple-select") {
        const finalCorrectOptions = allCorrectOptions.filter((entry) =>
            shuffled.includes(entry)
        )

        return {
            ...question,
            options: shuffled,
            correctAnswer: undefined,
            correctOptions:
                finalCorrectOptions.length > 0
                    ? finalCorrectOptions
                    : [shuffled[0] || primaryCorrectAnswer],
        }
    }

    const finalCorrectAnswer = shuffled.includes(primaryCorrectAnswer)
        ? primaryCorrectAnswer
        : shuffled[0] || primaryCorrectAnswer

    return {
        ...question,
        options: shuffled,
        correctAnswer: finalCorrectAnswer,
        correctOptions: undefined,
    }
}

export const optionsAgent = async (state) => {
    const { draftQuestions, input } = state
    const model = createModel({ apiKey: input.apiKey })
    const pipelineRunId = input?.pipelineRunId || "unknown"
    let fallbackCount = 0

    devLog.info("Entered options agent", {
        pipelineRunId,
        draftCount: draftQuestions?.length || 0,
    })

    const parser = StructuredOutputParser.fromZodSchema(
        z
            .array(z.string())
            .length(3)
            .describe("Three incorrect but plausible options")
    )

    const prompt = PromptTemplate.fromTemplate(`
        Generate exactly 3 wrong but plausible answer options for the question below.

        Question: {question}
        Correct Answer: {correctAnswer}
        Difficulty: {difficulty}

        Rules:
        - Each distractor must be clearly wrong but believable.
        - No distractor may overlap with or hint at the correct answer.
        - No vague or trick options.

        {format_instructions}
  `)

    const buildTrueFalseQuestion = (question) => {
        const primaryCorrectAnswer = getPrimaryCorrectAnswer(question)
        const normalizedAnswer =
            String(primaryCorrectAnswer || "")
                .trim()
                .toLowerCase() === "true"
                ? "True"
                : "False"

        return {
            ...question,
            options: ["True", "False"],
            correctAnswer: normalizedAnswer,
            correctOptions: undefined,
        }
    }

    const buildSubjectiveQuestion = (question) => {
        return {
            ...question,
            options: [],
            correctOptions: undefined,
        }
    }

    const promises = draftQuestions.map(async (q) => {
        const questionType = String(q?.questionType || "multiple-choice")
            .trim()
            .toLowerCase()

        if (questionType === "short-answer" || questionType === "long-answer") {
            return buildSubjectiveQuestion(q)
        }

        if (questionType === "true-false") {
            return buildTrueFalseQuestion(q)
        }

        try {
            const primaryCorrectAnswer = getPrimaryCorrectAnswer(q)
            const formattedPrompt = await prompt.format({
                question: q.questionText,
                correctAnswer: primaryCorrectAnswer,
                difficulty: q.difficulty,
                format_instructions: parser.getFormatInstructions(),
            })

            const response = await model.invoke(formattedPrompt)
            let distractors = []

            try {
                distractors = await parser.parse(response.content)
            } catch {
                distractors = parseDistractorsFallback(response?.content)
            }

            return buildObjectiveQuestionWithOptions({
                question: q,
                questionType,
                distractors,
            })
        } catch (e) {
            fallbackCount += 1
            devLog.warn(
                "Distractor generation failed; using fallback options",
                {
                    pipelineRunId,
                    questionText: String(q?.questionText || "").slice(0, 120),
                    message: e?.message,
                }
            )

            return buildObjectiveQuestionWithOptions({
                question: q,
                questionType,
                distractors: buildFallbackDistractors(
                    getPrimaryCorrectAnswer(q)
                ),
            })
        }
    })

    const results = await Promise.all(promises)
    devLog.info("Options agent completed", {
        pipelineRunId,
        outputCount: results.filter((q) => q !== null).length,
        fallbackCount,
    })

    return { draftQuestions: results.filter((q) => q !== null) }
}
