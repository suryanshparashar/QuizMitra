import AdmZip from "adm-zip"
import pdfParse from "pdf-parse"
import { ApiError } from "../utils/ApiError.js"
import {
    getDocumentIntelligenceModelName,
    getDocumentProcessorProvider,
    getSarvamDocumentApiBaseUrl,
    getSarvamDocumentLanguage,
    getSarvamDocumentOutputFormat,
    getSarvamDocumentPollIntervalMs,
    getSarvamDocumentTimeoutMs,
    isSarvamDocumentStrictMode,
    shouldUseSarvamVision,
} from "../utils/llmConfig.js"

const cleanExtractedText = (text) => {
    return String(text || "")
        .replace(/\n\s*\n/g, "\n")
        .replace(/\t/g, " ")
        .trim()
}

const formatErrorDetails = (payload) => {
    if (payload === null || typeof payload === "undefined") {
        return ""
    }

    if (typeof payload === "string") {
        return payload
    }

    try {
        return JSON.stringify(payload)
    } catch {
        return String(payload)
    }
}

const normalizeSarvamOutputFormat = (outputFormat) => {
    const normalized = String(outputFormat || "")
        .trim()
        .toLowerCase()

    if (normalized === "html") return "html"
    return "md"
}

const getSarvamHeaders = () => {
    const apiKey = process.env.SARVAM_AI_API_KEY
    if (!apiKey) {
        throw new ApiError(500, "SARVAM_AI_API_KEY is required")
    }

    return {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
    }
}

const getUploadUrlFromMap = (uploadUrls, fileName) => {
    const details = uploadUrls?.[fileName]

    if (!details) {
        return null
    }

    if (typeof details === "string") {
        return {
            url: details,
            method: "PUT",
            headers: {},
            fields: {},
        }
    }

    const uploadUrl =
        details.upload_url ||
        details.signed_url ||
        details.presigned_url ||
        details.file_url ||
        details.url ||
        null

    if (!uploadUrl) {
        return null
    }

    const method = String(
        details.method || details.http_method || details.upload_method || "PUT"
    )
        .trim()
        .toUpperCase()

    const headers =
        details.headers && typeof details.headers === "object"
            ? details.headers
            : {}

    const fields =
        (details.form_fields && typeof details.form_fields === "object"
            ? details.form_fields
            : null) ||
        (details.fields && typeof details.fields === "object"
            ? details.fields
            : {})

    return {
        url: uploadUrl,
        method,
        headers,
        fields,
    }
}

const getDownloadUrlFromMap = (downloadUrls, preferredExtension) => {
    const entries = Object.entries(downloadUrls || {})

    if (!entries.length) {
        return null
    }

    const preferred = entries.find(([name]) =>
        name.toLowerCase().endsWith(`.${preferredExtension}`)
    )

    const target = preferred || entries[0]
    const value = target[1]

    if (typeof value === "string") {
        return value
    }

    return value?.file_url || value?.url || value?.download_url || null
}

const extractTextFromJsonValue = (value) => {
    if (!value) return ""

    if (typeof value === "string") {
        return value
    }

    if (Array.isArray(value)) {
        return value.map((item) => extractTextFromJsonValue(item)).join("\n")
    }

    if (typeof value === "object") {
        const prioritizedKeys = [
            "markdown",
            "text",
            "content",
            "html",
            "document_text",
        ]

        for (const key of prioritizedKeys) {
            if (typeof value[key] !== "undefined") {
                return extractTextFromJsonValue(value[key])
            }
        }

        return Object.values(value)
            .map((item) => extractTextFromJsonValue(item))
            .filter(Boolean)
            .join("\n")
    }

    return String(value)
}

const extractFromZipBuffer = (buffer, preferredExtension) => {
    const zip = new AdmZip(buffer)
    const entries = zip
        .getEntries()
        .filter((entry) => !entry.isDirectory)
        .sort((a, b) => a.entryName.localeCompare(b.entryName))

    if (!entries.length) {
        throw new ApiError(502, "Sarvam output ZIP was empty")
    }

    const preferred = entries.find((entry) =>
        entry.entryName.toLowerCase().endsWith(`.${preferredExtension}`)
    )

    const firstTextLike =
        preferred ||
        entries.find((entry) =>
            /\.(json|md|txt|html?)$/i.test(entry.entryName)
        ) ||
        entries[0]

    const raw = firstTextLike.getData().toString("utf-8")

    if (firstTextLike.entryName.toLowerCase().endsWith(".json")) {
        try {
            const parsed = JSON.parse(raw)
            return extractTextFromJsonValue(parsed)
        } catch {
            return raw
        }
    }

    return raw
}

