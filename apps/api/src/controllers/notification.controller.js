import { Notification } from "../models/notification.model.js"
import { User } from "../models/user.model.js"
import { ApiResponse, ApiError, asyncHandler } from "../utils/index.js"
import mongoose from "mongoose"

// Get user's notifications
const getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, isRead, priority } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    // ✅ Build filter
    const filter = { recipient: req.user._id }

    if (type) {
        filter.type = type
    }

    if (isRead !== undefined) {
        filter.isRead = isRead === "true"
    }

    if (priority) {
        filter.priority = priority
    }

    // ✅ Get notifications with pagination
    const [notifications, totalCount, unreadCount] = await Promise.all([
        Notification.find(filter)
            .populate("sender", "fullName avatar role")
            .populate("relatedQuiz", "title")
            .populate("relatedClass", "subjectName subjectCode")
            .populate("relatedUser", "fullName role")
            .populate("relatedQuizAttempt", "_id")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ])

    // ✅ Group notifications by date
    const groupedNotifications = groupNotificationsByDate(notifications)

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notifications: groupedNotifications,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalNotifications: totalCount,
                    unreadCount,
                    hasNextPage:
                        parseInt(page) <
                        Math.ceil(totalCount / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                },
                filters: { type, isRead, priority },
            },
            "Notifications retrieved successfully"
        )
    )
})

// Mark notification as read
const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new ApiError(400, "Invalid notification ID")
    }

    const notification = await Notification.findOneAndUpdate(
        {
            _id: notificationId,
            recipient: req.user._id,
            isRead: false,
        },
        {
            isRead: true,
            readAt: new Date(),
        },
        { new: true }
    )

    if (!notification) {
        throw new ApiError(404, "Notification not found or already read")
    }

    // ✅ Get updated unread count
    const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false,
    })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notification,
                unreadCount,
            },
            "Notification marked as read"
        )
    )
})

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
        {
            recipient: req.user._id,
            isRead: false,
        },
        {
            isRead: true,
            readAt: new Date(),
        }
    )

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                markedCount: result.modifiedCount,
                unreadCount: 0,
            },
            `Marked ${result.modifiedCount} notifications as read`
        )
    )
})

// Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new ApiError(400, "Invalid notification ID")
    }

    const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: req.user._id,
    })

    if (!notification) {
        throw new ApiError(404, "Notification not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Notification deleted successfully"))
})

// Delete all notifications
const deleteAllNotifications = asyncHandler(async (req, res) => {
    const { type, olderThan } = req.query

    const filter = { recipient: req.user._id }

    if (type) {
        filter.type = type
    }

    if (olderThan) {
        const date = new Date()
        date.setDate(date.getDate() - parseInt(olderThan))
        filter.createdAt = { $lt: date }
    }

    const result = await Notification.deleteMany(filter)

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                deletedCount: result.deletedCount,
            },
            `Deleted ${result.deletedCount} notifications`
        )
    )
})

// Get unread count
const getUnreadCount = asyncHandler(async (req, res) => {
    const [totalUnread, breakdown] = await Promise.all([
        Notification.countDocuments({
            recipient: req.user._id,
            isRead: false,
        }),
        Notification.aggregate([
            {
                $match: {
                    recipient: req.user._id,
                    isRead: false,
                },
            },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 },
                },
            },
        ]),
    ])

    const typeBreakdown = breakdown.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
    }, {})

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalUnread,
                breakdown: typeBreakdown,
            },
            "Unread count retrieved successfully"
        )
    )
})

// Update notification settings
const updateNotificationSettings = asyncHandler(async (req, res) => {
    const {
        emailNotifications = true,
        pushNotifications = true,
        smsNotifications = false,
        types = {},
    } = req.body

    // ✅ Default notification type settings
    const defaultTypes = {
        quiz_published: true,
        quiz_deadline_reminder: true,
        quiz_graded: true,
        class_message: true,
        class_joined: true,
        assignment_due: true,
        system_update: true,
    }

    const notificationSettings = {
        emailNotifications,
        pushNotifications,
        smsNotifications,
        types: { ...defaultTypes, ...types },
    }

    // ✅ Update user's notification preferences
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                "preferences.notifications": notificationSettings,
            },
        },
        { new: true, runValidators: true }
    ).select("preferences.notifications")

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                settings: updatedUser.preferences.notifications,
            },
            "Notification settings updated successfully"
        )
    )
})

