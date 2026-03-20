import { createModel } from "../../utils/modelFactory.js"
import {
    getQuestionTypeAllocation,
    normalizeQuestionTypeValue,
    OBJECTIVE_TYPES,
    SUBJECTIVE_TYPES,
} from "./questionType.utils.js"
import {
    buildPromptTemplate,
    dedupeByStem,
    invokeWithAdaptiveBudget,
} from "./generationAgent.utils.js"

const ALLOCATION_MAP = {
    objective: {
        countField: "objectiveCount",
        typesField: "objectiveTypes",
    },
    subjective: {
        countField: "subjectiveCount",
        typesField: "subjectiveTypes",
    },
}

const getResponseSnippet = (content, limit = 1200) => {
    return String(content || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limit)
}

const normalizeDifficulty = (value) => {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()

    if (normalized === "easy") return "Easy"
    if (normalized === "hard") return "Hard"
    return "Medium"
}

const parseJsonFromContent = (rawContent) => {
    const raw = String(rawContent || "").trim()
    if (!raw) return null

    const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()

    try {
        return JSON.parse(cleaned)
    } catch {
        // Fall through to bracket extraction
    }

    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
        try {
            return JSON.parse(arrayMatch[0])
        } catch {
            // Continue to object extraction
        }
    }

    const objectMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!objectMatch) return null

    try {
        return JSON.parse(objectMatch[0])
    } catch {
        return null
    }
}

const extractQuestionArray = (payload) => {
    if (Array.isArray(payload)) return payload
    if (!payload || typeof payload !== "object") return []

    const candidateKeys = ["questions", "items", "data", "result", "output"]
    for (const key of candidateKeys) {
        if (Array.isArray(payload[key])) {
            return payload[key]
        }
    }

    return []
}

const normalizeQuestion = (rawQuestion, allowedTypes) => {
    const questionText = String(
        rawQuestion?.questionText ||
            rawQuestion?.question ||
            rawQuestion?.stem ||
            ""
    ).trim()
    const correctAnswer = String(
        rawQuestion?.correctAnswer || rawQuestion?.answer || ""
    ).trim()

    const questionType = normalizeQuestionTypeValue(
        rawQuestion?.questionType || rawQuestion?.type || "multiple-choice"
    )

    if (!allowedTypes.includes(questionType)) {
        return null
    }

    if (!questionText || !correctAnswer) {
        return null
    }

    return {
        questionText,
        correctAnswer,
        topic: String(rawQuestion?.topic || "General").trim() || "General",
        difficulty: normalizeDifficulty(rawQuestion?.difficulty),
        questionType,
    }
}

const parseFallbackQuestions = (rawContent, allowedTypes) => {
    const payload = parseJsonFromContent(rawContent)
    const questionArray = extractQuestionArray(payload)
    return questionArray
        .map((entry) => normalizeQuestion(entry, allowedTypes))
        .filter(Boolean)
}

export const runQuestionGenerationAgent = async ({
    state,
    parser,
    systemPrompt,
    kind,
    responseKey,
    devLog,
    agentLabel,
}) => {
    const { sourceContent, requirements, input } = state
    const pipelineRunId = input?.pipelineRunId || "unknown"
    const requestedCount = Number(requirements?.numQuestions || 0)

    const model = createModel({ apiKey: input?.apiKey })

    const allocation = getQuestionTypeAllocation(
        requestedCount,
        requirements?.questionTypes
    )

    const shape = ALLOCATION_MAP[kind]
    const targetCount = Number(allocation?.[shape.countField] || 0)
    const allowedTypes = Array.isArray(allocation?.[shape.typesField])
        ? allocation[shape.typesField]
        : []

    if (!targetCount) {
        devLog.info(`Skipping ${agentLabel} generation (no types selected)`, {
            pipelineRunId,
        })
        return { [responseKey]: [] }
    }

    const promptTemplate = buildPromptTemplate(systemPrompt)

    try {
        const response = await invokeWithAdaptiveBudget({
            model,
            promptTemplate,
            sourceContent,
            promptData: {
                numQuestions: targetCount,
                difficulty: requirements?.difficultyLevel || "medium",
                topics: Array.isArray(requirements?.topics)
                    ? requirements.topics.join(", ")
                    : "General",
                questionTypes: allowedTypes.join(", "),
                format_instructions: parser.getFormatInstructions(),
            },
            onRetry: ({ budget, error }) => {
                devLog.warn(`${agentLabel} prompt too long, retrying`, {
                    pipelineRunId,
                    budget,
                    message: error?.message,
                })
            },
        })

        let parsed = []
        try {
            parsed = await parser.parse(response?.content)
        } catch (parseError) {
            const expectedTypes =
                kind === "objective" ? OBJECTIVE_TYPES : SUBJECTIVE_TYPES
            const scopedAllowedTypes = allowedTypes.filter((type) =>
                expectedTypes.includes(type)
            )

            const fallbackParsed = parseFallbackQuestions(
                response?.content,
                scopedAllowedTypes.length ? scopedAllowedTypes : expectedTypes
            )

            devLog.warn(
                `${agentLabel} structured parse failed, used fallback`,
                {
                    pipelineRunId,
                    message: parseError?.message,
                    fallbackCount: fallbackParsed.length,
                    responseSnippet: getResponseSnippet(response?.content),
                }
            )

            parsed = fallbackParsed
        }

        const generated = dedupeByStem(parsed).slice(0, targetCount)

        devLog.info(`${agentLabel} generation completed`, {
            pipelineRunId,
            requested: targetCount,
            generated: generated.length,
            allowedTypes,
        })

        return { [responseKey]: generated }
    } catch (error) {
        devLog.error(`${agentLabel} generation failed`, {
            pipelineRunId,
            message: error?.message,
            stack: error?.stack,
        })

        return {
            [responseKey]: [],
            errors: [
                `${agentLabel} generation failed: ${error?.message || "Unknown"}`,
            ],
        }
    }
}
