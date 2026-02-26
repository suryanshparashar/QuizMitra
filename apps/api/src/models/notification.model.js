import mongoose, { Schema } from "mongoose"

// if (mongoose.models.Notification) {
//     delete mongoose.models.Notification
// }
// if (mongoose.modelSchemas.Notification) {
//     delete mongoose.modelSchemas.Notification
// }

const notificationSchema = new Schema(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Recipient is required"],
            index: true,
        },

        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        type: {
            type: String,
            enum: {
                values: [
                    "quiz_published",
                    "quiz_deadline_reminder",
                    "quiz_graded",
                    "quiz_result_available",
                    "class_message",
                    "class_joined",
                    "class_assignment",
                    "assignment_due",
                    "grade_updated",
                    "grade_dispute_resolved",
                    "system_update",
                    "account_update",
                    "welcome",
                    "reminder",
                ],
                message: "{VALUE} is not a valid notification type",
            },
            required: [true, "Notification type is required"],
            index: true,
        },

        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [150, "Title cannot exceed 150 characters"],
        },

        message: {
            type: String,
            required: [true, "Message is required"],
            trim: true,
            maxlength: [500, "Message cannot exceed 500 characters"],
        },

        priority: {
            type: String,
            enum: {
                values: ["low", "normal", "high", "urgent"],
                message: "{VALUE} is not a valid priority level",
            },
            default: "normal",
            index: true,
        },

        category: {
            type: String,
            enum: {
                values: [
                    "academic",
                    "administrative",
                    "social",
                    "technical",
                    "reminder",
                ],
                message: "{VALUE} is not a valid category",
            },
            default: "academic",
            index: true,
        },

        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },

        readAt: {
            type: Date,
        },

        isStarred: {
            type: Boolean,
            default: false,
            index: true,
        },

        starredAt: {
            type: Date,
        },

        // Related entities for context
        relatedQuiz: {
            type: Schema.Types.ObjectId,
            ref: "Quiz",
        },

        relatedClass: {
            type: Schema.Types.ObjectId,
            ref: "Class",
        },

        relatedUser: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        relatedQuizAttempt: {
            type: Schema.Types.ObjectId,
            ref: "QuizAttempt",
        },

        relatedMessage: {
            type: Schema.Types.ObjectId,
            ref: "ClassMessage",
        },

        // Action configuration
        actionUrl: {
            type: String,
            trim: true,
            maxlength: [200, "Action URL cannot exceed 200 characters"],
        },

        actionText: {
            type: String,
            trim: true,
            maxlength: [50, "Action text cannot exceed 50 characters"],
            default: "View",
        },

        // Icon and styling
        icon: {
            type: String,
            trim: true,
            maxlength: [50, "Icon cannot exceed 50 characters"],
        },

        iconColor: {
            type: String,
            trim: true,
            maxlength: [20, "Icon color cannot exceed 20 characters"],
            default: "#3B82F6",
        },

        // Auto-expire notifications (TTL)
        expiresAt: {
            type: Date,
            index: { expireAfterSeconds: 0 },
        },

        // Delivery tracking
        deliveryStatus: {
            email: {
                sent: { type: Boolean, default: false },
                sentAt: { type: Date },
                error: { type: String },
            },
            push: {
                sent: { type: Boolean, default: false },
                sentAt: { type: Date },
                error: { type: String },
            },
            sms: {
                sent: { type: Boolean, default: false },
                sentAt: { type: Date },
                error: { type: String },
            },
        },

        // Additional data for dynamic content
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },

        // Grouping for batch notifications
        groupKey: {
            type: String,
            trim: true,
            index: true,
        },

        // Scheduling
        scheduledFor: {
            type: Date,
            index: true,
        },

        isScheduled: {
            type: Boolean,
            default: false,
            index: true,
        },

        // User interaction tracking
        interactions: [
            {
                action: {
                    type: String,
                    enum: ["clicked", "dismissed", "starred", "shared"],
                    required: true,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                metadata: {
                    type: Schema.Types.Mixed,
                },
            },
        ],

        // Soft delete
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        deletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                // Don't include deleted notifications in JSON
                if (ret.isDeleted) {
                    return null
                }
                return ret
            },
        },
        toObject: { virtuals: true },
    }
)

// ✅ Enhanced Indexes for Performance
notificationSchema.index({ recipient: 1, isRead: 1, isDeleted: 1 })
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 })
notificationSchema.index({ recipient: 1, category: 1, createdAt: -1 })
notificationSchema.index({ recipient: 1, priority: 1, isRead: 1 })
notificationSchema.index({ recipient: 1, isStarred: 1, createdAt: -1 })
notificationSchema.index({ groupKey: 1, recipient: 1 })
notificationSchema.index({ scheduledFor: 1, isScheduled: 1 })
notificationSchema.index({ createdAt: -1 })

