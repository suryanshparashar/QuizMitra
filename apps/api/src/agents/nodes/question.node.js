// apps/api/src/agents/nodes/question.node.js
import { createModel } from "../utils/modelFactory.js"
import { z } from "zod"
import { StructuredOutputParser } from "@langchain/core/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { createDevLogger } from "../../utils/devLogger.js"

const devLog = createDevLogger("node.question")
const CONTENT_BUDGET_STEPS = [7000, 5000, 3500, 2500]

const isPromptTooLongError = (error) => {
    const message = String(error?.message || "").toLowerCase()
    return (
        message.includes("prompt is too long") ||
        message.includes("max length") ||
        message.includes("token")
    )
}

const buildPromptContent = (sourceContent, maxChars) => {
    const normalized = String(sourceContent || "")
        .replace(/\s+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()

    return normalized.slice(0, maxChars)
}

const invokeWithAdaptiveBudget = async ({
    model,
    promptTemplate,
    sourceContent,
    promptData,
    pipelineRunId,
    phase,
}) => {
    let lastError = null

    for (const budget of CONTENT_BUDGET_STEPS) {
        try {
            const formattedPrompt = await promptTemplate.format({
                ...promptData,
                content: buildPromptContent(sourceContent, budget),
            })

            return await model.invoke(formattedPrompt)
        } catch (error) {
            lastError = error

            if (!isPromptTooLongError(error)) {
                throw error
            }

            devLog.warn("Prompt too long, retrying with smaller budget", {
                pipelineRunId,
                phase,
                budget,
                message: error?.message,
            })
        }
    }

    throw lastError || new Error("Model invocation failed")
}

const normalizeQuestion = (question, fallbackDifficulty = "Medium") => {
    return {
        questionText: String(question?.questionText || "").trim(),
        correctAnswer: String(question?.correctAnswer || "").trim(),
        topic: String(question?.topic || "General").trim(),
        difficulty: question?.difficulty || fallbackDifficulty,
    }
}

const dedupeQuestions = (questions = []) => {
    const seen = new Set()
    const unique = []

    for (const q of questions) {
        const normalized = normalizeQuestion(q)
        if (!normalized.questionText || !normalized.correctAnswer) continue

        const key = normalized.questionText.toLowerCase()
        if (seen.has(key)) continue

        seen.add(key)
        unique.push(normalized)
    }

    return unique
}

export const questionNode = async (state) => {
    const { sourceContent, requirements, input } = state
    const model = createModel({ apiKey: input.apiKey })
    const pipelineRunId = input?.pipelineRunId || "unknown"
    const requestedCount = Number(requirements?.numQuestions || 0)
    const topics = Array.isArray(requirements?.topics)
        ? requirements.topics
        : []

    devLog.info("Entered question node", {
        pipelineRunId,
        requestedCount,
        topicsCount: topics.length,
        sourceContentLength: sourceContent?.length || 0,
    })

    // Define the output schema for just the stems and correct answers
    const parser = StructuredOutputParser.fromZodSchema(
        z.array(
            z.object({
                questionText: z.string().describe("The question stem"),
                correctAnswer: z.string().describe("The correct answer text"),
                topic: z.string().describe("Topic derived from content"),
                difficulty: z
                    .enum(["Easy", "Medium", "Hard"])
                    .describe("Difficulty level"),
            })
        )
    )

    const basePrompt = PromptTemplate.fromTemplate(`
    Analyze the provided content and generate {numQuestions} high-quality quiz questions.
    
    REQUIREMENTS:
    - Difficulty: {difficulty}
    - Topics: {topics}
    - Focus on explicit facts found in the text.
    
    CONTENT:
    {content}
    
    OUTPUT FORMAT:
    {format_instructions}
  `)

    const topUpPrompt = PromptTemplate.fromTemplate(`
    Generate exactly {numQuestions} additional high-quality quiz questions from the provided content.

    REQUIREMENTS:
    - Difficulty: {difficulty}
    - Topics: {topics}
    - Focus on explicit facts found in the text.
    - DO NOT repeat or paraphrase any existing question stems listed below.

    EXISTING QUESTION STEMS TO AVOID:
    {existingQuestions}

    CONTENT:
    {content}

    OUTPUT FORMAT:
    {format_instructions}
  `)

    try {
        if (!requestedCount || requestedCount < 1) {
            return {
                errors: ["numQuestions must be greater than 0"],
            }
        }

        const response = await invokeWithAdaptiveBudget({
            model,
            promptTemplate: basePrompt,
            sourceContent,
            promptData: {
                numQuestions: requestedCount,
                difficulty: requirements.difficultyLevel,
                topics: topics.join(", "),
                format_instructions: parser.getFormatInstructions(),
            },
            pipelineRunId,
            phase: "base",
        })
        const firstBatch = await parser.parse(response.content)
        let collectedQuestions = dedupeQuestions(firstBatch)

        devLog.info("Initial question batch generated", {
            pipelineRunId,
            received: firstBatch?.length || 0,
            deduped: collectedQuestions.length,
        })

        const maxTopUpAttempts = 3
        let topUpAttempt = 0

        while (
            collectedQuestions.length < requestedCount &&
            topUpAttempt < maxTopUpAttempts
        ) {
            const remaining = requestedCount - collectedQuestions.length
            topUpAttempt += 1

            devLog.info("Top-up generation attempt", {
                pipelineRunId,
                attempt: topUpAttempt,
                remaining,
            })

            const topUpResponse = await invokeWithAdaptiveBudget({
                model,
                promptTemplate: topUpPrompt,
                sourceContent,
                promptData: {
                    numQuestions: remaining,
                    difficulty: requirements.difficultyLevel,
                    topics: topics.join(", "),
                    existingQuestions: collectedQuestions
                        .slice(0, 30)
                        .map((q, index) => `${index + 1}. ${q.questionText}`)
                        .join("\n"),
                    format_instructions: parser.getFormatInstructions(),
                },
                pipelineRunId,
                phase: "top-up",
            })

            let topUpBatch = []
            try {
                topUpBatch = await parser.parse(topUpResponse.content)
            } catch (parseError) {
                console.error("Top-up question parse error:", parseError)
            }

            collectedQuestions = dedupeQuestions([
                ...collectedQuestions,
                ...topUpBatch,
            ])

            devLog.info("Top-up batch processed", {
                pipelineRunId,
                attempt: topUpAttempt,
                topUpReceived: topUpBatch?.length || 0,
                totalCollected: collectedQuestions.length,
            })
        }

        if (collectedQuestions.length < requestedCount) {
            devLog.warn("Question generation shortfall", {
                pipelineRunId,
                requestedCount,
                collected: collectedQuestions.length,
            })
            return {
                status: "failed",
                errors: [
                    `Insufficient generated questions after retries: expected ${requestedCount}, got ${collectedQuestions.length}`,
                ],
            }
        }

        const questions = collectedQuestions.slice(0, requestedCount)

        devLog.info("Question node completed", {
            pipelineRunId,
            finalCount: questions.length,
            topUpAttempts: topUpAttempt,
        })

        return { draftQuestions: questions }
    } catch (error) {
        devLog.error("Question node failed", {
            pipelineRunId,
            message: error?.message,
        })
        console.error("Question generation error:", error)
        return {
            errors: [`Failed to generate questions: ${error.message}`],
        }
    }
}
