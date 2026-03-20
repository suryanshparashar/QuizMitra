// routes/quizAttempt.routes.js
import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    submitQuizAnswers,
    getMyQuizResult,
    getQuizReport,
    getStudentQuizHistory,
    getAttemptDetails,
    disputeQuizResult,
    bulkGradeAttempts,
    getGradingHistory,
    manualGradeAttempt,
    getMyPerformance,
    getStudentPerformanceForFaculty,
} from "../controllers/quizAttempt.controller.js"

const router = Router()
router.use(verifyJWT)

// Quiz attempt submission
router.route("/quiz/:quizId/submit").post(submitQuizAnswers)

// Student routes
router.route("/quiz/:quizId/my-result").get(getMyQuizResult)
router.route("/my-history").get(getStudentQuizHistory)
router.route("/:attemptId/dispute").post(disputeQuizResult)
router.route("/performance/me").get(getMyPerformance)

// Faculty routes (reports and grading)
router.route("/quiz/:quizId/report").get(getQuizReport)
router.route("/quiz/:quizId/bulk-grade").patch(bulkGradeAttempts)
router.route("/:attemptId/manual-grade").patch(manualGradeAttempt)
router.route("/:attemptId/details").get(getAttemptDetails)
router.route("/:attemptId/grading-history").get(getGradingHistory)
router
    .route("/performance/student/:studentId")
    .get(getStudentPerformanceForFaculty)

export default router
