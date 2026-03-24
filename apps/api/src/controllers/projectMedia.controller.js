import { asyncHandler, ApiError, ApiResponse } from "../utils/index.js"
import { Readable } from "node:stream"
import { ProjectMedia } from "../models/projectMedia.model.js"
import {
    uploadMediaBufferOnCloudinary,
    deleteMediaFromCloudinary,
} from "../utils/cloudinary.js"
import { CLOUDINARY_SHOWCASE_FOLDER } from "../constants.js"

const ensureSuperAdmin = (req) => {
    if (req.user?.role !== "superadmin") {
        throw new ApiError(403, "Only superadmins can access this resource")
    }
}

const ensureAdminOrSuperAdmin = (req) => {
    if (!["admin", "superadmin"].includes(req.user?.role)) {
        throw new ApiError(403, "Only admins can access this resource")
    }
}

const ensureMediaPermission = (req, permission) => {
    if (req.user?.role === "superadmin") return

    const permissions = req.user?.mediaPermissions || {
        canView: true,
        canDownload: false,
    }

    if (permission === "view" && !permissions.canView) {
        throw new ApiError(403, "You are not allowed to view media")
    }

    if (permission === "download" && !permissions.canDownload) {
        throw new ApiError(403, "You are not allowed to download media")
    }
}

const sanitizeFileName = (value) => {
    const safe = String(value || "project-media")
        .trim()
        .replace(/[^a-zA-Z0-9-_ ]+/g, "")
        .replace(/\s+/g, "-")
    return safe || "project-media"
}

const extensionFromContentType = (contentType, mediaType) => {
    const type = String(contentType || "").toLowerCase()
    if (type.includes("image/png")) return "png"
    if (type.includes("image/webp")) return "webp"
    if (type.includes("image/gif")) return "gif"
    if (type.includes("image/jpeg") || type.includes("image/jpg")) return "jpg"
    if (type.includes("video/webm")) return "webm"
    if (type.includes("video/mp4")) return "mp4"
    return mediaType === "video" ? "mp4" : "jpg"
}

const uploadProjectMedia = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const { title, description = "", order = 0, isPublished = true } = req.body

    if (!title || !String(title).trim()) {
        throw new ApiError(400, "Title is required")
    }

    if (!req.file?.buffer) {
        throw new ApiError(400, "Media file is required")
    }

    const mediaType = String(req.file?.mimetype || "").startsWith("video/")
        ? "video"
        : "image"

    const uploadResponse = await uploadMediaBufferOnCloudinary({
        fileBuffer: req.file.buffer,
        folder: CLOUDINARY_SHOWCASE_FOLDER,
        resourceType: "auto",
    })

    if (!uploadResponse?.secure_url || !uploadResponse?.public_id) {
        throw new ApiError(502, "Failed to upload media to Cloudinary")
    }

    const created = await ProjectMedia.create({
        title: String(title).trim(),
        description: String(description || "").trim(),
        mediaType,
        mediaUrl: uploadResponse.secure_url,
        publicId: uploadResponse.public_id,
        thumbnailUrl: uploadResponse?.secure_url || "",
        order: Number(order) || 0,
        isPublished:
            String(isPublished) === "false" ? false : Boolean(isPublished),
        uploadedBy: req.user._id,
    })

    return res
        .status(201)
        .json(
            new ApiResponse(201, created, "Project media uploaded successfully")
        )
})

const getPublicProjectMedia = asyncHandler(async (_req, res) => {
    const media = await ProjectMedia.find({ isPublished: true })
        .select(
            "title description mediaType mediaUrl thumbnailUrl order createdAt"
        )
        .sort({ order: 1, createdAt: -1 })

    return res
        .status(200)
        .json(new ApiResponse(200, media, "Public project media retrieved"))
})

const getAdminAllowedProjectMedia = asyncHandler(async (req, res) => {
    ensureAdminOrSuperAdmin(req)
    ensureMediaPermission(req, "view")

    const filter = req.user?.role === "superadmin" ? {} : { isPublished: true }

    const media = await ProjectMedia.find(filter)
        .select(
            "title description mediaType mediaUrl thumbnailUrl order isPublished createdAt"
        )
        .sort({ order: 1, createdAt: -1 })

    return res
        .status(200)
        .json(new ApiResponse(200, media, "Project media retrieved"))
})

const getAdminMediaDownloadLink = asyncHandler(async (req, res) => {
    ensureAdminOrSuperAdmin(req)
    ensureMediaPermission(req, "download")

    const { id } = req.params
    const media = await ProjectMedia.findById(id).select(
        "title mediaType mediaUrl isPublished"
    )

    if (!media) {
        throw new ApiError(404, "Project media not found")
    }

    if (req.user?.role !== "superadmin" && !media.isPublished) {
        throw new ApiError(403, "You are not allowed to access this media")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                id: media._id,
                title: media.title,
                mediaType: media.mediaType,
                downloadUrl: media.mediaUrl,
            },
            "Download link generated"
        )
    )
})

