import { QuizAttempt } from "../models/quizAttempt.model.js"
import { Quiz } from "../models/quiz.model.js"
import { Class } from "../models/class.model.js"
import { User } from "../models/user.model.js"
import { ApiResponse, ApiError, asyncHandler } from "../utils/index.js"
import mongoose from "mongoose"

// Submit quiz answers and calculate score
const submitQuizAnswers = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const { answers, startedAt, timeSpent } = req.body

    // ✅ Validate input
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
        throw new ApiError(400, "Quiz answers are required")
    }

    if (!startedAt || !timeSpent) {
        throw new ApiError(400, "Start time and time spent are required")
    }

    // ✅ Get quiz with questions
    const quiz = await Quiz.findById(quizId).populate(
        "classId",
        "faculty students isArchived"
    )

    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (quiz.status !== "published") {
        throw new ApiError(400, "Quiz is not published")
    }

    // ✅ Check if quiz is active
    const now = new Date()
    if (now < quiz.scheduledAt || now > quiz.deadline) {
        throw new ApiError(400, "Quiz is not currently active")
    }

    // ✅ Get class document for access control
    const classDoc = await Class.findById(quiz.classId)
    if (!classDoc.isStudent(req.user._id)) {
        throw new ApiError(403, "You are not enrolled in this class")
    }

    // ✅ Check if student has already attempted this quiz
    const existingAttempt = await QuizAttempt.findOne({
        student: req.user._id,
        quiz: quizId,
    })

    if (existingAttempt) {
        throw new ApiError(400, "You have already attempted this quiz")
    }

    // ✅ Validate time constraints
    const maxDuration = quiz.duration * 60 // Convert minutes to seconds
    const submissionTime = new Date()
    const actualTimeSpent = Math.floor(
        (submissionTime - new Date(startedAt)) / 1000
    )

    if (actualTimeSpent > maxDuration + 30) {
        // 30 seconds grace period
        throw new ApiError(400, "Time limit exceeded")
    }

    // ✅ Check if late submission
    const isLateSubmission = submissionTime > quiz.deadline

    // ✅ Process and score answers
    const scoringResults = await processQuizAnswers(
        quiz,
        answers,
        actualTimeSpent
    )

    // ✅ Create quiz attempt record
    const quizAttempt = new QuizAttempt({
        student: req.user._id,
        quiz: quizId,
        class: quiz.classId,
        startedAt: new Date(startedAt),
        submittedAt: submissionTime,
        timeSpent: actualTimeSpent,
        answers: scoringResults.processedAnswers,
        totalQuestions: quiz.questions.length,
        correctAnswers: scoringResults.correctCount,
        incorrectAnswers: quiz.questions.length - scoringResults.correctCount,
        marksObtained: scoringResults.totalMarks,
        maxMarks: quiz.requirements.totalMarks,
        percentage:
            (scoringResults.totalMarks / quiz.requirements.totalMarks) * 100,
        isLateSubmission,
        wasTimeExceeded: actualTimeSpent > maxDuration,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
    })

    await quizAttempt.save()

    // ✅ Populate student and quiz details for response
    await quizAttempt.populate([
        { path: "student", select: "fullName studentId" },
        { path: "quiz", select: "title requirements.totalMarks" },
    ])

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                attemptId: quizAttempt._id,
                marksObtained: quizAttempt.marksObtained,
                maxMarks: quizAttempt.maxMarks,
                percentage: quizAttempt.percentage,
                grade: quizAttempt.calculateGrade(),
                isPassed: quizAttempt.isPassed(),
                correctAnswers: quizAttempt.correctAnswers,
                totalQuestions: quizAttempt.totalQuestions,
                timeSpent: quizAttempt.timeSpent,
                submittedAt: quizAttempt.submittedAt,
            },
            "Quiz submitted and scored successfully"
        )
    )
})

