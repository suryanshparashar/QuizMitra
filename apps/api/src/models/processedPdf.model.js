import mongoose, { Schema } from "mongoose"

if (mongoose.models.ProcessedPdf) {
    delete mongoose.models.ProcessedPdf
}

const processedPdfSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
            index: true,
        },
        fileName: {
            type: String,
            required: [true, "File name is required"],
            trim: true,
            maxlength: [300, "File name cannot exceed 300 characters"],
        },
        materialName: {
            type: String,
            trim: true,
            maxlength: [300, "Material name cannot exceed 300 characters"],
            default: "",
        },
        isMaterial: {
            type: Boolean,
            default: false,
            index: true,
        },
        classId: {
            type: Schema.Types.ObjectId,
            ref: "Class",
            default: null,
            index: true,
        },
        mimeType: {
            type: String,
            required: [true, "MIME type is required"],
            trim: true,
        },
        fileSize: {
            type: Number,
            required: [true, "File size is required"],
            min: [1, "File size must be greater than 0"],
        },
        status: {
            type: String,
            enum: ["processing", "completed", "failed"],
            default: "processing",
            index: true,
        },
        progress: {
            type: Number,
            min: [0, "Progress cannot be less than 0"],
            max: [100, "Progress cannot exceed 100"],
            default: 0,
        },
        extractedContent: {
            type: String,
            default: "",
        },
        vectorDimensions: {
            type: Number,
            default: 0,
            min: [0, "Vector dimensions cannot be negative"],
        },
        contentVectors: [
            {
                chunkIndex: {
                    type: Number,
                    required: true,
                },
                chunkText: {
                    type: String,
                    required: true,
                },
                vector: {
                    type: [Number],
                    default: [],
                },
            },
        ],
        errorMessage: {
            type: String,
            trim: true,
            default: "",
        },
        expiresAt: {
            type: Date,
            default: function () {
                return this.isMaterial
                    ? null
                    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            },
            index: { expires: 0 },
        },
    },
    {
        timestamps: true,
    }
)

export const ProcessedPdf = mongoose.model("ProcessedPdf", processedPdfSchema)
