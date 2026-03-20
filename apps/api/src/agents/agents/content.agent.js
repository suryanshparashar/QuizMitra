import { extractSourceContent } from "../../services/documentProcessing.service.js"
import { createDevLogger } from "../../utils/devLogger.js"

const devLog = createDevLogger("agent.content")

export const contentAgent = async (state) => {
    const { input } = state
    const pipelineRunId = input?.pipelineRunId || "unknown"

    devLog.info("Entered content agent", {
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