const uploadInputFileToSarvam = async (uploadTarget, pdfBuffer, fileName) => {
    const target =
        typeof uploadTarget === "string"
            ? { url: uploadTarget, method: "PUT", headers: {}, fields: {} }
            : uploadTarget

    if (!target?.url) {
        throw new ApiError(502, "Sarvam upload target URL is missing")
    }

    // If provider specifies a method/headers/fields, honor it first.
    if (
        target.method === "POST" &&
        Object.keys(target.fields || {}).length > 0
    ) {
        const formData = new FormData()
        Object.entries(target.fields).forEach(([key, value]) => {
            formData.append(key, String(value))
        })

        const fileBlob = new Blob([pdfBuffer], { type: "application/pdf" })
        formData.append("file", fileBlob, fileName || "document.pdf")

        const response = await fetch(target.url, {
            method: "POST",
            headers: target.headers || {},
            body: formData,
        })

        if (response.ok) {
            return
        }

        const responseBody = await response.text().catch(() => "")
        throw new ApiError(
            502,
            `Failed provider-directed POST upload (${response.status})${
                responseBody ? ` body:${responseBody.slice(0, 300)}` : ""
            }`
        )
    }

    if (target.method === "PUT") {
        const putWithProviderHeaders = await fetch(target.url, {
            method: "PUT",
            headers: {
                ...(target.headers || {}),
                "Content-Type":
                    target.headers?.["Content-Type"] || "application/pdf",
            },
            body: pdfBuffer,
        })

        if (putWithProviderHeaders.ok) {
            return
        }
    }

    const uploadAttempts = [
        {
            label: "PUT(pdf+blob)",
            options: {
                method: "PUT",
                headers: {
                    "Content-Type": "application/pdf",
                    "x-ms-blob-type": "BlockBlob",
                },
                body: pdfBuffer,
            },
        },
        {
            label: "PUT(pdf)",
            options: {
                method: "PUT",
                headers: {
                    "Content-Type": "application/pdf",
                },
                body: pdfBuffer,
            },
        },
        {
            label: "PUT(octet-stream)",
            options: {
                method: "PUT",
                headers: {
                    "Content-Type": "application/octet-stream",
                },
                body: pdfBuffer,
            },
        },
        {
            label: "PUT(no-content-type)",
            options: {
                method: "PUT",
                body: pdfBuffer,
            },
        },
    ]

    const failures = []

    for (const attempt of uploadAttempts) {
        const response = await fetch(target.url, attempt.options)
        if (response.ok) {
            return
        }

        const bodyText = await response.text().catch(() => "")
        failures.push(
            `${attempt.label}=${response.status}${
                bodyText ? ` body:${bodyText.slice(0, 250)}` : ""
            }`
        )
    }

    throw new ApiError(
        502,
        `Failed to upload file to Sarvam storage (${failures.join(" | ")})`
    )
}

