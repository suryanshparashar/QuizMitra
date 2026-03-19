const TOKEN_REGEX = /[a-z0-9_]+/gi

const tokenize = (text) => {
    return (
        String(text || "")
            .toLowerCase()
            .match(TOKEN_REGEX) || []
    )
}

const l2Normalize = (vector) => {
    const norm = Math.sqrt(
        vector.reduce((sum, value) => sum + value * value, 0)
    )
    if (!norm) return vector
    return vector.map((value) => Number((value / norm).toFixed(8)))
}

const hashToken = (token, dimensions) => {
    let hash = 0
    for (let i = 0; i < token.length; i += 1) {
        hash = (hash * 31 + token.charCodeAt(i)) >>> 0
    }
    return hash % dimensions
}

const textToVector = (text, dimensions = 256) => {
    const vector = Array.from({ length: dimensions }, () => 0)
    const tokens = tokenize(text)

    for (const token of tokens) {
        const index = hashToken(token, dimensions)
        vector[index] += 1
    }

    return l2Normalize(vector)
}

const chunkText = (text, chunkSize = 1400, overlap = 200) => {
    const source = String(text || "").trim()
    if (!source) return []

    const chunks = []
    let start = 0

    while (start < source.length) {
        const end = Math.min(start + chunkSize, source.length)
        const chunkTextValue = source.slice(start, end).trim()

        if (chunkTextValue) {
            chunks.push(chunkTextValue)
        }

        if (end >= source.length) break
        start = Math.max(end - overlap, start + 1)
    }

    return chunks
}

export const createContentVectors = (
    content,
    { dimensions = 256, chunkSize = 1400, overlap = 200, maxChunks = 250 } = {}
) => {
    const chunks = chunkText(content, chunkSize, overlap).slice(0, maxChunks)

    return {
        dimensions,
        vectors: chunks.map((chunk, index) => ({
            chunkIndex: index,
            chunkText: chunk,
            vector: textToVector(chunk, dimensions),
        })),
    }
}

export const joinVectorChunks = (contentVectors = []) => {
    return (Array.isArray(contentVectors) ? contentVectors : [])
        .sort((a, b) => Number(a.chunkIndex || 0) - Number(b.chunkIndex || 0))
        .map((entry) => String(entry.chunkText || "").trim())
        .filter(Boolean)
        .join("\n\n")
}
