import mongoose, { Schema } from "mongoose"

// Enhanced Question Schema
const questionSchema = new Schema(
    {
        questionText: {
            type: String,
            required: [true, "Question text is required"],
            trim: true,
            minlength: [10, "Question must be at least 10 characters"],
            maxlength: [1000, "Question cannot exceed 1000 characters"],
        },

        // ✅ Question Type Support
        questionType: {
            type: String,
            enum: {
                values: [
                    "multiple-choice",
                    "true-false",
                    "fill-in-blank",
                    "multiple-select",
                    "short-answer",
                    "long-answer",
                ],
                message: "{VALUE} is not a valid question type",
            },
            default: "multiple-choice",
        },

        options: [
            {
                type: String,
                required: [true, "Option text is required"],
                trim: true,
                maxlength: [200, "Option cannot exceed 200 characters"],
            },
        ],

        // ✅ Single correct answer for most question types
        correctAnswer: {
            type: String,
            trim: true,
            validate: {
                validator: function (answer) {
                    if (this.questionType === "fill-in-blank") {
                        return true // Any text is valid for fill-in-blank
                    }
                    if (this.questionType === "multiple-select") {
                        return false // Should use correctOptions for multi-select
                    }
                    return this.options.includes(answer)
                },
                message: "Correct answer must be one of the provided options",
            },
        },

        // ✅ Multiple correct answers (for multiple-select questions)
        correctOptions: [
            {
                type: String,
                validate: {
                    validator: function (correctOption) {
                        return this.parent().options.includes(correctOption)
                    },
                    message:
                        "Correct answer must be one of the provided options",
                },
            },
        ],

        // ✅ Question Configuration
        points: {
            type: Number,
            required: [true, "Question points is required"],
            min: [0, "Points cannot be negative"],
            max: [100, "Points cannot exceed 100"],
        },

        difficulty: {
            type: String,
            lowercase: true,
            enum: {
                values: ["easy", "medium", "hard"],
                message: "{VALUE} is not a valid difficulty level",
            },
            default: "medium",
        },

        explanation: {
            type: String,
            trim: true,
            maxlength: [500, "Explanation cannot exceed 500 characters"],
        },

        // ✅ Question Metadata
        topic: {
            type: String,
            trim: true,
            maxlength: [100, "Topic cannot exceed 100 characters"],
        },

        timeLimit: {
            type: Number, // seconds per question
            min: [5, "Time limit cannot be less than 5 seconds"],
            max: [300, "Time limit cannot exceed 5 minutes"],
        },

        // ✅ Question Status
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        _id: false,
        timestamps: false,
    }
)

// ✅ Question validation middleware (MOVED TO CORRECT POSITION)
questionSchema.pre("validate", function (next) {
    // Validate answer requirements based on question type
    if (this.questionType === "multiple-select") {
        if (!this.correctOptions || this.correctOptions.length === 0) {
            return next(
                new Error("Multiple-select questions must have correctOptions")
            )
        }
        if (this.correctAnswer) {
            return next(
                new Error(
                    "Multiple-select questions should not have correctAnswer"
                )
            )
        }
    } else {
        if (!this.correctAnswer || this.correctAnswer.trim() === "") {
            return next(
                new Error("Single-answer questions must have correctAnswer")
            )
        }
        if (this.correctOptions && this.correctOptions.length > 0) {
            return next(
                new Error(
                    "Single-answer questions should not have correctOptions"
                )
            )
        }
    }

    // Validate options count based on question type
    if (this.questionType === "true-false" && this.options.length !== 2) {
        return next(
            new Error("True/False questions must have exactly 2 options")
        )
    }

    if (this.questionType === "multiple-choice" && this.options.length < 2) {
        return next(
            new Error("Multiple choice questions must have at least 2 options")
        )
    }

    if (this.questionType === "multiple-select" && this.options.length < 2) {
        return next(
            new Error("Multiple select questions must have at least 2 options")
        )
    }

    next()
})