// Get student's own quiz results
const getMyQuizResult = asyncHandler(async (req, res) => {
    const { quizId } = req.params

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    const attempt = await QuizAttempt.findOne({
        student: req.user._id,
        quiz: quizId,
    }).populate([
        { path: "quiz", select: "title requirements.totalMarks duration" },
        { path: "class", select: "subjectName subjectCode" },
    ])

    if (!attempt) {
        throw new ApiError(404, "No quiz attempt found")
    }

    // ✅ Detailed results for student
    const detailedResults = {
        _id: attempt._id,
        quiz: attempt.quiz,
        class: attempt.class,
        score: {
            marksObtained: attempt.marksObtained,
            maxMarks: attempt.maxMarks,
            percentage: attempt.percentage,
            grade: attempt.calculateGrade(),
            isPassed: attempt.isPassed(),
        },
        performance: {
            correctAnswers: attempt.correctAnswers,
            incorrectAnswers: attempt.incorrectAnswers,
            totalQuestions: attempt.totalQuestions,
            accuracy: (
                (attempt.correctAnswers / attempt.totalQuestions) *
                100
            ).toFixed(2),
        },
        timing: {
            timeSpent: attempt.timeSpent,
            submittedAt: attempt.submittedAt,
            isLateSubmission: attempt.isLateSubmission,
            wasTimeExceeded: attempt.wasTimeExceeded,
        },
        answers: attempt.answers, // Full answer details for review
        status: attempt.status,
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                detailedResults,
                "Quiz results retrieved successfully"
            )
        )
})

// Get quiz report for faculty (all students' performance)
const getQuizReport = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const { format = "summary", sortBy = "marks", order = "desc" } = req.query

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    // ✅ Get quiz and verify faculty access
    const quiz = await Quiz.findById(quizId).populate("classId")
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    // ✅ Check if user is faculty of this class
    if (!quiz.classId.isFaculty(req.user._id)) {
        throw new ApiError(403, "Only class faculty can view quiz reports")
    }

    // ✅ Build aggregation pipeline for comprehensive report
    const pipeline = [
        {
            $match: { quiz: new mongoose.Types.ObjectId(quizId) },
        },

        // Populate student details
        {
            $lookup: {
                from: "users",
                localField: "student",
                foreignField: "_id",
                as: "studentDetails",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            studentId: 1,
                            email: 1,
                        },
                    },
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
                isPassed: { $gte: ["$percentage", 60] },
            },
        },

        // Sort based on query parameters
        {
            $sort: {
                [sortBy === "marks"
                    ? "marksObtained"
                    : sortBy === "name"
                      ? "studentDetails.fullName"
                      : sortBy === "time"
                        ? "timeSpent"
                        : "marksObtained"]: order === "asc" ? 1 : -1,
            },
        },
    ]

    // ✅ Execute aggregation
    const attempts = await QuizAttempt.aggregate(pipeline)

    // ✅ Calculate class statistics
    const stats = await QuizAttempt.aggregate([
        { $match: { quiz: new mongoose.Types.ObjectId(quizId) } },
        {
            $group: {
                _id: null,
                totalStudents: { $sum: 1 },
                averageScore: { $avg: "$marksObtained" },
                averagePercentage: { $avg: "$percentage" },
                highestScore: { $max: "$marksObtained" },
                lowestScore: { $min: "$marksObtained" },
                passedStudents: {
                    $sum: { $cond: [{ $gte: ["$percentage", 60] }, 1, 0] },
                },
                averageTimeSpent: { $avg: "$timeSpent" },
                lateSubmissions: {
                    $sum: { $cond: ["$isLateSubmission", 1, 0] },
                },
            },
        },
    ])

    const classStats = stats[0] || {
        totalStudents: 0,
        averageScore: 0,
        averagePercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        passedStudents: 0,
        averageTimeSpent: 0,
        lateSubmissions: 0,
    }

    // ✅ Question-wise analysis
    let questionAnalysis = null
    if (format === "detailed") {
        questionAnalysis = await getQuestionWiseAnalysis(quizId)
    }

    // ✅ Prepare response based on format
    const reportData = {
        quiz: {
            _id: quiz._id,
            title: quiz.title,
            totalQuestions: quiz.questions.length,
            maxMarks: quiz.requirements.totalMarks,
            duration: quiz.duration,
        },
        classStats: {
            ...classStats,
            passRate:
                classStats.totalStudents > 0
                    ? (
                          (classStats.passedStudents /
                              classStats.totalStudents) *
                          100
                      ).toFixed(2)
                    : 0,
        },
        studentResults:
            format === "summary"
                ? attempts.map((attempt) => ({
                      student: attempt.studentDetails,
                      marksObtained: attempt.marksObtained,
                      percentage: attempt.percentage.toFixed(2),
                      grade: attempt.grade,
                      isPassed: attempt.isPassed,
                      timeSpent: Math.floor(attempt.timeSpent / 60), // in minutes
                      submittedAt: attempt.submittedAt,
                      isLateSubmission: attempt.isLateSubmission,
                  }))
                : attempts,
        questionAnalysis,
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                reportData,
                "Quiz report generated successfully"
            )
        )
})