const downloadAdminProjectMedia = asyncHandler(async (req, res) => {
    ensureAdminOrSuperAdmin(req)
    ensureMediaPermission(req, "download")

    const { id } = req.params
    const media = await ProjectMedia.findById(id).select(
        "title mediaType mediaUrl isPublished"
    )

    if (!media) {
        throw new ApiError(404, "Project media not found")
    }

    if (req.user?.role !== "superadmin" && !media.isPublished) {
        throw new ApiError(403, "You are not allowed to access this media")
    }

    const upstream = await fetch(media.mediaUrl)
    if (!upstream.ok) {
        throw new ApiError(502, "Failed to fetch media from storage")
    }

    if (!upstream.body) {
        throw new ApiError(502, "Media stream is unavailable")
    }

    const contentType =
        upstream.headers.get("content-type") ||
        (media.mediaType === "video" ? "video/mp4" : "image/jpeg")
    const fileExt = extensionFromContentType(contentType, media.mediaType)
    const fileName = `${sanitizeFileName(media.title)}.${fileExt}`

    res.setHeader("Content-Type", contentType)
    const contentLength = upstream.headers.get("content-length")
    if (contentLength) {
        res.setHeader("Content-Length", contentLength)
    }
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)

    const stream = Readable.fromWeb(upstream.body)
    stream.on("error", () => {
        if (!res.headersSent) {
            res.status(502).end("Failed to stream media")
        } else {
            res.end()
        }
    })

    return stream.pipe(res)
})

const getAdminProjectMedia = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const media = await ProjectMedia.find({})
        .sort({ order: 1, createdAt: -1 })
        .populate("uploadedBy", "name email adminId superAdminId")

    return res
        .status(200)
        .json(new ApiResponse(200, media, "Project media retrieved"))
})

const updateProjectMedia = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const { id } = req.params
    const media = await ProjectMedia.findById(id)

    if (!media) {
        throw new ApiError(404, "Project media not found")
    }

    const { title, description, order, isPublished } = req.body

    if (typeof title !== "undefined") {
        const normalizedTitle = String(title).trim()
        if (!normalizedTitle) {
            throw new ApiError(400, "Title cannot be empty")
        }
        media.title = normalizedTitle
    }

    if (typeof description !== "undefined") {
        media.description = String(description || "").trim()
    }

    if (typeof order !== "undefined") {
        media.order = Number(order) || 0
    }

    if (typeof isPublished !== "undefined") {
        media.isPublished =
            String(isPublished) === "false" ? false : Boolean(isPublished)
    }

    // Optional file replacement
    if (req.file?.buffer) {
        const nextMediaType = String(req.file?.mimetype || "").startsWith(
            "video/"
        )
            ? "video"
            : "image"

        const uploadResponse = await uploadMediaBufferOnCloudinary({
            fileBuffer: req.file.buffer,
            folder: CLOUDINARY_SHOWCASE_FOLDER,
            resourceType: "auto",
        })

        if (!uploadResponse?.secure_url || !uploadResponse?.public_id) {
            throw new ApiError(502, "Failed to upload replacement media")
        }

        const previousPublicId = media.publicId
        const previousResourceType =
            media.mediaType === "video" ? "video" : "image"

        media.mediaType = nextMediaType
        media.mediaUrl = uploadResponse.secure_url
        media.publicId = uploadResponse.public_id
        media.thumbnailUrl = uploadResponse?.secure_url || ""

        await deleteMediaFromCloudinary({
            publicId: previousPublicId,
            resourceType: previousResourceType,
        })
    }

    await media.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, media, "Project media updated successfully"))
})

const unpublishProjectMedia = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const { id } = req.params
    const media = await ProjectMedia.findById(id)

    if (!media) {
        throw new ApiError(404, "Project media not found")
    }

    media.isPublished = false
    await media.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                media,
                "Project media unpublished successfully"
            )
        )
})

const publishProjectMedia = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const { id } = req.params
    const media = await ProjectMedia.findById(id)

    if (!media) {
        throw new ApiError(404, "Project media not found")
    }

    media.isPublished = true
    await media.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, media, "Project media published successfully")
        )
})

const deleteProjectMedia = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const { id } = req.params
    const media = await ProjectMedia.findById(id)

    if (!media) {
        throw new ApiError(404, "Project media not found")
    }

    await deleteMediaFromCloudinary({
        publicId: media.publicId,
        resourceType: media.mediaType === "video" ? "video" : "image",
    })

    await ProjectMedia.findByIdAndDelete(id)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Project media deleted successfully"))
})

export {
    uploadProjectMedia,
    getPublicProjectMedia,
    getAdminAllowedProjectMedia,
    getAdminMediaDownloadLink,
    downloadAdminProjectMedia,
    getAdminProjectMedia,
    updateProjectMedia,
    unpublishProjectMedia,
    publishProjectMedia,
    deleteProjectMedia,
}
