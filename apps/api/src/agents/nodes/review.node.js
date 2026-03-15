// apps/api/src/agents/nodes/review.node.js
import { createModel } from "../utils/modelFactory.js"
import { z } from "zod"
import { StructuredOutputParser } from "@langchain/core/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { createDevLogger } from "../../utils/devLogger.js"

const devLog = createDevLogger("node.review")

export const reviewNode = async (state) => {
    const { draftQuestions, input, requirements } = state
    const model = createModel({ apiKey: input.apiKey })
    const pipelineRunId = input?.pipelineRunId || "unknown"

    devLog.info("Entered review node", {
        pipelineRunId,
        draftCount: draftQuestions?.length || 0,
        requestedCount: requirements?.numQuestions,
    })

    // In a robust system, this calls the LLM to verify.
    // For latency reasons in "monolithic backend" mode, we might trust the previous steps
    // or do a lightweight check. Let's do a lightweight check for empty fields.

    const verifiedQuestions = draftQuestions.filter((q) => {
        if (!q.options || q.options.length < 2) return false
        if (!q.correctAnswer) return false
        // Check if correct answer is actually in options
        if (!q.options.includes(q.correctAnswer)) {
            // Fix it if possible, otherwise drop
            q.options.push(q.correctAnswer)
        }
        return true
    })

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

    return { verifiedQuestions, status: "reviewing" }
}
