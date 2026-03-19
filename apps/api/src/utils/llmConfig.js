const normalizeProvider = (provider) => {
    const normalized = String(provider || "")
        .trim()
        .toLowerCase()
    return normalized === "sarvam" ? "sarvam" : "google"
}

const normalizeDocumentProcessorProvider = (provider) => {
    const normalized = String(provider || "")
        .trim()
        .toLowerCase()
    return normalized === "sarvam" ? "sarvam" : "local"
}

export const getActiveLlmProvider = () => {
    if (process.env.LLM_PROVIDER) {
        return normalizeProvider(process.env.LLM_PROVIDER)
    }

    return process.env.USE_SARVAM_AI === "true" ? "sarvam" : "google"
}

export const normalizeSarvamChatModel = (modelName) => {
    const normalized = String(modelName || "")
        .trim()
        .toLowerCase()

    if (!normalized) {
        throw new Error("SARVAM_LLM_MODEL is required when LLM_PROVIDER=sarvam")
    }

    return normalized
}

export const getChatModelName = ({
    provider = getActiveLlmProvider(),
    purpose = "default",
} = {}) => {
    if (provider === "sarvam") {
        return normalizeSarvamChatModel(process.env.SARVAM_LLM_MODEL)
    }

    const explicitModel =
        process.env.LLM_MODEL ||
        (purpose === "basic"
            ? process.env.GOOGLE_LLM_BASIC_MODEL
            : process.env.GOOGLE_LLM_ADVANCED_MODEL) ||
        process.env.GOOGLE_LLM_ADVANCED_MODEL ||
        process.env.GOOGLE_LLM_BASIC_MODEL

    if (!explicitModel) {
        throw new Error(
            "No LLM model configured. Set LLM_MODEL or provider-specific model env vars."
        )
    }

    return explicitModel
}

export const getGoogleApiKey = () => {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
}

export const getLlmApiKey = ({ provider = getActiveLlmProvider() } = {}) => {
    if (provider === "sarvam") {
        return process.env.SARVAM_AI_API_KEY
    }

    return getGoogleApiKey()
}

export const getSarvamApiBaseUrl = () => {
    return process.env.SARVAM_API_BASE_URL || "https://api.sarvam.ai/v1"
}

export const getSarvamDocumentApiBaseUrl = () => {
    return process.env.SARVAM_DOCUMENT_API_BASE_URL || "https://api.sarvam.ai"
}

export const getDocumentProcessorProvider = () => {
    if (process.env.DOCUMENT_PROCESSOR_PROVIDER) {
        return normalizeDocumentProcessorProvider(
            process.env.DOCUMENT_PROCESSOR_PROVIDER
        )
    }

    return getActiveLlmProvider() === "sarvam" ? "sarvam" : "local"
}

export const shouldUseSarvamVision = () => {
    return getDocumentProcessorProvider() === "sarvam"
}

export const getSarvamDocumentLanguage = () => {
    return process.env.SARVAM_DOCUMENT_LANGUAGE || "en-IN"
}

export const getSarvamDocumentOutputFormat = () => {
    const rawFormat = String(process.env.SARVAM_DOCUMENT_OUTPUT_FORMAT || "md")
        .trim()
        .toLowerCase()

    if (rawFormat === "html") {
        return "html"
    }

    // Sarvam supports only html or md. Keep legacy json configs backward-compatible.
    if (rawFormat === "json" || rawFormat === "markdown") {
        return "md"
    }

    return "md"
}

export const isSarvamDocumentStrictMode = () => {
    return String(process.env.SARVAM_DOCUMENT_STRICT || "false") === "true"
}

export const getSarvamDocumentPollIntervalMs = () => {
    const raw = Number(process.env.SARVAM_DOCUMENT_POLL_INTERVAL_MS || 2500)
    return Number.isFinite(raw) && raw >= 500 ? raw : 2500
}

export const getSarvamDocumentTimeoutMs = () => {
    const raw = Number(process.env.SARVAM_DOCUMENT_TIMEOUT_MS || 120000)
    return Number.isFinite(raw) && raw >= 10000 ? raw : 120000
}

export const getChatReasoningEffort = () => {
    return process.env.SARVAM_REASONING_EFFORT || undefined
}

export const getDocumentIntelligenceModelName = () => {
    const configuredModel = String(
        process.env.SARVAM_DOCUMENT_INTELLIGENCE_MODEL || ""
    )
        .trim()
        .toLowerCase()

    if (!configuredModel) {
        throw new Error("SARVAM_DOCUMENT_INTELLIGENCE_MODEL is required")
    }

    return configuredModel
}
