// apps/api/src/agents/nodes/content.node.js
import { extractSourceContent } from "../../services/documentProcessing.service.js"
import { createDevLogger } from "../../utils/devLogger.js"

const devLog = createDevLogger("node.content")

export const contentNode = async (state) => {
    const { input } = state
    const pipelineRunId = input?.pipelineRunId || "unknown"

    devLog.info("Entered content node", {
        pipelineRunId,
        inputType: input?.type,
        hasSourceContent: Boolean(state.sourceContent),
    })

    if (state.sourceContent) {
        return { sourceContent: state.sourceContent }
    }

    try {
        const sourceContent = await extractSourceContent(input)

        devLog.info("Content extracted", {
            pipelineRunId,
            contentLength: sourceContent?.length || 0,
        })

        return { sourceContent }
    } catch (error) {
        devLog.error("Content extraction failed", {
            pipelineRunId,
            message: error?.message,
        })
        console.error("Content extraction error:", error)
        return {
            errors: [`Failed to extract content: ${error.message}`],
            status: "failed",
        }
    }
}
