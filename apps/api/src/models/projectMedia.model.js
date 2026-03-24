import mongoose, { Schema } from "mongoose"

const projectMediaSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        mediaType: {
            type: String,
            enum: ["image", "video"],
            required: true,
        },
        mediaUrl: {
            type: String,
            required: true,
            trim: true,
        },
        publicId: {
            type: String,
            required: true,
            trim: true,
        },
        thumbnailUrl: {
            type: String,
            trim: true,
            default: "",
        },
        order: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
    },
    { timestamps: true }
)

projectMediaSchema.index({ isPublished: 1, order: 1, createdAt: -1 })

export const ProjectMedia = mongoose.model("ProjectMedia", projectMediaSchema)
