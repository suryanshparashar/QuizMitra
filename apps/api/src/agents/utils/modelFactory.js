// apps/api/src/agents/utils/modelFactory.js
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

export const createModel = (config = {}) => {
    const {
        apiKey,
        temperature = 0.2,
        modelName = process.env.GOOGLE_LLM_ADVANCED_MODEL,
    } = config

    return new ChatGoogleGenerativeAI({
        apiKey: apiKey || process.env.GEMINI_API_KEY,
        model: modelName,
        temperature: temperature,
        maxOutputTokens: 8192,
    })
}
