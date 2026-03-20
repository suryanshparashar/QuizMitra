import { useEffect, useState } from "react"
import { useNotification } from "../context/NotificationContext"
import { format } from "date-fns"
import { Bell, Check, Trash2, Filter, CheckCheck } from "lucide-react"
import { api } from "../services/api.js"
import { Link } from "react-router-dom"
import { Skeleton } from "../components/LoadingStates"
import { showToast } from "../components/Toast"

const resolveNotificationAction = (notification) => {
    if (notification.relatedQuizAttempt?._id) {
        return {
            to: `/quiz-results/${notification.relatedQuizAttempt._id}`,
            label: notification.actionText || "View Details",
        }
    }

    if (notification.relatedQuiz?._id) {
        return {
            to: `/quizzes/${notification.relatedQuiz._id}`,
            label: notification.actionText || "View Details",
        }
    }

    if (notification.relatedClass?._id) {
        return {
            to: `/classes/${notification.relatedClass._id}`,
            label: notification.actionText || "View Details",
        }
    }

    if (typeof notification.actionUrl === "string") {
        if (notification.actionUrl.startsWith("/quizzes/")) {
            return {
                to: notification.actionUrl,
                label: notification.actionText || "View Details",
            }
        }

        if (notification.actionUrl.startsWith("/classes/")) {
            return {
                to: notification.actionUrl,
                label: notification.actionText || "View Details",
            }
        }
    }

    return null
}

export default function Notifications() {
    const { unreadCount, fetchUnreadCount, markAsRead, markAllAsRead } =
        useNotification()
    const [notifications, setNotifications] = useState([])
    const [filter, setFilter] = useState("all")
    const [loading, setLoading] = useState(true)

    const fetchNotifications = async () => {
        setLoading(true)
        try {
            const query = filter === "unread" ? "?isRead=false" : ""
            const response = await api.get(`/notifications${query}`)
            if (response.data.success) {
                setNotifications(response.data.data.notifications || [])
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
    }, [filter])

    const handleDelete = async (id) => {
        try {
            await api.delete(`/notifications/${id}`)
            showToast.success("Notification deleted")
            fetchNotifications()
            fetchUnreadCount()
        } catch (error) {
            showToast.error("Failed to delete notification")
        }
    }

    const handleMarkRead = async (id) => {
        await markAsRead(id)
        fetchNotifications()
    }

    const handleMarkAllRead = async () => {
        await markAllAsRead()
        showToast.success("All notifications marked as read")
        fetchNotifications()
    }

    const typeIcons = {
        quiz_published: "📝",
        quiz_graded: "✅",
        class_joined: "👋",
        class_assignment: "📚",
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-7 h-7 text-primary-600" />
                    Notifications
                    {unreadCount > 0 && (
                        <span className="text-sm bg-primary-100 text-primary-600 px-2.5 py-0.5 rounded-full font-semibold">
                            {unreadCount} new
                        </span>
                    )}
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={() =>
                            setFilter(filter === "all" ? "unread" : "all")
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition border ${
                            filter === "unread"
                                ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        {filter === "all" ? "Show Unread" : "Show All"}
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="px-4 py-2 bg-success-600 text-white rounded-lg text-sm font-medium hover:bg-success-700 transition flex items-center gap-2 shadow-sm"
                        >
                            <CheckCheck className="w-4 h-4" /> Mark All Read
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-xl border border-gray-200 p-5 space-y-3"
                        >
                            <Skeleton height="1rem" width="40%" />
                            <Skeleton height="0.875rem" width="80%" />
                            <Skeleton height="0.75rem" width="25%" />
                        </div>
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">
                        {filter === "unread"
                            ? "No unread notifications"
                            : "No notifications yet"}
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {filter === "unread"
                            ? "All caught up! Check back later."
                            : "You'll see updates about quizzes, classes, and grades here."}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {notifications.map((group) => (
                        <div key={group.date}>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                                {group.date}
                            </h3>
                            <div className="space-y-2">
                                {group.notifications.map((n) =>
                                    (() => {
                                        const action =
                                            resolveNotificationAction(n)

                                        return (
                                            <div
                                                key={n._id}
                                                className={`group p-4 rounded-xl border transition-all hover:shadow-md ${
                                                    n.isRead
                                                        ? "bg-white border-gray-200"
                                                        : "bg-primary-50 border-primary-200 shadow-sm"
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Icon */}
                                                    <span className="text-xl mt-0.5 flex-shrink-0">
                                                        {typeIcons[n.type] ||
                                                            "🔔"}
                                                    </span>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h4
                                                                className={`font-semibold text-sm truncate ${
                                                                    n.isRead
                                                                        ? "text-gray-800"
                                                                        : "text-primary-900"
                                                                }`}
                                                            >
                                                                {n.title}
                                                            </h4>
                                                            {!n.isRead && (
                                                                <span className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                                            {n.message}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                                            <span>
                                                                {format(
                                                                    new Date(
                                                                        n.createdAt
                                                                    ),
                                                                    "h:mm a"
                                                                )}
                                                            </span>
                                                            {action && (
                                                                <Link
                                                                    to={
                                                                        action.to
                                                                    }
                                                                    onClick={() => {
                                                                        if (
                                                                            !n.isRead
                                                                        ) {
                                                                            handleMarkRead(
                                                                                n._id
                                                                            )
                                                                        }
                                                                    }}
                                                                    className="text-primary-600 hover:underline font-medium"
                                                                >
                                                                    {
                                                                        action.label
                                                                    }{" "}
                                                                    →
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                        {!n.isRead && (
                                                            <button
                                                                onClick={() =>
                                                                    handleMarkRead(
                                                                        n._id
                                                                    )
                                                                }
                                                                className="p-1.5 text-primary-600 hover:bg-primary-100 rounded-lg transition"
                                                                title="Mark as read"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    n._id
                                                                )
                                                            }
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })()
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