// Get all quiz attempts for a student (student's quiz history)
const getStudentQuizHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, classId } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // ✅ Build match conditions
    const matchConditions = { student: req.user._id }
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
        matchConditions.class = new mongoose.Types.ObjectId(classId)
    }

    const pipeline = [
        { $match: matchConditions },

        // Populate quiz and class details
        {
            $lookup: {
                from: "quizzes",
                localField: "quiz",
                foreignField: "_id",
                as: "quizDetails",
                pipeline: [
                    { $project: { title: 1, requirements: 1, duration: 1 } },
                ],
            },
        },

        {
            $lookup: {
                from: "classes",
                localField: "class",
                foreignField: "_id",
                as: "classDetails",
                pipeline: [{ $project: { subjectName: 1, subjectCode: 1 } }],
            },
        },

        // Add computed fields
        {
            $addFields: {
                quizDetails: { $first: "$quizDetails" },
                classDetails: { $first: "$classDetails" },
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
                isPassed: { $gte: ["$percentage", 60] },
            },
        },

        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },

        // Project final structure
        {
            $project: {
                _id: 1,
                quizDetails: 1,
                classDetails: 1,
                marksObtained: 1,
                maxMarks: 1,
                percentage: { $round: ["$percentage", 2] },
                grade: 1,
                isPassed: 1,
                correctAnswers: 1,
                totalQuestions: 1,
                timeSpent: 1,
                submittedAt: 1,
                isLateSubmission: 1,
                status: 1,
            },
        },
    ]

    const attempts = await QuizAttempt.aggregate(pipeline)
    const totalCount = await QuizAttempt.countDocuments(matchConditions)

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
            },
            "Quiz history retrieved successfully"
        )
    )
})

// Get attempt details (for results page)
const getAttemptDetails = asyncHandler(async (req, res) => {
    const { attemptId } = req.params

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
        throw new ApiError(400, "Invalid attempt ID")
    }

    const attempt = await QuizAttempt.findById(attemptId).populate([
        { path: "student", select: "fullName studentId email" },
        { path: "quiz", select: "title requirements duration" },
        { path: "class", select: "subjectName subjectCode faculty" },
    ])

    if (!attempt) {
        throw new ApiError(404, "Quiz attempt not found")
    }

    // ✅ Check access permissions
    const isStudent = attempt.student._id.toString() === req.user._id.toString()
    const isFaculty =
        attempt.class.faculty.toString() === req.user._id.toString()

    if (!isStudent && !isFaculty) {
        throw new ApiError(403, "Access denied")
    }

    // ✅ Return detailed results
    const detailedResults = attempt.getDetailedSummary()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                ...detailedResults,
                student: attempt.student,
                quiz: attempt.quiz,
                class: attempt.class,
                answers: attempt.answers,
                facultyFeedback: attempt.facultyFeedback,
            },
            "Attempt details retrieved successfully"
        )
    )
})

// Dispute quiz result (student only)
const disputeQuizResult = asyncHandler(async (req, res) => {
    const { attemptId } = req.params
    const { reason } = req.body

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
        throw new ApiError(400, "Invalid attempt ID")
    }

    if (!reason || reason.trim().length === 0) {
        throw new ApiError(400, "Dispute reason is required")
    }

    const attempt = await QuizAttempt.findById(attemptId)

    if (!attempt) {
        throw new ApiError(404, "Quiz attempt not found")
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only dispute your own quiz attempts")
    }

    if (attempt.isDisputed) {
        throw new ApiError(400, "This quiz has already been disputed")
    }

    // ✅ Mark as disputed
    attempt.isDisputed = true
    attempt.disputeReason = reason.trim()
    attempt.disputeSubmittedAt = new Date()

    await attempt.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                isDisputed: true,
                disputeSubmittedAt: attempt.disputeSubmittedAt,
            },
            "Quiz result dispute submitted successfully"
        )
    )
})

