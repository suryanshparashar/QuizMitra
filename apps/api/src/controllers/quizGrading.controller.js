import { QuizAttempt } from "../models/quizAttempt.model.js"
import { Quiz } from "../models/quiz.model.js"
import { Class } from "../models/class.model.js"
import { User } from "../models/user.model.js"
import { ApiResponse, ApiError, asyncHandler } from "../utils/index.js"
import mongoose from "mongoose"

// Get student attempt for manual review/grading (Faculty only)
const getStudentAttemptForReview = asyncHandler(async (req, res) => {
    const { quizId, studentId } = req.params

    // ✅ Validate input
    if (
        !mongoose.Types.ObjectId.isValid(quizId) ||
        !mongoose.Types.ObjectId.isValid(studentId)
    ) {
        throw new ApiError(400, "Invalid quiz or student ID")
    }

    // ✅ Get quiz and verify faculty access
    const quiz = await Quiz.findById(quizId).populate("classId")
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (!quiz.classId.isFaculty(req.user._id)) {
        throw new ApiError(
            403,
            "Only class faculty can review student attempts"
        )
    }

    // ✅ Get student attempt with full details
    const attempt = await QuizAttempt.findOne({
        student: studentId,
        quiz: quizId,
    }).populate([
        { path: "student", select: "fullName studentId email" },
        { path: "quiz", select: "title questions requirements" },
    ])

    if (!attempt) {
        throw new ApiError(404, "Student attempt not found")
    }

    // ✅ Prepare detailed review data
    const reviewData = {
        _id: attempt._id,
        student: attempt.student,
        quiz: {
            _id: attempt.quiz._id,
            title: attempt.quiz.title,
            totalQuestions: attempt.quiz.questions.length,
            maxMarks: attempt.quiz.requirements.totalMarks,
        },
        attempt: {
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            timeSpent: attempt.timeSpent,
            isLateSubmission: attempt.isLateSubmission,
            status: attempt.status,
        },
        currentScoring: {
            marksObtained: attempt.marksObtained,
            maxMarks: attempt.maxMarks,
            percentage: attempt.percentage,
            correctAnswers: attempt.correctAnswers,
            incorrectAnswers: attempt.incorrectAnswers,
        },
        questionReview: attempt.answers.map((answer, index) => ({
            questionIndex: answer.questionIndex,
            questionText: answer.questionText,
            studentAnswer: answer.selectedAnswer,
            correctAnswer: answer.correctAnswer,
            isCurrentlyCorrect: answer.isCorrect,
            currentMarks: answer.marksAwarded,
            maxMarksForQuestion: answer.maxMarks,
            timeSpentOnQuestion: answer.timeSpent,
            // Add original question options for context
            questionOptions: attempt.quiz.questions[index]?.options || [],
        })),
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                reviewData,
                "Student attempt retrieved for review"
            )
        )
})

// Update individual question marks (Manual grading)
const updateQuestionMarks = asyncHandler(async (req, res) => {
    const { attemptId, questionIndex } = req.params
    const { marksAwarded, feedback, isCorrect } = req.body

    // ✅ Validate input
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
        throw new ApiError(400, "Invalid attempt ID")
    }

    if (marksAwarded === undefined || marksAwarded < 0) {
        throw new ApiError(400, "Valid marks awarded is required")
    }

    const qIndex = parseInt(questionIndex)
    if (isNaN(qIndex) || qIndex < 0) {
        throw new ApiError(400, "Valid question index is required")
    }

    // ✅ Get attempt and verify faculty access
    const attempt = await QuizAttempt.findById(attemptId).populate({
        path: "quiz",
        populate: { path: "classId", select: "faculty" },
    })

    if (!attempt) {
        throw new ApiError(404, "Quiz attempt not found")
    }

    if (!attempt.quiz.classId.isFaculty(req.user._id)) {
        throw new ApiError(403, "Only class faculty can update marks")
    }

    // ✅ Find the specific answer to update
    const answerToUpdate = attempt.answers.find(
        (ans) => ans.questionIndex === qIndex
    )
    if (!answerToUpdate) {
        throw new ApiError(404, "Question answer not found")
    }

    // ✅ Validate marks don't exceed maximum
    if (marksAwarded > answerToUpdate.maxMarks) {
        throw new ApiError(
            400,
            `Marks cannot exceed maximum marks (${answerToUpdate.maxMarks})`
        )
    }

    // ✅ Update the specific answer
    const oldMarks = answerToUpdate.marksAwarded
    answerToUpdate.marksAwarded = marksAwarded
    answerToUpdate.isCorrect =
        isCorrect !== undefined ? isCorrect : marksAwarded > 0

    if (feedback) {
        answerToUpdate.feedback = feedback.trim()
    }

    // ✅ Recalculate total marks and statistics
    const totalMarks = attempt.answers.reduce(
        (sum, ans) => sum + ans.marksAwarded,
        0
    )
    const correctCount = attempt.answers.filter((ans) => ans.isCorrect).length

    attempt.marksObtained = totalMarks
    attempt.correctAnswers = correctCount
    attempt.incorrectAnswers = attempt.totalQuestions - correctCount
    attempt.percentage = (totalMarks / attempt.maxMarks) * 100
    attempt.status = "reviewed" // Mark as manually reviewed

    // ✅ Add grading history
    if (!attempt.gradingHistory) {
        attempt.gradingHistory = []
    }

    attempt.gradingHistory.push({
        questionIndex: qIndex,
        oldMarks,
        newMarks: marksAwarded,
        gradedBy: req.user._id,
        gradedAt: new Date(),
        reason: feedback || "Manual grading adjustment",
    })

    await attempt.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                attemptId: attempt._id,
                questionIndex: qIndex,
                oldMarks,
                newMarks: marksAwarded,
                totalMarks: attempt.marksObtained,
                percentage: attempt.percentage.toFixed(2),
                newGrade: attempt.calculateGrade(),
            },
            "Question marks updated successfully"
        )
    )
})

