// apps/api/src/agents/nodes/options.node.js
import { createModel } from "../utils/modelFactory.js"
import { z } from "zod"
import { StructuredOutputParser } from "@langchain/core/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { createDevLogger } from "../../utils/devLogger.js"

const devLog = createDevLogger("node.options")

const buildFallbackDistractors = (correctAnswer) => {
    const base = String(correctAnswer || "Correct answer").trim()
    return [
        `${base} (alternative A)`,
        `${base} (alternative B)`,
        `${base} (alternative C)`,
    ]
}

const normalizeDistractors = (correctAnswer, distractors) => {
    const correct = String(correctAnswer || "").trim()

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

export const optionsNode = async (state) => {
    const { draftQuestions, input } = state
    const model = createModel({ apiKey: input.apiKey })
    const pipelineRunId = input?.pipelineRunId || "unknown"
    let fallbackCount = 0

    devLog.info("Entered options node", {
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
    For the following question, generate 3 incorrect but plausible distractors (wrong answers).
    
    Question: {question}
    Correct Answer: {correctAnswer}
    Difficulty: {difficulty}
    
    Ensure distractors are not ambiguous.
    {format_instructions}
  `)

    const updatedQuestions = []

    // Parallel processing for speed
    const promises = draftQuestions.map(async (q) => {
        try {
            const formattedPrompt = await prompt.format({
                question: q.questionText,
                correctAnswer: q.correctAnswer,
                difficulty: q.difficulty,
                format_instructions: parser.getFormatInstructions(),
            })

            const response = await model.invoke(formattedPrompt)
            const distractors = await parser.parse(response.content)
            const safeDistractors = normalizeDistractors(
                q.correctAnswer,
                distractors
            )

            const allOptions = [q.correctAnswer, ...safeDistractors]
            // Simple shuffle
            const shuffled = allOptions.sort(() => Math.random() - 0.5)

            return {
                ...q,
                options: shuffled,
                correctOptions: [q.correctAnswer], // Schema compatibility
            }
        } catch (e) {
            fallbackCount += 1
            console.error(
                `Failed to generate options for question: ${q.questionText}`,
                e
            )
            const safeDistractors = normalizeDistractors(
                q.correctAnswer,
                buildFallbackDistractors(q.correctAnswer)
            )
            const allOptions = [q.correctAnswer, ...safeDistractors]
            const shuffled = allOptions.sort(() => Math.random() - 0.5)

            return {
                ...q,
                options: shuffled,
                correctOptions: [q.correctAnswer],
            }
        }
    })

    const results = await Promise.all(promises)
    devLog.info("Options node completed", {
        pipelineRunId,
        outputCount: results.filter((q) => q !== null).length,
        fallbackCount,
    })
    return { draftQuestions: results.filter((q) => q !== null) }
}
