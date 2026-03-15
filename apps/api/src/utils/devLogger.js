const isDevEnvironment = () => {
    return String(process.env.NODE_ENV || "development") !== "production"
}

const isDevLoggingEnabled = () => {
    return String(process.env.ENABLE_DEV_PIPELINE_LOGS || "true") !== "false"
}

const formatTimestamp = () => new Date().toISOString()

const safeSerialize = (value) => {
    if (typeof value === "undefined") return ""

    try {
        return JSON.stringify(value)
    } catch {
        return "[unserializable-meta]"
    }
}

export const createDevLogger = (scope = "app") => {
    const shouldLog = isDevEnvironment() && isDevLoggingEnabled()

    const write = (level, message, meta) => {
        if (!shouldLog) return

        const metaString = safeSerialize(meta)
        const line = `[DEV][PIPELINE][${scope}][${level}][${formatTimestamp()}] ${message}${metaString ? ` ${metaString}` : ""}`

        if (level === "error") {
            console.error(line)
            return
        }

        if (level === "warn") {
            console.warn(line)
            return
        }

        console.log(line)
    }

    return {
        enabled: shouldLog,
        info: (message, meta) => write("info", message, meta),
        warn: (message, meta) => write("warn", message, meta),
        error: (message, meta) => write("error", message, meta),
    }
}