// ✅ Helper function to process quiz answers
const processQuizAnswers = async (quiz, submittedAnswers, timeSpent) => {
    const processedAnswers = []
    let correctCount = 0
    let totalMarks = 0

    for (let i = 0; i < quiz.questions.length; i++) {
        const question = quiz.questions[i]
        const submittedAnswer = submittedAnswers.find(
            (ans) => ans.questionIndex === i
        )

        if (!submittedAnswer) {
            throw new ApiError(400, `Answer for question ${i + 1} is missing`)
        }

        const isCorrect =
            question.correctAnswer === submittedAnswer.selectedAnswer
        const marksForQuestion = isCorrect
            ? quiz.requirements.marksPerQuestion
            : 0

        if (isCorrect) correctCount++
        totalMarks += marksForQuestion

        processedAnswers.push({
            questionIndex: i,
            questionText: question.questionText,
            selectedAnswer: submittedAnswer.selectedAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect,
            marksAwarded: marksForQuestion,
            maxMarks: quiz.requirements.marksPerQuestion,
            timeSpent: submittedAnswer.timeSpent || 0,
        })
    }

    return {
        processedAnswers,
        correctCount,
        totalMarks,
    }
}

// ✅ Helper function for question-wise analysis
const getQuestionWiseAnalysis = async (quizId) => {
    const pipeline = [
        { $match: { quiz: new mongoose.Types.ObjectId(quizId) } },
        { $unwind: "$answers" },
        {
            $group: {
                _id: "$answers.questionIndex",
                questionText: { $first: "$answers.questionText" },
                correctAnswer: { $first: "$answers.correctAnswer" },
                totalAttempts: { $sum: 1 },
                correctAttempts: {
                    $sum: { $cond: ["$answers.isCorrect", 1, 0] },
                },
                averageTimeSpent: { $avg: "$answers.timeSpent" },
                selectedAnswers: {
                    $push: "$answers.selectedAnswer",
                },
            },
        },
        {
            $addFields: {
                successRate: {
                    $multiply: [
                        { $divide: ["$correctAttempts", "$totalAttempts"] },
                        100,
                    ],
                },
                difficulty: {
                    $switch: {
                        branches: [
                            {
                                case: { $gte: ["$successRate", 80] },
                                then: "Easy",
                            },
                            {
                                case: { $gte: ["$successRate", 50] },
                                then: "Medium",
                            },
                        ],
                        default: "Hard",
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
    ]

    return await QuizAttempt.aggregate(pipeline)
}

// ✅ Bulk grade multiple attempts
const bulkGradeAttempts = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const { grades, action = "update" } = req.body

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
        throw new ApiError(400, "Grades array is required")
    }

    // ✅ Verify quiz exists and user has access
    const quiz = await Quiz.findById(quizId).populate("classId")
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (!quiz.classId.isFaculty(req.user._id)) {
        throw new ApiError(403, "Only quiz faculty can grade attempts")
    }

    const results = {
        updated: 0,
        failed: 0,
        errors: [],
    }

    // ✅ Process each grade update
    for (const gradeData of grades) {
        const { attemptId, marksObtained, feedback, adjustments } = gradeData

        try {
            if (!mongoose.Types.ObjectId.isValid(attemptId)) {
                results.failed++
                results.errors.push({ attemptId, error: "Invalid attempt ID" })
                continue
            }

            const attempt = await QuizAttempt.findOne({
                _id: attemptId,
                quiz: quizId,
            })

            if (!attempt) {
                results.failed++
                results.errors.push({ attemptId, error: "Attempt not found" })
                continue
            }

            // ✅ Store original values for history
            const originalMarks = attempt.marksObtained
            const originalPercentage = attempt.percentage

            // ✅ Update marks if provided
            if (marksObtained !== undefined) {
                attempt.marksObtained = Math.max(
                    0,
                    Math.min(marksObtained, attempt.maxMarks)
                )
                attempt.percentage =
                    (attempt.marksObtained / attempt.maxMarks) * 100
            }

            // ✅ Add faculty feedback
            if (feedback || adjustments) {
                if (!attempt.facultyFeedback) {
                    attempt.facultyFeedback = []
                }

                attempt.facultyFeedback.push({
                    faculty: req.user._id,
                    feedback: feedback || "Grade adjusted",
                    marksAdjustment:
                        marksObtained !== undefined
                            ? marksObtained - originalMarks
                            : 0,
                    adjustmentReason:
                        adjustments?.reason || "Bulk grade update",
                    adjustedAt: new Date(),
                })
            }

            // ✅ Update grading history
            if (!attempt.gradingHistory) {
                attempt.gradingHistory = []
            }

            attempt.gradingHistory.push({
                gradedBy: req.user._id,
                action: "bulk_update",
                previousMarks: originalMarks,
                newMarks: attempt.marksObtained,
                previousPercentage: originalPercentage,
                newPercentage: attempt.percentage,
                reason: adjustments?.reason || "Bulk grade update",
                gradedAt: new Date(),
            })

            await attempt.save()
            results.updated++
        } catch (error) {
            results.failed++
            results.errors.push({
                attemptId: gradeData.attemptId,
                error: error.message,
            })
        }
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                summary: {
                    total: grades.length,
                    updated: results.updated,
                    failed: results.failed,
                },
                errors: results.errors,
            },
            `Bulk grading completed. ${results.updated} attempts updated, ${results.failed} failed.`
        )
    )
})

