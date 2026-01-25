import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    getOverallAnalytics,
    getClassPerformanceAnalytics,
    getStudentProgressAnalytics,
    getQuizDifficultyAnalytics,
    getTimeBasedAnalytics,
    exportAnalyticsData,
    getComparisonAnalytics
} from "../controllers/analytics.controller.js"

const router = Router()
router.use(verifyJWT)

// Overall analytics
router.route("/").get(getOverallAnalytics)

// Specific analytics
router.route("/class/:classId/performance").get(getClassPerformanceAnalytics)
router.route("/student/:studentId/progress").get(getStudentProgressAnalytics)
router.route("/quiz/:quizId/difficulty").get(getQuizDifficultyAnalytics)
router.route("/time-based").get(getTimeBasedAnalytics)
router.route("/comparison").get(getComparisonAnalytics)

// Export functionality
router.route("/export/:type").get(exportAnalyticsData)

export default router
