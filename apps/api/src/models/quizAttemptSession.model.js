import { Schema, model } from "mongoose"

const quizAttemptSessionSchema = new Schema(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        quiz: {
            type: Schema.Types.ObjectId,
            ref: "Quiz",
            required: true,
            index: true,
        },
        class: {
            type: Schema.Types.ObjectId,
            ref: "Class",
            required: true,
            index: true,
        },
        startedAt: {
            type: Date,
            required: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        submittedAt: {
            type: Date,
        },
        status: {
            type: String,
            enum: ["active", "submitted", "expired"],
            default: "active",
            index: true,
        },
    },
    {
        timestamps: true,
    }
)

quizAttemptSessionSchema.index({ student: 1, quiz: 1 }, { unique: true })
quizAttemptSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const QuizAttemptSession = model(
    "QuizAttemptSession",
    quizAttemptSessionSchema
)