// Bulk update marks for entire quiz attempt
const updateAttemptMarks = asyncHandler(async (req, res) => {
    const { attemptId } = req.params
    const { questionUpdates, generalFeedback } = req.body

    // ✅ Validate input
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
        throw new ApiError(400, "Invalid attempt ID")
    }

    if (!Array.isArray(questionUpdates) || questionUpdates.length === 0) {
        throw new ApiError(400, "Question updates array is required")
    }

    // ✅ Get attempt and verify faculty access
    const attempt = await QuizAttempt.findById(attemptId)
        .populate({
            path: "quiz",
            populate: { path: "classId", select: "faculty" },
        })
        .populate("student", "fullName studentId")

    if (!attempt) {
        throw new ApiError(404, "Quiz attempt not found")
    }

    if (!attempt.quiz.classId.isFaculty(req.user._id)) {
        throw new ApiError(403, "Only class faculty can update marks")
    }

    // ✅ Validate and process updates
    const updateSummary = []
    let totalNewMarks = 0

    for (const update of questionUpdates) {
        const { questionIndex, marksAwarded, isCorrect, feedback } = update

        // Validate question index
        const answerToUpdate = attempt.answers.find(
            (ans) => ans.questionIndex === questionIndex
        )
        if (!answerToUpdate) {
            throw new ApiError(400, `Invalid question index: ${questionIndex}`)
        }

        // Validate marks
        if (marksAwarded < 0 || marksAwarded > answerToUpdate.maxMarks) {
            throw new ApiError(
                400,
                `Invalid marks for question ${questionIndex + 1}. Must be between 0 and ${answerToUpdate.maxMarks}`
            )
        }

        // Store old marks for history
        const oldMarks = answerToUpdate.marksAwarded

        // Update answer
        answerToUpdate.marksAwarded = marksAwarded
        answerToUpdate.isCorrect =
            isCorrect !== undefined ? isCorrect : marksAwarded > 0

        if (feedback) {
            answerToUpdate.feedback = feedback.trim()
        }

        updateSummary.push({
            questionIndex,
            questionText: answerToUpdate.questionText.substring(0, 50) + "...",
            oldMarks,
            newMarks: marksAwarded,
            change: marksAwarded - oldMarks,
        })

        totalNewMarks += marksAwarded
    }

    // ✅ Update overall attempt statistics
    const correctCount = attempt.answers.filter((ans) => ans.isCorrect).length
    const oldTotalMarks = attempt.marksObtained

    attempt.marksObtained = totalNewMarks
    attempt.correctAnswers = correctCount
    attempt.incorrectAnswers = attempt.totalQuestions - correctCount
    attempt.percentage = (totalNewMarks / attempt.maxMarks) * 100
    attempt.status = "reviewed"

    if (generalFeedback) {
        attempt.facultyFeedback = generalFeedback.trim()
    }

    // ✅ Add bulk grading history
    if (!attempt.gradingHistory) {
        attempt.gradingHistory = []
    }

    attempt.gradingHistory.push({
        type: "bulk_update",
        oldTotalMarks,
        newTotalMarks: totalNewMarks,
        questionsUpdated: questionUpdates.length,
        gradedBy: req.user._id,
        gradedAt: new Date(),
        reason: "Bulk manual grading",
    })

    await attempt.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                attemptId: attempt._id,
                student: attempt.student,
                summary: {
                    oldTotalMarks,
                    newTotalMarks: totalNewMarks,
                    change: totalNewMarks - oldTotalMarks,
                    oldPercentage: (
                        (oldTotalMarks / attempt.maxMarks) *
                        100
                    ).toFixed(2),
                    newPercentage: attempt.percentage.toFixed(2),
                    oldGrade: calculateGrade(
                        (oldTotalMarks / attempt.maxMarks) * 100
                    ),
                    newGrade: attempt.calculateGrade(),
                    questionsUpdated: questionUpdates.length,
                },
                questionUpdates: updateSummary,
            },
            "Quiz attempt marks updated successfully"
        )
    )
})

