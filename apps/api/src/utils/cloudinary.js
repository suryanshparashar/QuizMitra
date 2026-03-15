import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
import dotenv from "dotenv"
import { CLOUDINARY_DP_FOLDER } from "../constants.js"
import { ApiError } from "./ApiError.js"

dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
})

const uploadOnCloudinary = async (fileBuffer, originalname) => {
    if (!fileBuffer) return null

    const extension = String(originalname || "")
        .split(".")
        .pop()
        ?.toLowerCase()
    const mimeMap = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
    }
    const mimeType = mimeMap[extension] || "image/jpeg"

    const hasConfig =
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET

    if (!hasConfig) {
        throw new ApiError(
            500,
            "Cloudinary credentials are not fully configured"
        )
    }

    try {
        const base64 = fileBuffer.toString("base64")
        const dataURI = `data:${mimeType};base64,${base64}`

        const response = await cloudinary.uploader.upload(dataURI, {
            folder: CLOUDINARY_DP_FOLDER,
            resource_type: "image",
        })

        return response
    } catch (error) {
        console.error("Cloudinary buffer upload error:", {
            message: error?.message,
            http_code: error?.http_code,
            name: error?.name,
        })

        if (error?.http_code === 403) {
            throw new ApiError(
                502,
                "Cloudinary denied upload (403). Verify API key type/permissions and product environment credentials."
            )
        }

        throw new ApiError(
            502,
            error?.message || "Cloudinary upload failed unexpectedly"
        )
    }
}

// const uploadOnCloudinary = async (localFilePath) => {
//     try {
//         console.log("Starting image upload to Cloudinary...", localFilePath)

//         if (!localFilePath) return null

//         console.log("Uploading image to Cloudinary...")
//         console.log("Local file path:", localFilePath)

//         const response = await cloudinary.uploader.upload(localFilePath, {
//             folder: CLOUDINARY_DP_FOLDER,
//             resource_type: "image",
//         })

//         console.log("Image uploaded successfully!")
//         console.log(response)

//         if (fs.existsSync(localFilePath)) {
//             console.log("Deleting local file after upload...")
//             fs.unlinkSync(localFilePath)
//         }

//         return response
//     } catch (error) {
//         console.error(error)

//         if (fs.existsSync(localFilePath)) {
//             console.log("Error occurred, deleting local file...")
//             fs.unlinkSync(localFilePath)
//         }

//         return null
//     }
// }

const deleteLocalFile = (localFilePath) => {
    console.log("Deleting local file:", localFilePath)
    fs.unlinkSync(localFilePath)
}

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image", // PDFs are treated as images by Cloudinary unless 'raw' is specified, but let's check upload type
        })

        return response
    } catch (error) {
        console.error("Cloudinary delete error:", error)
        return null
    }
}

export { uploadOnCloudinary, deleteLocalFile, deleteFromCloudinary }
