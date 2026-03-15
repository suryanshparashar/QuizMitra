import { ApiResponse, asyncHandler } from "../utils/index.js"
import {
    getActiveLlmProvider,
    getChatModelName,
    getDocumentIntelligenceModelName,
    getDocumentProcessorProvider,
    getSarvamDocumentLanguage,
    getSarvamDocumentOutputFormat,
} from "../utils/llmConfig.js"

const healthcheck = asyncHandler(async (req, res) => {
    console.log(req?.protocol + "://" + req?.get("host") + req?.originalUrl)

    return res
        .status(200)
        .json(new ApiResponse(200, "OK", "Health check passed"))
})

const aiHealthcheck = asyncHandler(async (req, res) => {
    const llmProvider = getActiveLlmProvider()
    const documentProcessorProvider = getDocumentProcessorProvider()

    const diagnostics = {
        nodeEnv: process.env.NODE_ENV || "unknown",
        llm: {
            provider: llmProvider,
            model: getChatModelName({ provider: llmProvider }),
            apiKeyConfigured:
                llmProvider === "sarvam"
                    ? Boolean(process.env.SARVAM_AI_API_KEY)
                    : Boolean(
                          process.env.GEMINI_API_KEY ||
                              process.env.GOOGLE_API_KEY
                      ),
        },
        documentProcessing: {
            provider: documentProcessorProvider,
            model:
                documentProcessorProvider === "sarvam"
                    ? getDocumentIntelligenceModelName()
                    : "local-pdf-parse",
            language:
                documentProcessorProvider === "sarvam"
                    ? getSarvamDocumentLanguage()
                    : null,
            outputFormat:
                documentProcessorProvider === "sarvam"
                    ? getSarvamDocumentOutputFormat()
                    : null,
            strictMode: process.env.SARVAM_DOCUMENT_STRICT === "true",
        },
    }

    return res
        .status(200)
        .json(new ApiResponse(200, diagnostics, "AI health check passed"))
})

export { healthcheck, aiHealthcheck }