const pollSarvamJobCompletion = async (baseUrl, jobId) => {
    const pollIntervalMs = getSarvamDocumentPollIntervalMs()
    const timeoutMs = getSarvamDocumentTimeoutMs()
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
        const statusResponse = await fetch(
            `${baseUrl}/doc-digitization/job/v1/${jobId}/status`,
            {
                method: "GET",
                headers: getSarvamHeaders(),
            }
        )

        const statusData = await statusResponse.json().catch(() => null)

        if (!statusResponse.ok) {
            throw new ApiError(
                statusResponse.status,
                statusData?.message || "Failed to fetch Sarvam job status"
            )
        }

        const state = String(statusData?.job_state || "").toLowerCase()
        if (state === "completed" || state === "partiallycompleted") {
            return statusData
        }

        if (state === "failed") {
            throw new ApiError(
                502,
                statusData?.error_message || "Sarvam document job failed"
            )
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    throw new ApiError(504, "Sarvam document processing timed out")
}

export const extractPdfWithLocalParser = async (pdfBuffer) => {
    const data = await pdfParse(pdfBuffer)
    return cleanExtractedText(data.text)
}

export const extractPdfWithSarvamVision = async (
    pdfBuffer,
    fileName = "document.pdf"
) => {
    const baseUrl = getSarvamDocumentApiBaseUrl()
    const outputFormat = normalizeSarvamOutputFormat(
        getSarvamDocumentOutputFormat()
    )
    const language = getSarvamDocumentLanguage()
    const modelName = getDocumentIntelligenceModelName()

    console.log(
        `Document Intelligence requested via model '${modelName}' and language '${language}'`
    )

    const createJobResponse = await fetch(
        `${baseUrl}/doc-digitization/job/v1`,
        {
            method: "POST",
            headers: getSarvamHeaders(),
            body: JSON.stringify({
                job_parameters: {
                    model: modelName,
                    model_name: modelName,
                    language,
                    output_format: outputFormat,
                },
            }),
        }
    )

    const createJobData = await createJobResponse.json().catch(() => null)
    if (!createJobResponse.ok || !createJobData?.job_id) {
        const details =
            formatErrorDetails(createJobData?.message) ||
            formatErrorDetails(createJobData?.error) ||
            formatErrorDetails(createJobData?.error_message) ||
            formatErrorDetails(createJobData)
        throw new ApiError(
            createJobResponse.status || 502,
            `Failed to create Sarvam document job (status: ${createJobResponse.status || 502})${details ? `: ${details}` : ""}`
        )
    }

    const jobId = createJobData.job_id

    const uploadLinksResponse = await fetch(
        `${baseUrl}/doc-digitization/job/v1/upload-files`,
        {
            method: "POST",
            headers: getSarvamHeaders(),
            body: JSON.stringify({
                job_id: jobId,
                files: [fileName],
            }),
        }
    )

    const uploadLinksData = await uploadLinksResponse.json().catch(() => null)
    if (!uploadLinksResponse.ok) {
        throw new ApiError(
            uploadLinksResponse.status,
            uploadLinksData?.message || "Failed to get Sarvam upload URL"
        )
    }

    const uploadTarget = getUploadUrlFromMap(
        uploadLinksData?.upload_urls,
        fileName
    )
    if (!uploadTarget) {
        throw new ApiError(
            502,
            "Sarvam did not return a usable upload URL for document processing"
        )
    }

    await uploadInputFileToSarvam(uploadTarget, pdfBuffer, fileName)

    const startResponse = await fetch(
        `${baseUrl}/doc-digitization/job/v1/${jobId}/start`,
        {
            method: "POST",
            headers: getSarvamHeaders(),
            body: JSON.stringify({}),
        }
    )
    const startData = await startResponse.json().catch(() => null)
    if (!startResponse.ok) {
        throw new ApiError(
            startResponse.status,
            startData?.message || "Failed to start Sarvam document job"
        )
    }

    await pollSarvamJobCompletion(baseUrl, jobId)

    const downloadResponse = await fetch(
        `${baseUrl}/doc-digitization/job/v1/${jobId}/download-files`,
        {
            method: "POST",
            headers: getSarvamHeaders(),
            body: JSON.stringify({}),
        }
    )
    const downloadData = await downloadResponse.json().catch(() => null)

    if (!downloadResponse.ok) {
        throw new ApiError(
            downloadResponse.status,
            downloadData?.message || "Failed to get Sarvam download URL"
        )
    }

    const downloadUrl = getDownloadUrlFromMap(
        downloadData?.download_urls,
        outputFormat
    )

    if (!downloadUrl) {
        throw new ApiError(
            502,
            "Sarvam did not return a usable output URL for document processing"
        )
    }

    const outputResponse = await fetch(downloadUrl)
    if (!outputResponse.ok) {
        throw new ApiError(
            outputResponse.status,
            "Failed to download Sarvam document output"
        )
    }

    const outputBuffer = Buffer.from(await outputResponse.arrayBuffer())
    const contentType = outputResponse.headers.get("content-type") || ""

    const extracted =
        contentType.includes("zip") || /\.zip(\?|$)/i.test(downloadUrl)
            ? extractFromZipBuffer(outputBuffer, outputFormat)
            : (() => {
                  const text = outputBuffer.toString("utf-8")
                  if (outputFormat === "json") {
                      try {
                          return extractTextFromJsonValue(JSON.parse(text))
                      } catch {
                          return text
                      }
                  }
                  return text
              })()

    return cleanExtractedText(extracted)
}

export const extractSourceContent = async (input) => {
    if (input.type === "topic") {
        return cleanExtractedText(
            `The user wants a quiz about: ${input.data}. Generate questions based on general knowledge about this topic.`
        )
    }

    if (input.type === "preprocessed-pdf") {
        return cleanExtractedText(input.data)
    }

    if (input.type !== "pdf") {
        throw new ApiError(400, `Unsupported input type '${input.type}'`)
    }

    if (!Buffer.isBuffer(input.data)) {
        throw new ApiError(400, "PDF input data must be a Buffer")
    }

    if (!shouldUseSarvamVision()) {
        return extractPdfWithLocalParser(input.data)
    }

    try {
        return await extractPdfWithSarvamVision(input.data, input.originalName)
    } catch (error) {
        if (isSarvamDocumentStrictMode()) {
            throw error
        }

        console.error(
            "Sarvam document processing failed; falling back to local pdf-parse:",
            error.message
        )

        const fallbackText = await extractPdfWithLocalParser(input.data)
        if (!fallbackText.trim()) {
            throw new ApiError(
                422,
                `Sarvam processing failed (${error.message}) and local parser found no extractable text`
            )
        }

        return fallbackText
    }
}

export const getDocumentProcessorDebugInfo = () => {
    return {
        provider: getDocumentProcessorProvider(),
        model: shouldUseSarvamVision()
            ? getDocumentIntelligenceModelName()
            : "local-pdf-parse",
    }
}
