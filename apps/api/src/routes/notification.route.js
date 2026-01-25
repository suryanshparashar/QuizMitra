import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getUnreadCount,
    updateNotificationSettings,
    getNotificationSettings
} from "../controllers/notification.controller.js"

const router = Router()
router.use(verifyJWT)

// Notification management
router.route("/").get(getNotifications)
router.route("/unread-count").get(getUnreadCount)
router.route("/:notificationId/mark-read").patch(markAsRead)
router.route("/mark-all-read").patch(markAllAsRead)
router.route("/:notificationId").delete(deleteNotification)
router.route("/delete-all").delete(deleteAllNotifications)

// Settings
router.route("/settings").get(getNotificationSettings)
router.route("/settings").patch(updateNotificationSettings)

export default router