// ✅ Get grading history for an attempt
const getGradingHistory = asyncHandler(async (req, res) => {
    const { attemptId } = req.params

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
        throw new ApiError(400, "Invalid attempt ID")
    }

    const attempt = await QuizAttempt.findById(attemptId).populate([
        { path: "student", select: "fullName studentId email" },
        { path: "quiz", select: "title" },
        { path: "class", select: "subjectName subjectCode faculty" },
    ])

    if (!attempt) {
        throw new ApiError(404, "Quiz attempt not found")
    }

    // ✅ Check access permissions
    const isStudent = attempt.student._id.toString() === req.user._id.toString()
    const isFaculty =
        attempt.class.faculty.toString() === req.user._id.toString()

    if (!isStudent && !isFaculty) {
        throw new ApiError(403, "Access denied")
    }

    // ✅ Populate grading history with faculty details
    await attempt.populate("gradingHistory.gradedBy", "fullName facultyId")
    await attempt.populate("facultyFeedback.faculty", "fullName facultyId")

    // ✅ Format the response
    const history = {
        attempt: {
            _id: attempt._id,
            currentMarks: attempt.marksObtained,
            currentPercentage: attempt.percentage,
            maxMarks: attempt.maxMarks,
            submittedAt: attempt.submittedAt,
            student: attempt.student,
            quiz: attempt.quiz,
        },
        gradingHistory:
            attempt.gradingHistory?.map((entry) => ({
                _id: entry._id,
                gradedBy: entry.gradedBy,
                action: entry.action,
                previousMarks: entry.previousMarks,
                newMarks: entry.newMarks,
                previousPercentage: entry.previousPercentage,
                newPercentage: entry.newPercentage,
                reason: entry.reason,
                gradedAt: entry.gradedAt,
                marksChange: entry.newMarks - entry.previousMarks,
                percentageChange:
                    entry.newPercentage - entry.previousPercentage,
            })) || [],
        facultyFeedback:
            attempt.facultyFeedback?.map((feedback) => ({
                _id: feedback._id,
                faculty: feedback.faculty,
                feedback: feedback.feedback,
                marksAdjustment: feedback.marksAdjustment,
                adjustmentReason: feedback.adjustmentReason,
                adjustedAt: feedback.adjustedAt,
            })) || [],
        summary: {
            totalAdjustments: attempt.gradingHistory?.length || 0,
            totalFeedback: attempt.facultyFeedback?.length || 0,
            lastModified: attempt.updatedAt,
            originalScore:
                attempt.gradingHistory?.[0]?.previousMarks ||
                attempt.marksObtained,
        },
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                history,
                "Grading history retrieved successfully"
            )
        )
})