// Get notification settings
const getNotificationSettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        "preferences.notifications"
    )

    // ✅ Default settings if not set
    const defaultSettings = {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        types: {
            quiz_published: true,
            quiz_deadline_reminder: true,
            quiz_graded: true,
            class_message: true,
            class_joined: true,
            assignment_due: true,
            system_update: true,
        },
    }

    const settings = user.preferences?.notifications || defaultSettings

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                settings,
            },
            "Notification settings retrieved successfully"
        )
    )
})

// Create notification (internal function, not exposed as route)
const createNotification = async (notificationData) => {
    const {
        recipient,
        sender,
        type,
        title,
        message,
        priority = "normal",
        relatedQuiz,
        relatedClass,
        relatedUser,
        actionUrl,
        expiresAt,
    } = notificationData

    // ✅ Check if recipient has this notification type enabled
    const user = await User.findById(recipient).select(
        "preferences.notifications"
    )
    const notificationTypes = user?.preferences?.notifications?.types || {}

    if (notificationTypes[type] === false) {
        return null // User has disabled this notification type
    }

    const notification = new Notification({
        recipient,
        sender,
        type,
        title,
        message,
        priority,
        relatedQuiz,
        relatedClass,
        relatedUser,
        actionUrl,
        expiresAt,
    })

    await notification.save()

    // ✅ Populate for real-time updates
    await notification.populate([
        { path: "sender", select: "fullName avatar role" },
        { path: "relatedQuiz", select: "title" },
        { path: "relatedClass", select: "subjectName subjectCode" },
    ])

    return notification
}

// Bulk create notifications (for system notifications)
const createBulkNotifications = async (recipients, notificationData) => {
    const notifications = recipients.map((recipientId) => ({
        ...notificationData,
        recipient: recipientId,
    }))

    const createdNotifications = await Notification.insertMany(notifications)
    return createdNotifications
}

// ✅ Helper Functions

const groupNotificationsByDate = (notifications) => {
    const groups = {}
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    notifications.forEach((notification) => {
        const notificationDate = new Date(notification.createdAt)
        let groupKey

        if (isSameDay(notificationDate, today)) {
            groupKey = "Today"
        } else if (isSameDay(notificationDate, yesterday)) {
            groupKey = "Yesterday"
        } else if (isThisWeek(notificationDate)) {
            groupKey = notificationDate.toLocaleDateString("en-US", {
                weekday: "long",
            })
        } else {
            groupKey = notificationDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year:
                    notificationDate.getFullYear() !== today.getFullYear()
                        ? "numeric"
                        : undefined,
            })
        }

        if (!groups[groupKey]) {
            groups[groupKey] = []
        }
        groups[groupKey].push(notification)
    })

    // ✅ Convert to array and sort
    return Object.entries(groups).map(([date, notifications]) => ({
        date,
        notifications,
        count: notifications.length,
    }))
}

const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString()
}

const isThisWeek = (date) => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)
    return date >= weekAgo && date <= today
}

// ✅ Notification Templates
const NotificationTemplates = {
    QUIZ_PUBLISHED: {
        type: "quiz_published",
        title: "📝 New Quiz Available",
        getMessage: (quizTitle, className) =>
            `"${quizTitle}" has been published in ${className}`,
    },

    QUIZ_DEADLINE_REMINDER: {
        type: "quiz_deadline_reminder",
        title: "⏰ Quiz Deadline Reminder",
        getMessage: (quizTitle, timeLeft) =>
            `"${quizTitle}" is due in ${timeLeft}`,
    },

    QUIZ_GRADED: {
        type: "quiz_graded",
        title: "✅ Quiz Graded",
        getMessage: (quizTitle, score) =>
            `Your quiz "${quizTitle}" has been graded. Score: ${score}%`,
    },

    CLASS_MESSAGE: {
        type: "class_message",
        title: "💬 New Class Message",
        getMessage: (senderName, className) =>
            `${senderName} posted a new message in ${className}`,
    },

    CLASS_JOINED: {
        type: "class_joined",
        title: "👋 Student Joined Class",
        getMessage: (studentName, className) =>
            `${studentName} has joined your class ${className}`,
    },
}

export {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getUnreadCount,
    updateNotificationSettings,
    getNotificationSettings,
    createNotification,
    createBulkNotifications,
    NotificationTemplates,
}
