// apps/api/src/agents/utils/modelFactory.js
import { createChatModel } from "../../utils/llmClient.js"

export const createModel = (config = {}) => {
    return createChatModel({
        ...config,
        purpose: config.purpose || "quizGeneration",
        temperature: config.temperature ?? 0.2,
        maxOutputTokens: config.maxOutputTokens ?? 8192,
    })
}
