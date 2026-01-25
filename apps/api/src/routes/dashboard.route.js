// routes/dashboard.routes.js
import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    getDashboard,
    getFacultyDashboard,
    getStudentDashboard,
    getDashboardStats,
    getDashboardAnalytics,
    getRecentActivity,
    getUpcomingEvents,
    getDashboardNotifications,
    updateDashboardPreferences,
    getDashboardPreferences,
} from "../controllers/dashboard.controller.js"

const router = Router()
router.use(verifyJWT)

// Main dashboard routes
router.route("/").get(getDashboard) // Role-based dashboard
router.route("/stats").get(getDashboardStats) // Dashboard statistics
router.route("/analytics").get(getDashboardAnalytics) // Analytics data

// Role-specific dashboards
router.route("/faculty").get(getFacultyDashboard) // Faculty dashboard
router.route("/student").get(getStudentDashboard) // Student dashboard

// Dashboard components
router.route("/recent-activity").get(getRecentActivity) // Recent activities
router.route("/upcoming-events").get(getUpcomingEvents) // Upcoming deadlines/events
router.route("/notifications").get(getDashboardNotifications) // Dashboard notifications

// User preferences
router.route("/preferences").get(getDashboardPreferences) // Get dashboard preferences
router.route("/preferences").patch(updateDashboardPreferences) // Update preferences

export default router