// ✅ Virtual Fields
notificationSchema.virtual("isRecent").get(function () {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return this.createdAt > oneHourAgo
})

notificationSchema.virtual("timeAgo").get(function () {
    return getTimeAgo(this.createdAt)
})

notificationSchema.virtual("isExpired").get(function () {
    return this.expiresAt && new Date() > this.expiresAt
})

notificationSchema.virtual("hasAction").get(function () {
    return Boolean(this.actionUrl)
})

notificationSchema.virtual("isUrgent").get(function () {
    return this.priority === "urgent" || this.priority === "high"
})

// ✅ Instance Methods
notificationSchema.methods.markAsRead = function () {
    if (!this.isRead) {
        this.isRead = true
        this.readAt = new Date()
        return this.save()
    }
    return Promise.resolve(this)
}

notificationSchema.methods.toggleStar = function () {
    this.isStarred = !this.isStarred
    this.starredAt = this.isStarred ? new Date() : null
    return this.save()
}

notificationSchema.methods.addInteraction = function (action, metadata = {}) {
    this.interactions.push({
        action,
        timestamp: new Date(),
        metadata,
    })
    return this.save()
}

notificationSchema.methods.softDelete = function () {
    this.isDeleted = true
    this.deletedAt = new Date()
    return this.save()
}

notificationSchema.methods.getIconForType = function () {
    const iconMap = {
        quiz_published: "📝",
        quiz_deadline_reminder: "⏰",
        quiz_graded: "✅",
        quiz_result_available: "📊",
        class_message: "💬",
        class_joined: "👋",
        class_assignment: "📚",
        assignment_due: "📅",
        grade_updated: "📈",
        grade_dispute_resolved: "⚖️",
        system_update: "🔄",
        account_update: "👤",
        welcome: "🎉",
        reminder: "🔔",
    }

    return this.icon || iconMap[this.type] || "📌"
}

notificationSchema.methods.getColorForPriority = function () {
    const colorMap = {
        low: "#6B7280",
        normal: "#3B82F6",
        high: "#F59E0B",
        urgent: "#EF4444",
    }

    return this.iconColor || colorMap[this.priority] || "#3B82F6"
}

// ✅ Static Methods
notificationSchema.statics.getUnreadCount = function (userId) {
    return this.countDocuments({
        recipient: userId,
        isRead: false,
        isDeleted: false,
    })
}

notificationSchema.statics.getUnreadCountByType = function (userId) {
    return this.aggregate([
        {
            $match: {
                recipient: userId,
                isRead: false,
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: "$type",
                count: { $sum: 1 },
            },
        },
    ])
}

notificationSchema.statics.markAllAsRead = function (userId, type = null) {
    const filter = {
        recipient: userId,
        isRead: false,
        isDeleted: false,
    }

    if (type) {
        filter.type = type
    }

    return this.updateMany(filter, {
        isRead: true,
        readAt: new Date(),
    })
}

notificationSchema.statics.deleteOldNotifications = function (daysOld = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    return this.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true,
        isStarred: false,
    })
}

notificationSchema.statics.getNotificationStats = function (userId, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.aggregate([
        {
            $match: {
                recipient: userId,
                createdAt: { $gte: startDate },
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                read: { $sum: { $cond: ["$isRead", 1, 0] } },
                starred: { $sum: { $cond: ["$isStarred", 1, 0] } },
                byType: {
                    $push: {
                        type: "$type",
                        priority: "$priority",
                    },
                },
            },
        },
    ])
}

notificationSchema.statics.findScheduledNotifications = function () {
    return this.find({
        isScheduled: true,
        scheduledFor: { $lte: new Date() },
        isDeleted: false,
    })
}

notificationSchema.statics.createBulkNotifications = function (notifications) {
    return this.insertMany(notifications, { ordered: false })
}

// ✅ Pre-save Middleware
notificationSchema.pre("save", function (next) {
    // Set default expiration (30 days from now)
    if (!this.expiresAt && this.type !== "system_update") {
        this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }

    // Set category based on type if not provided
    if (!this.category) {
        if (
            ["quiz_published", "quiz_graded", "assignment_due"].includes(
                this.type
            )
        ) {
            this.category = "academic"
        } else if (["class_joined", "class_message"].includes(this.type)) {
            this.category = "social"
        } else if (["system_update", "account_update"].includes(this.type)) {
            this.category = "technical"
        } else {
            this.category = "administrative"
        }
    }

    next()
})

// ✅ Helper function for time ago calculation
function getTimeAgo(date) {
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
    }

    for (const [unit, seconds] of Object.entries(intervals)) {
        const interval = Math.floor(diffInSeconds / seconds)
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`
        }
    }

    return "Just now"
}

export const Notification =
    mongoose.models.Notification ||
    mongoose.connection.model("Notification", notificationSchema)
