import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react"
import { useAuthStore } from "../store/authStore.js"
import { api } from "../services/api.js"

const NotificationContext = createContext()

export const useNotification = () => useContext(NotificationContext)

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated } = useAuthStore()
    const [unreadCount, setUnreadCount] = useState(0)
    const [breakdown, setBreakdown] = useState({})

    const fetchUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return

        try {
            const response = await api.get("/notifications/unread-count")
            if (response.data.success) {
                setUnreadCount(response.data.data.totalUnread)
                setBreakdown(response.data.data.breakdown || {})
            }
        } catch (error) {
            // Silently fail - notifications are non-critical
        }
    }, [isAuthenticated])

    // Initial fetch + polling
    useEffect(() => {
        if (!isAuthenticated) {
            setUnreadCount(0)
            setBreakdown({})
            return
        }

        fetchUnreadCount()
        const intervalId = setInterval(fetchUnreadCount, 60000) // 60s
        return () => clearInterval(intervalId)
    }, [isAuthenticated, fetchUnreadCount])

    const markAsRead = async (notificationId) => {
        try {
            await api.patch(`/notifications/${notificationId}/mark-read`)
            setUnreadCount((prev) => Math.max(0, prev - 1))
        } catch (error) {
            console.error("Failed to mark notification as read", error)
        }
    }

    const markAllAsRead = async () => {
        try {
            await api.patch("/notifications/mark-all-read")
            setUnreadCount(0)
            setBreakdown({})
        } catch (error) {
            console.error("Failed to mark all notifications as read", error)
        }
    }

    const value = {
        unreadCount,
        breakdown,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
    }

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    )
}