// Enhanced Quiz Schema
const quizSchema = new Schema(
    {
        // ✅ Required Creator
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Quiz creator is required"],
            validate: {
                validator: async function (creatorId) {
                    const User = mongoose.model("User")
                    const creator = await User.findById(creatorId)
                    return creator && creator.role === "faculty"
                },
                message: "Only faculty members can create quizzes",
            },
            index: true,
        },

        classId: {
            type: Schema.Types.ObjectId,
            ref: "Class",
            required: [true, "Class is required"],
            index: true,
        },

        // ✅ Enhanced Basic Info
        title: {
            type: String,
            required: [true, "Quiz title is required"],
            trim: true,
            minlength: [3, "Title must be at least 3 characters"],
            maxlength: [200, "Title cannot exceed 200 characters"],
            index: true,
        },

        description: {
            type: String,
            trim: true,
            default: "",
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },

        instructions: {
            type: String,
            trim: true,
            maxlength: [2000, "Instructions cannot exceed 2000 characters"],
            default: "Read each question carefully and select the best answer.",
        },

        // ✅ Enhanced Status Management
        status: {
            type: String,
            enum: {
                values: ["draft", "published", "archived", "scheduled"],
                message: "{VALUE} is not a valid quiz status",
            },
            default: "draft",
            index: true,
        },

        // ✅ Source Information
        input: {
            type: String,
            required: [true, "Quiz input source is required"],
            trim: true,
        },

        inputType: {
            type: String,
            enum: {
                values: ["pdf", "topic", "text", "manual", "imported"],
                message: "{VALUE} is not a valid input type",
            },
            default: "pdf",
        },

        // ✅ PDF Metadata (for Cloudinary)
        pdfFile: {
            url: String,
            publicId: String,
        },

        // ✅ Enhanced Requirements
        requirements: {
            numQuestions: {
                type: Number,
                required: [true, "Number of questions is required"],
                min: [1, "Must have at least 1 question"],
                max: [100, "Cannot exceed 100 questions"],
            },
            difficultyLevel: {
                type: String,
                required: [true, "Difficulty level is required"],
                enum: {
                    values: ["easy", "medium", "hard", "mixed"],
                    message: "{VALUE} is not a valid difficulty level",
                },
            },
            questionTypes: [
                {
                    type: String,
                    required: [true, "Question types are required"],
                    enum: {
                        values: [
                            "multiple-choice",
                            "true-false",
                            "fill-in-blank",
                            "multiple-select",
                        ],
                        message: "{VALUE} is not a valid question type",
                    },
                },
            ],
            topics: [
                {
                    type: String,
                    trim: true,
                    maxlength: [100, "Topic cannot exceed 100 characters"],
                },
            ],
            marksPerQuestion: {
                type: Number,
                required: [true, "Marks per question is required"],
                min: [0.5, "Minimum marks per question is 0.5"],
                max: [10, "Maximum marks per question is 10"],
            },
            totalMarks: {
                type: Number,
                required: [true, "Total marks is required"],
                min: [1, "Total marks must be at least 1"],
                max: [100, "Total marks cannot exceed 100"],
            },
        },

        questions: {
            type: [questionSchema],
            validate: {
                validator: function (questions) {
                    return questions.length >= 1
                },
                message: "Quiz must have at least 1 question",
            },
        },

        // ✅ Enhanced Timing
        duration: {
            type: Number, // in minutes
            required: [true, "Quiz duration is required"],
            min: [5, "Minimum duration is 5 minutes"],
            max: [480, "Maximum duration is 8 hours"],
        },

        // ✅ Fixed Date Validation
        scheduledAt: {
            type: Date,
            required: [true, "Scheduled time is required"],
            index: true,
        },

        deadline: {
            type: Date,
            required: [true, "Deadline is required"],
            validate: {
                validator: function (deadline) {
                    return deadline > this.scheduledAt
                },
                message: "Deadline must be after scheduled time",
            },
            index: true,
        },

        // ✅ Publishing Info
        isPublished: {
            type: Boolean,
            default: false,
            index: true,
        },

        publishedAt: {
            type: Date,
        },

        publishedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        // ✅ Quiz Settings
        settings: {
            attemptsAllowed: {
                type: Number,
                default: 1,
                min: [1, "Must allow at least 1 attempt"],
                max: [10, "Cannot allow more than 10 attempts"],
            },

            shuffleQuestions: {
                type: Boolean,
                default: false,
            },

            shuffleOptions: {
                type: Boolean,
                default: false,
            },

            showCorrectAnswers: {
                type: Boolean,
                default: true,
            },

            showScoreImmediately: {
                type: Boolean,
                default: true,
            },

            allowBackNavigation: {
                type: Boolean,
                default: true,
            },

            passingScore: {
                type: Number,
                default: 60,
                min: [0, "Passing score cannot be negative"],
                max: [100, "Passing score cannot exceed 100%"],
            },

            timeWarnings: {
                type: [Number], // Minutes before end to show warnings
                default: [10, 5, 1],
            },

            autoSubmit: {
                type: Boolean,
                default: true, // Auto-submit when time expires
            },
        },

        // ✅ Categorization
        tags: {
            type: [String],
            validate: {
                validator: function (tags) {
                    return tags.length <= 10
                },
                message: "Cannot have more than 10 tags",
            },
        },

        category: {
            type: String,
            enum: {
                values: [
                    "assignment",
                    "midterm",
                    "final",
                    "practice",
                    "homework",
                    "quiz",
                ],
                message: "{VALUE} is not a valid category",
            },
            default: "quiz",
        },

        // ✅ Error Handling
        generationError: {
            message: String,
            code: String,
            timestamp: {
                type: Date,
                default: Date.now,
            },
        },

        // ✅ Analytics
        totalAttempts: {
            type: Number,
            default: 0,
            min: [0, "Total attempts cannot be negative"],
        },

        averageScore: {
            type: Number,
            min: [0, "Average score cannot be negative"],
            max: [100, "Average score cannot exceed 100"],
        },

        // ✅ Versioning
        version: {
            type: Number,
            default: 1,
            min: [1, "Version must be at least 1"],
        },

        isTemplate: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
        // Enable virtuals
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
)

