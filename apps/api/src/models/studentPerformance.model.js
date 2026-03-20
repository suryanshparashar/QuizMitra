import mongoose, { Schema } from "mongoose"

const performanceInsightsSchema = new Schema(
    {
        strongAreas: {
            type: [String],
            default: [],
        },
        weakAreas: {
            type: [String],
            default: [],
        },
        improvementRoadmap: {
            type: [String],
            default: [],
        },
        practiceGuide: {
            type: [String],
            default: [],
        },
        summary: {
            type: String,
            trim: true,
            default: "",
        },
        generatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
)

const studentPerformanceSchema = new Schema(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        class: {
            type: Schema.Types.ObjectId,
            ref: "Class",
            required: true,
            index: true,
        },
        latestInsights: {
            type: performanceInsightsSchema,
            default: () => ({}),
        },
        history: [
            {
                attempt: {
                    type: Schema.Types.ObjectId,
                    ref: "QuizAttempt",
                    required: true,
                },
                quiz: {
                    type: Schema.Types.ObjectId,
                    ref: "Quiz",
                    required: true,
                },
                score: {
                    type: Number,
                    default: 0,
                },
                maxMarks: {
                    type: Number,
                    default: 0,
                },
                percentage: {
                    type: Number,
                    default: 0,
                },
                insightsSnapshot: {
                    type: performanceInsightsSchema,
                    default: () => ({}),
                },
                generatedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        stats: {
            attemptsCount: {
                type: Number,
                default: 0,
            },
            averagePercentage: {
                type: Number,
                default: 0,
            },
            bestPercentage: {
                type: Number,
                default: 0,
            },
            lastPercentage: {
                type: Number,
                default: 0,
            },
        },
    },
    {
        timestamps: true,
    }
)

studentPerformanceSchema.index({ student: 1, class: 1 }, { unique: true })

export const StudentPerformance =
    mongoose.models.StudentPerformance ||
    mongoose.model("StudentPerformance", studentPerformanceSchema)
