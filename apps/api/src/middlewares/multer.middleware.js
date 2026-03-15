import multer from "multer"
import { ApiError } from "../utils/ApiError.js"

const storage = multer.memoryStorage()

const createUploader = ({ allowedTypes, maxFileSize, errorMessage }) => {
    return multer({
        storage,
        fileFilter: (req, file, cb) => {
            if (!allowedTypes.includes(file.mimetype)) {
                return cb(new ApiError(400, errorMessage), false)
            }
            cb(null, true)
        },
        limits: {
            fileSize: maxFileSize,
        },
    })
}

const uploadPdf = createUploader({
    allowedTypes: ["application/pdf"],
    maxFileSize: 10 * 1024 * 1024,
    errorMessage: "Invalid file type. Only PDF files are allowed.",
})

const uploadImage = createUploader({
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    maxFileSize: 5 * 1024 * 1024,
    errorMessage:
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
})

// Backward compatibility for existing imports
const upload = uploadPdf

export { upload, uploadPdf, uploadImage }