// ✅ Enhanced Indexes
quizSchema.index({ classId: 1, status: 1 })
quizSchema.index({ userId: 1, createdAt: -1 })
quizSchema.index({ scheduledAt: 1, deadline: 1 })
quizSchema.index({ status: 1, scheduledAt: 1 })
quizSchema.index({ tags: 1 })
quizSchema.index({ category: 1, classId: 1 })
quizSchema.index({ title: "text", description: "text" })

// ✅ Virtual Fields
quizSchema.virtual("currentStatus").get(function () {
    const now = new Date()
    if (this.status === "draft") return "draft"
    if (this.status === "archived") return "archived"
    if (!this.isPublished) return "unpublished"
    if (now < this.scheduledAt) return "scheduled"
    if (now > this.deadline) return "expired"
    return "active"
})

quizSchema.virtual("totalPoints").get(function () {
    if (!this.questions) return 0
    return this.questions.reduce((total, q) => total + (q.points || 0), 0)
})

quizSchema.virtual("questionCount").get(function () {
    if (!this.questions) return 0
    return this.questions.length
})

quizSchema.virtual("isActive").get(function () {
    const now = new Date()
    return this.isPublished && now >= this.scheduledAt && now <= this.deadline
})

// ✅ Instance Methods
quizSchema.methods.canTakeQuiz = function (userId) {
    const now = new Date()
    return (
        this.isPublished &&
        now >= this.scheduledAt &&
        now <= this.deadline &&
        this.status === "published"
    )
}

quizSchema.methods.isCreator = function (userId) {
    return this.userId.toString() === userId.toString()
}

quizSchema.methods.getQuizStats = function () {
    return {
        totalQuestions: this.questions.length,
        totalPoints: this.totalPoints,
        duration: this.duration,
        attemptsAllowed: this.settings.attemptsAllowed,
        currentStatus: this.currentStatus,
        isActive: this.isActive,
    }
}

quizSchema.methods.publish = function (publishedBy) {
    this.isPublished = true
    this.publishedAt = new Date()
    this.publishedBy = publishedBy
    this.status = "published"
}

quizSchema.methods.archive = function () {
    this.status = "archived"
    this.isPublished = false
}

// ✅ Pre-save Middleware
quizSchema.pre("save", function (next) {
    // Keep requirements aligned with edited questions for faculty free-hand updates.
    if (this.requirements && Array.isArray(this.questions)) {
        this.requirements.numQuestions = this.questions.length
    }

    const calculatedTotal = this.questions.reduce(
        (total, q) => total + (q.points || this.requirements.marksPerQuestion),
        0
    )

    if (this.requirements) {
        this.requirements.totalMarks = Number(calculatedTotal.toFixed(4))

        if (this.questions.length > 0) {
            this.requirements.marksPerQuestion = Number(
                (calculatedTotal / this.questions.length).toFixed(4)
            )
        }
    }

    // Update version if questions changed
    if (this.isModified("questions") && !this.isNew) {
        this.version += 1
    }

    next()
})

export const Quiz = mongoose.model("Quiz", quizSchema)
