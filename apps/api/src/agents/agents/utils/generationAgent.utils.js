import { PromptTemplate } from "@langchain/core/prompts"

const CONTENT_BUDGET_STEPS = [7000, 5000, 3500, 2500]

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

export const invokeWithAdaptiveBudget = async ({
    model,
    promptTemplate,
    sourceContent,
    promptData,
    onRetry,
}) => {
    let lastError = null

    for (const budget of CONTENT_BUDGET_STEPS) {
        try {
            const formattedPrompt = await promptTemplate.format({
                ...promptData,
                content: buildPromptContent(sourceContent, budget),
            })
            return await model.invoke(formattedPrompt)
        } catch (error) {
            lastError = error

            if (!isPromptTooLongError(error)) {
                throw error
            }

            if (typeof onRetry === "function") {
                onRetry({ budget, error })
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
