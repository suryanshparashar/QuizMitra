import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    getStudentAttemptForReview,
    updateQuestionMarks,
    updateAttemptMarks,
    getPendingAttempts,
    addFacultyFeedback,
} from "../controllers/quizGrading.controller.js"

const router = Router()
router.use(verifyJWT)

// Manual grading routes (Faculty only)
router.route("/quiz/:quizId/pending-attempts").get(getPendingAttempts)
router.route("/quiz/:quizId/student/:studentId/review").get(getStudentAttemptForReview)

// Update marks routes
router.route("/attempt/:attemptId/question/:questionIndex/marks").patch(updateQuestionMarks)
router.route("/attempt/:attemptId/bulk-update").patch(updateAttemptMarks)

// Feedback and history
router.route("/attempt/:attemptId/feedback").post(addFacultyFeedback)

export default router