// ✅ Manual grade individual attempt (bonus function)
const manualGradeAttempt = asyncHandler(async (req, res) => {
    const { attemptId } = req.params
    const { marksObtained, feedback, questionGrades, reason } = req.body

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
        throw new ApiError(400, "Invalid attempt ID")
    }

    const attempt = await QuizAttempt.findById(attemptId).populate([
        { path: "quiz", populate: { path: "classId", select: "faculty" } },
        { path: "student", select: "fullName studentId" },
    ])

    if (!attempt) {
        throw new ApiError(404, "Quiz attempt not found")
    }

    // ✅ Check faculty permission
    if (!attempt.quiz.classId.isFaculty(req.user._id)) {
        throw new ApiError(403, "Only quiz faculty can grade attempts")
    }

    // ✅ Store original values
    const originalMarks = attempt.marksObtained
    const originalPercentage = attempt.percentage

    // ✅ Update overall marks if provided
    if (marksObtained !== undefined) {
        if (marksObtained < 0 || marksObtained > attempt.maxMarks) {
            throw new ApiError(
                400,
                `Marks must be between 0 and ${attempt.maxMarks}`
            )
        }
        attempt.marksObtained = marksObtained
        attempt.percentage = (marksObtained / attempt.maxMarks) * 100
    }

    // ✅ Update individual question grades if provided
    if (questionGrades && Array.isArray(questionGrades)) {
        questionGrades.forEach((qGrade) => {
            const answerIndex = attempt.answers.findIndex(
                (a) => a.questionIndex === qGrade.questionIndex
            )
            if (answerIndex !== -1) {
                attempt.answers[answerIndex].marksAwarded = qGrade.marksAwarded
                attempt.answers[answerIndex].manuallyGraded = true
                attempt.answers[answerIndex].gradingNotes = qGrade.notes
            }
        })

        // ✅ Recalculate total if individual questions were graded
        const newTotal = attempt.answers.reduce(
            (sum, answer) => sum + answer.marksAwarded,
            0
        )
        attempt.marksObtained = newTotal
        attempt.percentage = (newTotal / attempt.maxMarks) * 100
    }

    // ✅ Add faculty feedback
    if (!attempt.facultyFeedback) {
        attempt.facultyFeedback = []
    }

    attempt.facultyFeedback.push({
        faculty: req.user._id,
        feedback: feedback || "Manually graded",
        marksAdjustment: attempt.marksObtained - originalMarks,
        adjustmentReason: reason || "Manual grading",
        adjustedAt: new Date(),
    })

    // ✅ Add to grading history
    if (!attempt.gradingHistory) {
        attempt.gradingHistory = []
    }

    attempt.gradingHistory.push({
        gradedBy: req.user._id,
        action: "manual_grade",
        previousMarks: originalMarks,
        newMarks: attempt.marksObtained,
        previousPercentage: originalPercentage,
        newPercentage: attempt.percentage,
        reason: reason || "Manual grading",
        gradedAt: new Date(),
    })

    await attempt.save()

    // ✅ Populate for response
    await attempt.populate("facultyFeedback.faculty", "fullName facultyId")

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                attempt: {
                    _id: attempt._id,
                    marksObtained: attempt.marksObtained,
                    percentage: attempt.percentage,
                    grade: attempt.calculateGrade(),
                    isPassed: attempt.isPassed(),
                },
                changes: {
                    marksChange: attempt.marksObtained - originalMarks,
                    percentageChange: attempt.percentage - originalPercentage,
                },
                latestFeedback:
                    attempt.facultyFeedback[attempt.facultyFeedback.length - 1],
            },
            "Attempt graded successfully"
        )
    )
})

// ✅ Update the export statement
export {
    submitQuizAnswers,
    getMyQuizResult,
    getQuizReport,
    getStudentQuizHistory,
    getAttemptDetails,
    disputeQuizResult,
    bulkGradeAttempts,
    getGradingHistory,
    manualGradeAttempt,
}
