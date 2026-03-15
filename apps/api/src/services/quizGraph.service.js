// apps/api/src/services/quizGraph.service.js
import mongoose from "mongoose"
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb"
import { getCompiledGraph } from "../agents/graph.js"
import { createDevLogger } from "../utils/devLogger.js"

const devLog = createDevLogger("quizGraph.service")

const createPipelineRunId = () => {
    return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Generates quiz questions using the Multi-Agent LangGraph architecture.
 * Supports both PDF documents and Topic/Keyword inputs.
 *
 * @param {Object} input - input object { type: 'pdf' | 'topic', data: Buffer | string }
 * @param {Object} requirements - Quiz generation requirements
 * @param {string} [apiKey] - Optional BYOK API Key
 * @param {string} [quizId] - Optional Quiz ID for state persistence
 * @returns {Promise<Array>} - List of generated questions
 */
export const generateQuestions = async (
    input,
    requirements,
    apiKey = null,
    quizId = null
) => {
    try {
        const pipelineRunId = createPipelineRunId()

        devLog.info("Starting multi-agent generation", {
            pipelineRunId,
            inputType: input?.type,
            hasApiKey: Boolean(apiKey),
            quizId: quizId || null,
            requestedQuestions: requirements?.numQuestions,
        })

        const inputState = {
            input: {
                type: input.type,
                data: input.data,
                apiKey: apiKey,
                originalName: input.originalName,
                pipelineRunId,
            },
            requirements: requirements,
            sourceContent: "",
            draftQuestions: [],
            verifiedQuestions: [],
            errors: [],
            status: "generating",
        }

        // Initialize Persistence
        let checkpointer = undefined
        let config = undefined

        if (quizId && mongoose.connection.readyState === 1) {
            const client = mongoose.connection.getClient()
            checkpointer = new MongoDBSaver({ client })
            config = { configurable: { thread_id: quizId } }
            devLog.info("Enabled graph checkpointer", {
                pipelineRunId,
                quizId,
            })
        }

        // Get compiled graph with checkpointer (if available)
        const app = getCompiledGraph(checkpointer)

        const finalState = await app.invoke(inputState, config)

        devLog.info("Graph invocation completed", {
            pipelineRunId,
            status: finalState?.status,
            draftQuestions: finalState?.draftQuestions?.length || 0,
            verifiedQuestions: finalState?.verifiedQuestions?.length || 0,
            errors: finalState?.errors?.length || 0,
        })

        if (finalState.status === "failed") {
            throw new Error(
                `Quiz generation failed: ${finalState.errors.join(", ")}`
            )
        }

        if (
            !finalState.verifiedQuestions ||
            finalState.verifiedQuestions.length === 0
        ) {
            throw new Error("No questions could be verified and generated.")
        }

        return finalState.verifiedQuestions
    } catch (error) {
        devLog.error("Multi-agent generation failed", {
            pipelineRunId: input?.pipelineRunId || null,
            message: error?.message,
        })
        console.error("Multi-Agent Quiz Generation Error:", error)
        throw error
    }
}
