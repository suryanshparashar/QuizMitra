// routes/quiz.routes.js
import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"
import {
    generateQuiz,
    getQuiz,
    publishQuiz,
    getUserQuizzes,
    getStudentQuizzes,
    deleteQuiz,
    updateQuiz,
    duplicateQuiz,
    getClassQuizzes,
    getQuizPreview,
    getQuizStatistics,
    exportQuizData,
    unpublishQuiz,
    // getQuizTemplates,
    // bulkQuizOperations,
} from "../controllers/quiz.controller.js"

const router = Router()
router.use(verifyJWT)

// Quiz creation and management
router.route("/generate").post(upload.single("pdf"), generateQuiz)

// router.route("/create-manual").post(createQuizManual) // Manual quiz creation
router.route("/my-quizzes").get(getUserQuizzes) // User's created quizzes
router.route("/student/quizzes").get(getStudentQuizzes) // Student's assigned quizzes
router.route("/class/:classId/quizzes").get(getClassQuizzes) // Class quizzes

// Individual quiz operations
router.route("/:quizId").get(getQuiz) // Get quiz details
router.route("/:quizId").patch(updateQuiz) // Update quiz
router.route("/:quizId").delete(deleteQuiz) // Delete quiz

router.route("/:quizId/publish").patch(publishQuiz) // Publish quiz
router.route("/:quizId/unpublish").patch(unpublishQuiz) // Unpublish quiz
router.route("/:quizId/duplicate").post(duplicateQuiz) // Duplicate quiz
router.route("/:quizId/preview").get(getQuizPreview) // Preview for faculty

// Quiz analytics and stats
router.route("/:quizId/statistics").get(getQuizStatistics) // Quiz stats
router.route("/:quizId/export").get(exportQuizData) // Export quiz data

// Quiz templates and bulk operations
// router.route("/templates").get(getQuizTemplates) // Quiz templates
// router.route("/bulk-operations").post(bulkQuizOperations) // Bulk actions

export default router
