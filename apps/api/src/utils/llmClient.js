import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ApiError } from "./ApiError.js"
import {
    getActiveLlmProvider,
    getChatModelName,
    getChatReasoningEffort,
    getLlmApiKey,
    getSarvamApiBaseUrl,
} from "./llmConfig.js"

const normalizeMessageRole = (message) => {
    if (typeof message?.role === "string") {
        if (message.role === "human") return "user"
        if (message.role === "ai") return "assistant"
        return message.role
    }

    if (typeof message?.getType === "function") {
        const messageType = message.getType()
        if (messageType === "human") return "user"
        if (messageType === "ai") return "assistant"
        return messageType
    }

    return "user"
}

const normalizeMessageContent = (message) => {
    const content = message?.content ?? message ?? ""

    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === "string") {
                    return part
                }

                if (typeof part?.text === "string") {
                    return part.text
                }

                return JSON.stringify(part)
            })
            .join("\n")
    }

    return String(content)
}

const normalizeMessages = (input) => {
    if (typeof input === "string") {
        return [{ role: "user", content: input }]
    }

    if (!Array.isArray(input)) {
        return [{ role: "user", content: normalizeMessageContent(input) }]
    }

    return input.map((message) => ({
        role: normalizeMessageRole(message),
        content: normalizeMessageContent(message),
    }))
}

class SarvamChatModel {
    constructor({
        apiKey,
        model,
        temperature = 0.2,
        maxOutputTokens = 2048,
        topP = 1,
        reasoningEffort,
    }) {
        this.apiKey = apiKey
        this.model = model
        this.temperature = temperature
        this.maxOutputTokens = maxOutputTokens
        this.topP = topP
        this.reasoningEffort = reasoningEffort
        this.baseUrl = getSarvamApiBaseUrl()
    }

    async invoke(input) {
        if (!this.apiKey) {
            throw new ApiError(500, "SARVAM_AI_API_KEY is required")
        }

        const requestBody = {
            model: this.model,
            messages: normalizeMessages(input),
            temperature: this.temperature,
            top_p: this.topP,
            max_tokens: this.maxOutputTokens,
        }

        if (this.reasoningEffort) {
            requestBody.reasoning_effort = this.reasoningEffort
        }

        let response
        try {
            response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-subscription-key": this.apiKey,
                },
                body: JSON.stringify(requestBody),
            })
        } catch (error) {
            throw new ApiError(
                503,
                `Sarvam chat request failed: ${error.message}`
            )
        }

        let data = null
        try {
            data = await response.json()
        } catch {
            data = null
        }

        if (!response.ok) {
            throw new ApiError(
                response.status,
                data?.error?.message ||
                    data?.message ||
                    "Sarvam chat completion failed"
            )
        }

        const content = data?.choices?.[0]?.message?.content

        if (!content) {
            throw new ApiError(
                502,
                "Sarvam response did not contain any message content"
            )
        }

        return {
            content,
            raw: data,
        }
    }
}

export const createChatModel = (config = {}) => {
    const provider = config.provider || getActiveLlmProvider()
    const modelName =
        config.modelName ||
        getChatModelName({ provider, purpose: config.purpose })
    const apiKey = config.apiKey || getLlmApiKey({ provider })

    if (provider === "sarvam") {
        return new SarvamChatModel({
            apiKey,
            model: modelName,
            temperature: config.temperature,
            maxOutputTokens: config.maxOutputTokens,
            topP: config.topP,
            reasoningEffort: config.reasoningEffort || getChatReasoningEffort(),
        })
    }

    return new ChatGoogleGenerativeAI({
        apiKey,
        model: modelName,
        temperature: config.temperature ?? 0.2,
        maxOutputTokens: config.maxOutputTokens ?? 2048,
        topP: config.topP,
    })
}
