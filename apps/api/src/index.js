import dotenv from "dotenv"
import { app } from "./app.js"
import connectDB from "./db/index.js"
import { getActiveLlmProvider, getChatModelName } from "./utils/llmConfig.js"
import { getDocumentProcessorDebugInfo } from "./services/documentProcessing.service.js"

dotenv.config({
    path: ".env",
})

// // ✅ Debug environment loading
// console.log("🔍 Environment Debug:")
// console.log("NODE_ENV:", process.env.NODE_ENV || "not set")
// console.log("MONGODB_URI:", process.env.MONGODB_URI ? "✅ Set" : "❌ Not set")
// console.log("PORT:", process.env.PORT || "not set")
// console.log("CORS_ORIGINS:", process.env.CORS_ORIGINS || "not set")

const PORT = process.env.PORT || 8001

const getActiveEmailProvider = () => {
    if (process.env.EMAIL_PROVIDER) {
        return process.env.EMAIL_PROVIDER.toLowerCase()
    }
    if (
        process.env.ZOHO_CLIENT_ID &&
        process.env.ZOHO_CLIENT_SECRET &&
        process.env.ZOHO_REFRESH_TOKEN &&
        process.env.ZOHO_ACCOUNT_ID
    ) {
        return "zoho"
    }
    return "smtp"
}

connectDB()
    .then(() => {
        console.log(`Server connected to MongoDB`)
        console.log(`Email provider: ${getActiveEmailProvider()}`)
        console.log(
            `LLM provider: ${getActiveLlmProvider()} (${getChatModelName()})`
        )
        const documentProcessor = getDocumentProcessorDebugInfo()
        console.log(
            `Document processor: ${documentProcessor.provider} (${documentProcessor.model})`
        )
        app.listen(PORT, () => {
            console.log(
                `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
            )
        })
    })
    .catch((error) => {
        console.error("MongoDB connection error: ", error)
        process.exit(1)
    })

export default app