// Get all pending attempts for manual review
const getPendingAttempts = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const { status = "graded", page = 1, limit = 20 } = req.query

    // ✅ Validate quiz and faculty access
    const quiz = await Quiz.findById(quizId).populate("classId")
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (!quiz.classId.isFaculty(req.user._id)) {
        throw new ApiError(403, "Only class faculty can view pending attempts")
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    // ✅ Get attempts that need review
    const pipeline = [
        {
            $match: {
                quiz: new mongoose.Types.ObjectId(quizId),
                status: status, // 'graded' = auto-graded, 'reviewed' = manually reviewed
            },
        },

        // Populate student details
        {
            $lookup: {
                from: "users",
                localField: "student",
                foreignField: "_id",
                as: "studentDetails",
                pipeline: [
                    { $project: { fullName: 1, studentId: 1, email: 1 } },
                ],
            },
        },

        // Add computed fields
        {
            $addFields: {
                studentDetails: { $first: "$studentDetails" },
                grade: {
                    $switch: {
                        branches: [
                            { case: { $gte: ["$percentage", 90] }, then: "A+" },
                            { case: { $gte: ["$percentage", 80] }, then: "A" },
                            { case: { $gte: ["$percentage", 70] }, then: "B+" },
                            { case: { $gte: ["$percentage", 60] }, then: "B" },
                            { case: { $gte: ["$percentage", 50] }, then: "C" },
                            { case: { $gte: ["$percentage", 40] }, then: "D" },
                        ],
                        default: "F",
                    },
                },
                needsReview: {
                    $cond: [
                        {
                            $or: [
                                { $eq: ["$status", "graded"] },
                                { $lt: ["$percentage", 40] }, // Poor performance
                                { $eq: ["$isLateSubmission", true] },
                            ],
                        },
                        true,
                        false,
                    ],
                },
            },
        },

        { $sort: { submittedAt: 1 } }, // Oldest first for review
        { $skip: skip },
        { $limit: parseInt(limit) },

        // Project review-friendly structure
        {
            $project: {
                _id: 1,
                studentDetails: 1,
                marksObtained: 1,
                maxMarks: 1,
                percentage: { $round: ["$percentage", 2] },
                grade: 1,
                correctAnswers: 1,
                totalQuestions: 1,
                timeSpent: 1,
                submittedAt: 1,
                isLateSubmission: 1,
                wasTimeExceeded: 1,
                status: 1,
                needsReview: 1,
                lastGradedAt: { $last: "$gradingHistory.gradedAt" },
            },
        },
    ]

    const attempts = await QuizAttempt.aggregate(pipeline)
    const totalCount = await QuizAttempt.countDocuments({
        quiz: quizId,
        status: status,
    })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                attempts,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalAttempts: totalCount,
                    hasNextPage:
                        parseInt(page) <
                        Math.ceil(totalCount / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                },
                summary: {
                    totalPending: totalCount,
                    quizTitle: quiz.title,
                },
            },
            "Pending attempts retrieved successfully"
        )
    )
})

// Add faculty feedback to student attempt
const addFacultyFeedback = asyncHandler(async (req, res) => {
    const { attemptId } = req.params
    const { feedback, isPublic = true } = req.body

    // ✅ Validate input
    if (!feedback || feedback.trim().length === 0) {
        throw new ApiError(400, "Feedback content is required")
    }

    if (feedback.length > 1000) {
        throw new ApiError(400, "Feedback cannot exceed 1000 characters")
    }

    // ✅ Get attempt and verify faculty access
    const attempt = await QuizAttempt.findById(attemptId)
        .populate({
            path: "quiz",
            populate: { path: "classId", select: "faculty" },
        })
        .populate("student", "fullName studentId")

    if (!attempt) {
        throw new ApiError(404, "Quiz attempt not found")
    }

    if (!attempt.quiz.classId.isFaculty(req.user._id)) {
        throw new ApiError(403, "Only class faculty can add feedback")
    }

    // ✅ Add feedback
    attempt.facultyFeedback = feedback.trim()
    attempt.feedbackAddedBy = req.user._id
    attempt.feedbackAddedAt = new Date()
    attempt.isFeedbackPublic = isPublic
    attempt.status = "reviewed"

    await attempt.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                attemptId: attempt._id,
                student: attempt.student,
                feedback: attempt.facultyFeedback,
                isPublic,
                addedAt: attempt.feedbackAddedAt,
            },
            "Faculty feedback added successfully"
        )
    )
})

// Helper function for grade calculation
const calculateGrade = (percentage) => {
    if (percentage >= 90) return "A+"
    if (percentage >= 80) return "A"
    if (percentage >= 70) return "B+"
    if (percentage >= 60) return "B"
    if (percentage >= 50) return "C"
    if (percentage >= 40) return "D"
    return "F"
}

export {
    getStudentAttemptForReview,
    updateQuestionMarks,
    updateAttemptMarks,
    getPendingAttempts,
    addFacultyFeedback,
}
