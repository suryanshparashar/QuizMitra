// apps/api/src/services/quizGraph.service.js
import mongoose from "mongoose"
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb"
import { getCompiledGraph } from "../agents/graph.js"

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
        const inputState = {
            input: {
                type: input.type,
                data: input.data,
                apiKey: apiKey,
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
        }

        // Get compiled graph with checkpointer (if available)
        const app = getCompiledGraph(checkpointer)

        const finalState = await app.invoke(inputState, config)

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
        console.error("Multi-Agent Quiz Generation Error:", error)
        throw error
    }
}
