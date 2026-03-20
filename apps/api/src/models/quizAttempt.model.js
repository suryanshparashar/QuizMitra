// models/QuizAttempt.model.js
import mongoose, { Schema } from "mongoose"

const quizAttemptSchema = new Schema(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Student is required"],
            index: true,
        },

        quiz: {
            type: Schema.Types.ObjectId,
            ref: "Quiz",
            required: [true, "Quiz is required"],
            index: true,
        },

        class: {
            type: Schema.Types.ObjectId,
            ref: "Class",
            required: [true, "Class is required"],
            index: true,
        },

        // Timing
        startedAt: {
            type: Date,
            required: [true, "Start time is required"],
            index: true,
        },

        submittedAt: {
            type: Date,
            required: [true, "Submission time is required"],
            index: true,
        },

        timeSpent: {
            type: Number,
            required: [true, "Time spent is required"],
            min: [0, "Time spent cannot be negative"],
        },

        // Answers array
        answers: [
            {
                questionIndex: {
                    type: Number,
                    required: true,
                },
                questionText: {
                    type: String,
                    required: true,
                },
                selectedAnswer: {
                    type: String,
                    required: true,
                },
                correctAnswer: {
                    type: String,
                    required: true,
                },
                isCorrect: {
                    type: Boolean,
                    required: true,
                },
                marksAwarded: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                correctnessScore: {
                    type: Number,
                    min: 0,
                    max: 1,
                    default: 0,
                },
                maxMarks: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                timeSpent: {
                    type: Number,
                    default: 0,
                    min: 0,
                },
                manuallyGraded: {
                    type: Boolean,
                    default: false,
                },
                checkedByAgent: {
                    type: String,
                    enum: ["objective", "subjective", "unknown"],
                    default: "unknown",
                },
                gradingNotes: {
                    type: String,
                    trim: true,
                    maxlength: [
                        300,
                        "Grading notes cannot exceed 300 characters",
                    ],
                },
            },
        ],

        // Scoring
        totalQuestions: {
            type: Number,
            required: [true, "Total questions is required"],
            min: [1, "Must have at least 1 question"],
        },

        correctAnswers: {
            type: Number,
            required: [true, "Correct answers count is required"],
            min: [0, "Correct answers cannot be negative"],
        },

        incorrectAnswers: {
            type: Number,
            required: [true, "Incorrect answers count is required"],
            min: [0, "Incorrect answers cannot be negative"],
        },

        marksObtained: {
            type: Number,
            required: [true, "Marks obtained is required"],
            min: [0, "Marks cannot be negative"],
        },

        maxMarks: {
            type: Number,
            required: [true, "Maximum marks is required"],
            min: [1, "Maximum marks must be at least 1"],
        },

        percentage: {
            type: Number,
            required: [true, "Percentage is required"],
            min: [0, "Percentage cannot be negative"],
            max: [100, "Percentage cannot exceed 100"],
        },

        // AI preparation review summary
        advisory: {
            strengths: {
                type: [String],
                default: [],
            },
            weaknesses: {
                type: [String],
                default: [],
            },
            recommendations: {
                type: [String],
                default: [],
            },
            motivationalMessage: {
                type: String,
                trim: true,
                default: "",
            },
        },

        // Status fields
        status: {
            type: String,
            enum: {
                values: ["submitted", "graded", "disputed", "reviewed"],
                message: "{VALUE} is not a valid status",
            },
            default: "submitted",
            index: true,
        },

        isLateSubmission: {
            type: Boolean,
            default: false,
            index: true,
        },

        wasTimeExceeded: {
            type: Boolean,
            default: false,
        },

        isDebarred: {
            type: Boolean,
            default: false,
            index: true,
        },

        debarReason: {
            type: String,
            trim: true,
            maxlength: [500, "Debar reason cannot exceed 500 characters"],
        },

        debarredAt: {
            type: Date,
        },

        // Dispute handling
        isDisputed: {
            type: Boolean,
            default: false,
            index: true,
        },

        disputeReason: {
            type: String,
            trim: true,
            maxlength: [500, "Dispute reason cannot exceed 500 characters"],
        },

        disputeSubmittedAt: {
            type: Date,
        },

        // Faculty feedback
        facultyFeedback: [
            {
                faculty: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                feedback: {
                    type: String,
                    trim: true,
                    maxlength: [1000, "Feedback cannot exceed 1000 characters"],
                },
                marksAdjustment: {
                    type: Number,
                    default: 0,
                },
                adjustmentReason: {
                    type: String,
                    trim: true,
                    maxlength: [200, "Reason cannot exceed 200 characters"],
                },
                adjustedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // Grading history
        gradingHistory: [
            {
                gradedBy: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                action: {
                    type: String,
                    enum: [
                        "auto_grade",
                        "manual_grade",
                        "bulk_update",
                        "dispute_resolution",
                    ],
                    required: true,
                },
                previousMarks: {
                    type: Number,
                    required: true,
                },
                newMarks: {
                    type: Number,
                    required: true,
                },
                previousPercentage: {
                    type: Number,
                    required: true,
                },
                newPercentage: {
                    type: Number,
                    required: true,
                },
                reason: {
                    type: String,
                    trim: true,
                    maxlength: [200, "Reason cannot exceed 200 characters"],
                },
                gradedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // Metadata
        ipAddress: {
            type: String,
            trim: true,
        },

        userAgent: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
)

// ✅ Indexes for performance
quizAttemptSchema.index({ student: 1, quiz: 1 }, { unique: true })
quizAttemptSchema.index({ quiz: 1, submittedAt: -1 })
quizAttemptSchema.index({ student: 1, createdAt: -1 })
quizAttemptSchema.index({ class: 1, submittedAt: -1 })

// ✅ Virtual fields (no conflicts with schema fields)
quizAttemptSchema.virtual("timeTaken").get(function () {
    return Math.floor((this.submittedAt - this.startedAt) / 1000)
})

quizAttemptSchema.virtual("accuracy").get(function () {
    return this.totalQuestions > 0
        ? ((this.correctAnswers / this.totalQuestions) * 100).toFixed(2)
        : 0
})

// ✅ Instance methods (using different names than schema fields)
quizAttemptSchema.methods.calculateGrade = function () {
    if (this.isDebarred) return "N"
    if (this.percentage >= 91) return "S"
    if (this.percentage >= 81) return "A"
    if (this.percentage >= 71) return "B"
    if (this.percentage >= 61) return "C"
    if (this.percentage >= 51) return "D"
    if (this.percentage >= 41) return "E"
    return "F"
}

quizAttemptSchema.methods.checkIfPassed = function (passingScore = 41) {
    if (this.isDebarred) return false
    return this.percentage >= passingScore
}

quizAttemptSchema.methods.getDetailedSummary = function () {
    return {
        _id: this._id,
        score: {
            marksObtained: this.marksObtained,
            maxMarks: this.maxMarks,
            percentage: this.percentage,
            grade: this.calculateGrade(),
            isPassed: this.checkIfPassed(),
        },
        performance: {
            correctAnswers: this.correctAnswers,
            incorrectAnswers: this.incorrectAnswers,
            totalQuestions: this.totalQuestions,
            accuracy: this.accuracy,
        },
        timing: {
            timeSpent: this.timeSpent,
            submittedAt: this.submittedAt,
            isLateSubmission: this.isLateSubmission,
            wasTimeExceeded: this.wasTimeExceeded,
        },
        advisory: this.advisory,
        status: this.status,
        isDisputed: this.isDisputed,
        isDebarred: this.isDebarred,
        debarReason: this.debarReason,
        debarredAt: this.debarredAt,
    }
}

quizAttemptSchema.methods.addFacultyFeedback = function (
    facultyId,
    feedback,
    marksAdjustment = 0,
    reason = ""
) {
    this.facultyFeedback.push({
        faculty: facultyId,
        feedback,
        marksAdjustment,
        adjustmentReason: reason,
        adjustedAt: new Date(),
    })

    if (marksAdjustment !== 0) {
        this.marksObtained = Math.max(
            0,
            Math.min(this.marksObtained + marksAdjustment, this.maxMarks)
        )
        this.percentage = (this.marksObtained / this.maxMarks) * 100
    }

    return this.save()
}

// ✅ Static methods
quizAttemptSchema.statics.getQuizStatistics = function (quizId) {
    return this.aggregate([
        { $match: { quiz: quizId } },
        {
            $group: {
                _id: null,
                totalAttempts: { $sum: 1 },
                averageScore: { $avg: "$percentage" },
                highestScore: { $max: "$percentage" },
                lowestScore: { $min: "$percentage" },
                passedCount: {
                    $sum: { $cond: [{ $gte: ["$percentage", 41] }, 1, 0] },
                },
            },
        },
    ])
}

quizAttemptSchema.statics.getStudentPerformance = function (
    studentId,
    limit = 10
) {
    return this.find({ student: studentId })
        .populate("quiz", "title")
        .populate("class", "subjectName subjectCode")
        .sort({ createdAt: -1 })
        .limit(limit)
}

// ✅ Pre-save middleware
quizAttemptSchema.pre("save", function (next) {
    // Ensure percentage is calculated correctly
    if (this.isModified("marksObtained") || this.isModified("maxMarks")) {
        this.percentage =
            this.maxMarks > 0 ? (this.marksObtained / this.maxMarks) * 100 : 0
    }

    // Update correct/incorrect counts if answers changed
    if (this.isModified("answers")) {
        this.correctAnswers = this.answers.filter(
            (answer) => answer.isCorrect
        ).length
        this.incorrectAnswers = this.answers.length - this.correctAnswers
        this.totalQuestions = this.answers.length
    }

    next()
})

// ✅ Export with existence check
export const QuizAttempt =
    mongoose.models.QuizAttempt ||
    mongoose.model("QuizAttempt", quizAttemptSchema)
