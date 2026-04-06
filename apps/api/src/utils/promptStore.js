import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const API_ROOT_DIR = path.resolve(__dirname, "..", "..")
const DEFAULT_PROMPTS_DIR = path.join(API_ROOT_DIR, "prompts")

export const PROMPT_KEYS = Object.freeze({
    OBJECTIVE_QUESTION_SYSTEM: "OBJECTIVE_QUESTION_SYSTEM",
    SUBJECTIVE_QUESTION_SYSTEM: "SUBJECTIVE_QUESTION_SYSTEM",
    REVIEW_AGENT_TEMPLATE: "REVIEW_AGENT_TEMPLATE",
    OPTIONS_AGENT_TEMPLATE: "OPTIONS_AGENT_TEMPLATE",
    SUBJECTIVE_EVALUATION_TEMPLATE: "SUBJECTIVE_EVALUATION_TEMPLATE",
    ADVISORY_REPORT_SYSTEM: "ADVISORY_REPORT_SYSTEM",
    ADVISORY_REPORT_USER: "ADVISORY_REPORT_USER",
    PERFORMANCE_INSIGHTS_SYSTEM: "PERFORMANCE_INSIGHTS_SYSTEM",
    PERFORMANCE_INSIGHTS_USER: "PERFORMANCE_INSIGHTS_USER",
    PDF_QUESTION_GENERATION_TEMPLATE: "PDF_QUESTION_GENERATION_TEMPLATE",
    QUIZ_REGENERATE_QUESTION_TEMPLATE: "QUIZ_REGENERATE_QUESTION_TEMPLATE",
    QUIZ_GENERATE_NEW_QUESTION_TEMPLATE: "QUIZ_GENERATE_NEW_QUESTION_TEMPLATE",
})

const PROMPT_DEFINITIONS = Object.freeze({
    [PROMPT_KEYS.OBJECTIVE_QUESTION_SYSTEM]: {
        envVar: "PROMPT_OBJECTIVE_QUESTION_SYSTEM",
        fileName: "objective-question.system.txt",
    },
    [PROMPT_KEYS.SUBJECTIVE_QUESTION_SYSTEM]: {
        envVar: "PROMPT_SUBJECTIVE_QUESTION_SYSTEM",
        fileName: "subjective-question.system.txt",
    },
    [PROMPT_KEYS.REVIEW_AGENT_TEMPLATE]: {
        envVar: "PROMPT_REVIEW_AGENT_TEMPLATE",
        fileName: "review-agent.template.txt",
    },
    [PROMPT_KEYS.OPTIONS_AGENT_TEMPLATE]: {
        envVar: "PROMPT_OPTIONS_AGENT_TEMPLATE",
        fileName: "options-agent.template.txt",
    },
    [PROMPT_KEYS.SUBJECTIVE_EVALUATION_TEMPLATE]: {
        envVar: "PROMPT_SUBJECTIVE_EVALUATION_TEMPLATE",
        fileName: "subjective-evaluation.template.txt",
    },
    [PROMPT_KEYS.ADVISORY_REPORT_SYSTEM]: {
        envVar: "PROMPT_ADVISORY_REPORT_SYSTEM",
        fileName: "advisory-report.system.txt",
    },
    [PROMPT_KEYS.ADVISORY_REPORT_USER]: {
        envVar: "PROMPT_ADVISORY_REPORT_USER",
        fileName: "advisory-report.user.txt",
    },
    [PROMPT_KEYS.PERFORMANCE_INSIGHTS_SYSTEM]: {
        envVar: "PROMPT_PERFORMANCE_INSIGHTS_SYSTEM",
        fileName: "performance-insights.system.txt",
    },
    [PROMPT_KEYS.PERFORMANCE_INSIGHTS_USER]: {
        envVar: "PROMPT_PERFORMANCE_INSIGHTS_USER",
        fileName: "performance-insights.user.txt",
    },
    [PROMPT_KEYS.PDF_QUESTION_GENERATION_TEMPLATE]: {
        envVar: "PROMPT_PDF_QUESTION_GENERATION_TEMPLATE",
        fileName: "pdf-question-generation.template.txt",
    },
    [PROMPT_KEYS.QUIZ_REGENERATE_QUESTION_TEMPLATE]: {
        envVar: "PROMPT_QUIZ_REGENERATE_QUESTION_TEMPLATE",
        fileName: "quiz-regenerate-question.template.txt",
    },
    [PROMPT_KEYS.QUIZ_GENERATE_NEW_QUESTION_TEMPLATE]: {
        envVar: "PROMPT_QUIZ_GENERATE_NEW_QUESTION_TEMPLATE",
        fileName: "quiz-generate-new-question.template.txt",
    },
})

const promptCache = new Map()

const normalizePromptValue = (
    value,
    { decodeEscapedNewlines = false } = {}
) => {
    let raw = String(value || "")

    if (decodeEscapedNewlines) {
        raw = raw.replace(/\\n/g, "\n")
    }

    raw = raw.replace(/\r\n/g, "\n")

    return raw.trim()
}

const resolvePromptsDir = () => {
    const configuredDir = String(process.env.PROMPTS_DIR || "").trim()

    if (!configuredDir) {
        return DEFAULT_PROMPTS_DIR
    }

    if (path.isAbsolute(configuredDir)) {
        return configuredDir
    }

    return path.resolve(API_ROOT_DIR, configuredDir)
}

const readPromptFromFile = (filePath) => {
    try {
        const raw = fs.readFileSync(filePath, "utf8")
        const normalized = normalizePromptValue(raw)
        return normalized || null
    } catch (error) {
        if (error?.code === "ENOENT") {
            return null
        }

        throw error
    }
}

const buildMissingPromptError = ({ promptKey, envVar, filePath }) => {
    return new Error(
        [
            `Missing prompt for key \"${promptKey}\".`,
            `Set secret env var \"${envVar}\" in Render, or create local file: ${filePath}`,
            "Tip: PROMPTS_DIR can override the local prompt folder path.",
        ].join(" ")
    )
}

export const getPrompt = (promptKey) => {
    const definition = PROMPT_DEFINITIONS[promptKey]

    if (!definition) {
        throw new Error(`Unknown prompt key: ${promptKey}`)
    }

    const promptsDir = resolvePromptsDir()
    const cacheKey = `${promptKey}:${promptsDir}`

    if (promptCache.has(cacheKey)) {
        return promptCache.get(cacheKey)
    }

    const envValue = normalizePromptValue(process.env[definition.envVar], {
        decodeEscapedNewlines: true,
    })
    if (envValue) {
        promptCache.set(cacheKey, envValue)
        return envValue
    }

    const filePath = path.join(promptsDir, definition.fileName)
    const fileValue = readPromptFromFile(filePath)

    if (fileValue) {
        promptCache.set(cacheKey, fileValue)
        return fileValue
    }

    throw buildMissingPromptError({
        promptKey,
        envVar: definition.envVar,
        filePath,
    })
}

export const renderPromptTemplate = (template, variables = {}) => {
    return String(template || "").replace(
        /\{\{([a-zA-Z0-9_]+)\}\}/g,
        (fullMatch, key) => {
            if (!Object.prototype.hasOwnProperty.call(variables, key)) {
                throw new Error(
                    `Missing prompt template variable \"${key}\" while rendering template.`
                )
            }

            const value = variables[key]
            return value === null || typeof value === "undefined"
                ? ""
                : String(value)
        }
    )
}

export const listPromptBindings = () => {
    return Object.entries(PROMPT_DEFINITIONS).map(([key, value]) => ({
        key,
        envVar: value.envVar,
        fileName: value.fileName,
    }))
}
