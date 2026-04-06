import { PromptTemplate } from "@langchain/core/prompts"

const CONTENT_BUDGET_STEPS = [7000, 5000, 3500, 2500]
const OUTPUT_TOKEN_BUDGET_STEPS = [2048, 1536, 1024, 768, 512, 384, 256]

export const buildPromptContent = (sourceContent, maxChars) => {
    const normalized = String(sourceContent || "")
        .replace(/\s+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()

    return normalized.slice(0, maxChars)
}

export const isPromptTooLongError = (error) => {
    const message = String(error?.message || "").toLowerCase()
    return (
        message.includes("prompt is too long") ||
        message.includes("max length") ||
        message.includes("token")
    )
}

const parseMaxOutputFromContextError = (error) => {
    const message = String(error?.message || "")
    const match = message.match(
        /prompt_tokens\s*\((\d+)\)\s*\+\s*max_tokens\s*\((\d+)\)\s*=\s*(\d+)\s*exceeds[^\d]*(\d+)/i
    )

    if (!match) return null

    const promptTokens = Number(match[1])
    const modelWindow = Number(match[4])

    if (!Number.isFinite(promptTokens) || !Number.isFinite(modelWindow)) {
        return null
    }

    // Reserve a small safety buffer for provider-side accounting variance.
    const allowed = modelWindow - promptTokens - 32
    if (!Number.isFinite(allowed) || allowed < 128) {
        return null
    }

    return Math.floor(allowed)
}

const getModelMaxOutputTokens = (model) => {
    const raw = Number(model?.maxOutputTokens)
    return Number.isFinite(raw) ? raw : null
}

const setModelMaxOutputTokens = (model, maxOutputTokens) => {
    if (!model || !Number.isFinite(maxOutputTokens) || maxOutputTokens < 1) {
        return
    }

    if (Object.prototype.hasOwnProperty.call(model, "maxOutputTokens")) {
        model.maxOutputTokens = Math.floor(maxOutputTokens)
    }
}

export const invokeWithAdaptiveBudget = async ({
    model,
    promptTemplate,
    sourceContent,
    promptData,
    onRetry,
}) => {
    let lastError = null
    let dynamicMaxOutputTokens = getModelMaxOutputTokens(model)

    if (!Number.isFinite(dynamicMaxOutputTokens)) {
        dynamicMaxOutputTokens = OUTPUT_TOKEN_BUDGET_STEPS[0]
    }

    for (const budget of CONTENT_BUDGET_STEPS) {
        const formattedPrompt = await promptTemplate.format({
            ...promptData,
            content: buildPromptContent(sourceContent, budget),
        })

        for (const tokenBudget of OUTPUT_TOKEN_BUDGET_STEPS) {
            const appliedMaxTokens = Math.min(
                dynamicMaxOutputTokens,
                tokenBudget
            )
            setModelMaxOutputTokens(model, appliedMaxTokens)

            try {
                return await model.invoke(formattedPrompt)
            } catch (error) {
                lastError = error

                if (!isPromptTooLongError(error)) {
                    throw error
                }

                const parsedMax = parseMaxOutputFromContextError(error)
                if (
                    Number.isFinite(parsedMax) &&
                    parsedMax > 0 &&
                    parsedMax < dynamicMaxOutputTokens
                ) {
                    dynamicMaxOutputTokens = parsedMax
                }

                if (typeof onRetry === "function") {
                    onRetry({
                        budget,
                        maxOutputTokens: appliedMaxTokens,
                        nextMaxOutputTokens: dynamicMaxOutputTokens,
                        error,
                    })
                }
            }
        }
    }

    throw lastError || new Error("Model invocation failed")
}

export const dedupeByStem = (questions = []) => {
    const seen = new Set()
    const unique = []

    for (const q of questions) {
        const stem = String(q?.questionText || "")
            .trim()
            .toLowerCase()
        if (!stem || seen.has(stem)) continue
        seen.add(stem)
        unique.push(q)
    }

    return unique
}

export const buildPromptTemplate = (systemPrompt) => {
    return PromptTemplate.fromTemplate(`
SYSTEM INSTRUCTIONS:
${systemPrompt}

TASK INPUT:
- Number of questions: {numQuestions}
- Difficulty: {difficulty}
- Topics: {topics}
- Allowed question types: {questionTypes}

CONTENT:
{content}

OUTPUT FORMAT:
{format_instructions}
`)
}
