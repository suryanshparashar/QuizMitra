import mongoose, { Schema } from "mongoose"

// Enhanced Comment Schema
const messageCommentSchema = new Schema(
    {
        commenter: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Commenter is required"],
            index: true,
        },
        content: {
            type: String,
            required: [true, "Comment content is required"],
            trim: true,
            minlength: [1, "Comment cannot be empty"],
            maxlength: [500, "Comment content cannot exceed 500 characters"],
        },

        // ✅ Enhanced comment features
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
        },
        originalContent: {
            type: String, // Store original if edited
        },

        // ✅ Comment status
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
        },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        // ✅ Comment metadata
        ipAddress: {
            type: String,
            trim: true,
        },
        userAgent: {
            type: String,
            trim: true,
            maxlength: [500, "User agent cannot exceed 500 characters"],
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false, // Comments typically aren't updated
        },
    }
)

// Enhanced Main Message Schema
const classMessageSchema = new Schema(
    {
        class: {
            type: Schema.Types.ObjectId,
            ref: "Class",
            required: [true, "Class is required"],
            index: true,
        },

        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Sender is required"],
            index: true,
        },

        content: {
            type: String,
            required: [true, "Message content is required"],
            trim: true,
            minlength: [1, "Message content cannot be empty"],
            maxlength: [2000, "Message content cannot exceed 2000 characters"],
        },

        // ✅ Message Type & Priority
        messageType: {
            type: String,
            enum: {
                values: [
                    "regular",
                    "announcement",
                    "urgent",
                    "system",
                    "reminder",
                ],
                message: "{VALUE} is not a valid message type",
            },
            default: "regular",
            index: true,
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

        // ✅ Message Status
        status: {
            type: String,
            enum: {
                values: ["active", "edited", "deleted", "archived"],
                message: "{VALUE} is not a valid message status",
            },
            default: "active",
            index: true,
        },

        // ✅ Message Features
        isPinned: {
            type: Boolean,
            default: false,
            index: true,
        },
        pinnedAt: {
            type: Date,
        },
        pinnedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        // ✅ Editing History
        isEdited: {
            type: Boolean,
            default: false,
            index: true,
        },
        editedAt: {
            type: Date,
        },
        originalContent: {
            type: String, // Store original content if edited
        },
        editHistory: [
            {
                content: {
                    type: String,
                    required: true,
                },
                editedAt: {
                    type: Date,
                    default: Date.now,
                },
                editReason: {
                    type: String,
                    maxlength: [
                        200,
                        "Edit reason cannot exceed 200 characters",
                    ],
                },
            },
        ],

        // ✅ Soft Deletion
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
        },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        deleteReason: {
            type: String,
            maxlength: [200, "Delete reason cannot exceed 200 characters"],
        },

        // ✅ Read Receipts (track who has seen the message)
        readBy: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                },
                readAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // ✅ Message Reactions
        reactions: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                },
                emoji: {
                    type: String,
                    enum: ["👍", "👎", "❤️", "😄", "😮", "😢", "😡"],
                    required: true,
                },
                reactedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // ✅ Attachments (for future file support)
        attachments: [
            {
                fileName: {
                    type: String,
                    required: true,
                    trim: true,
                },
                fileUrl: {
                    type: String,
                    required: true,
                    trim: true,
                },
                fileType: {
                    type: String,
                    enum: ["image", "document", "video", "audio", "other"],
                    required: true,
                },
                fileSize: {
                    type: Number,
                    min: [0, "File size cannot be negative"],
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // Comments (consider moving to separate collection if growing large)
        comments: {
            type: [messageCommentSchema],
            validate: {
                validator: function (comments) {
                    return comments.length <= 100 // Limit to prevent huge documents
                },
                message: "Cannot have more than 100 comments per message",
            },
        },

        // ✅ Analytics & Metadata
        viewCount: {
            type: Number,
            default: 0,
            min: [0, "View count cannot be negative"],
        },

        lastActivity: {
            type: Date,
            default: Date.now,
            index: true,
        },

        // ✅ Submission Context
        ipAddress: {
            type: String,
            trim: true,
        },
        userAgent: {
            type: String,
            trim: true,
            maxlength: [500, "User agent cannot exceed 500 characters"],
        },

        // ✅ Scheduled Messages (for announcements)
        scheduledFor: {
            type: Date,
            index: true,
        },
        isScheduled: {
            type: Boolean,
            default: false,
            index: true,
        },

        // ✅ Tags for categorization
        tags: [
            {
                type: String,
                trim: true,
                lowercase: true,
                maxlength: [50, "Tag cannot exceed 50 characters"],
            },
        ],

        // ✅ Mention tracking
        mentions: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                },
                notified: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
    },
    {
        timestamps: true,
        // Enable virtuals for JSON output
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
)

// ✅ Enhanced Indexing Strategy
classMessageSchema.index({ class: 1, createdAt: -1 }) // Class timeline
classMessageSchema.index({ sender: 1, createdAt: -1 }) // User messages
classMessageSchema.index({ class: 1, messageType: 1 }) // Message types per class
classMessageSchema.index({ class: 1, isPinned: 1 }) // Pinned messages
classMessageSchema.index({ class: 1, status: 1, createdAt: -1 }) // Active messages
classMessageSchema.index({ scheduledFor: 1, isScheduled: 1 }) // Scheduled messages
classMessageSchema.index({ priority: 1, createdAt: -1 }) // Priority sorting
classMessageSchema.index({ lastActivity: -1 }) // Recent activity
classMessageSchema.index({ "mentions.user": 1, "mentions.notified": 1 }) // User mentions
classMessageSchema.index({ tags: 1 }) // Tag-based filtering
classMessageSchema.index({ content: "text" }) // Full-text search

// ✅ Virtual Fields
classMessageSchema.virtual("commentsCount").get(function () {
    return this.comments ? this.comments.filter((c) => !c.isDeleted).length : 0
})

classMessageSchema.virtual("reactionsCount").get(function () {
    return this.reactions ? this.reactions.length : 0
})

classMessageSchema.virtual("unreadCount").get(function () {
    // This would need to be calculated based on class membership
    return 0 // Placeholder - calculate in controller
})

classMessageSchema.virtual("isRecent").get(function () {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return this.createdAt > oneHourAgo
})

// ✅ Instance Methods
classMessageSchema.methods.addReaction = function (userId, emoji) {
    // Remove existing reaction from same user
    this.reactions = this.reactions.filter(
        (r) => r.user.toString() !== userId.toString()
    )

    // Add new reaction
    this.reactions.push({
        user: userId,
        emoji: emoji,
        reactedAt: new Date(),
    })
}

classMessageSchema.methods.removeReaction = function (userId) {
    this.reactions = this.reactions.filter(
        (r) => r.user.toString() !== userId.toString()
    )
}

classMessageSchema.methods.markAsRead = function (userId) {
    const existing = this.readBy.find(
        (r) => r.user.toString() === userId.toString()
    )
    if (!existing) {
        this.readBy.push({
            user: userId,
            readAt: new Date(),
        })
        this.viewCount++
    }
}

classMessageSchema.methods.canEditBy = function (userId) {
    return this.sender.toString() === userId.toString() && !this.isDeleted
}

classMessageSchema.methods.canDeleteBy = function (
    userId,
    userRole,
    classFaculty
) {
    return (
        this.sender.toString() === userId.toString() ||
        (userRole === "faculty" &&
            classFaculty.toString() === userId.toString())
    )
}

classMessageSchema.methods.softDelete = function (deletedBy, reason) {
    this.isDeleted = true
    this.deletedAt = new Date()
    this.deletedBy = deletedBy
    this.deleteReason = reason
    this.status = "deleted"
}

classMessageSchema.methods.editContent = function (newContent, editReason) {
    // Store in edit history
    this.editHistory.push({
        content: this.content,
        editedAt: new Date(),
        editReason: editReason,
    })

    // Update content
    if (!this.originalContent) {
        this.originalContent = this.content
    }
    this.content = newContent
    this.isEdited = true
    this.editedAt = new Date()
    this.status = "edited"
    this.lastActivity = new Date()
}

classMessageSchema.methods.pin = function (pinnedBy) {
    this.isPinned = true
    this.pinnedAt = new Date()
    this.pinnedBy = pinnedBy
}

classMessageSchema.methods.unpin = function () {
    this.isPinned = false
    this.pinnedAt = null
    this.pinnedBy = null
}

// ✅ Static Methods
classMessageSchema.statics.findActiveByClass = function (classId) {
    return this.find({
        class: classId,
        isDeleted: false,
        status: { $ne: "deleted" },
    }).sort({ isPinned: -1, createdAt: -1 })
}

classMessageSchema.statics.findPinnedByClass = function (classId) {
    return this.find({
        class: classId,
        isPinned: true,
        isDeleted: false,
    }).sort({ pinnedAt: -1 })
}

classMessageSchema.statics.findScheduledMessages = function () {
    return this.find({
        isScheduled: true,
        scheduledFor: { $lte: new Date() },
        isDeleted: false,
    })
}

// ✅ Pre-save Middleware
classMessageSchema.pre("save", function (next) {
    // Update lastActivity on any change
    this.lastActivity = new Date()

    // Extract mentions from content
    const mentionRegex = /@(\w+)/g
    let matches
    this.mentions = []

    while ((matches = mentionRegex.exec(this.content)) !== null) {
        // This is a simple example - in reality you'd resolve usernames to user IDs
        // mentions.push({ user: resolvedUserId, notified: false })
    }

    next()
})

// ✅ Post-save Middleware
classMessageSchema.post("save", async function () {
    // Update class last activity or send notifications
    // This is where you might trigger real-time notifications
})

export const ClassMessage = mongoose.model("ClassMessage", classMessageSchema)
