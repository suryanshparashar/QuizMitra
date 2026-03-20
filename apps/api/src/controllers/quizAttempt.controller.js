import { QuizAttempt } from "../models/quizAttempt.model.js"
import { Quiz } from "../models/quiz.model.js"
import { Class } from "../models/class.model.js"
import { User } from "../models/user.model.js"
import { ApiResponse, ApiError, asyncHandler } from "../utils/index.js"
import { EvaluationService } from "../services/evaluation.service.js"
import { AdvisoryService } from "../services/advisory.service.js"
import { StudentPerformance } from "../models/studentPerformance.model.js"
import { QuizAttemptSession } from "../models/quizAttemptSession.model.js"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"

const ATTEMPT_TIMER_SECRET =
    process.env.QUIZ_ATTEMPT_TIMER_SECRET || process.env.ACCESS_TOKEN_SECRET

const createAttemptToken = ({ quizId, studentId, startedAt, expiresIn }) => {
    if (!ATTEMPT_TIMER_SECRET) {
        throw new ApiError(500, "Attempt timer secret is not configured")
    }

    return jwt.sign(
        {
            quizId: String(quizId),
            studentId: String(studentId),
            startedAt: new Date(startedAt).toISOString(),
            tokenType: "quiz-attempt-timer",
        },
        ATTEMPT_TIMER_SECRET,
        { expiresIn }
    )
}

const verifyAttemptToken = (token) => {
    if (!ATTEMPT_TIMER_SECRET) {
        throw new ApiError(500, "Attempt timer secret is not configured")
    }

    try {
        return jwt.verify(token, ATTEMPT_TIMER_SECRET)
    } catch (error) {
        throw new ApiError(401, "Invalid or expired attempt timer token")
    }
}

const toLegacyAdvisoryShape = (insights) => {
    return {
        strengths: Array.isArray(insights?.strongAreas)
            ? insights.strongAreas
            : [],
        weaknesses: Array.isArray(insights?.weakAreas)
            ? insights.weakAreas
            : [],
        recommendations: [
            ...(Array.isArray(insights?.improvementRoadmap)
                ? insights.improvementRoadmap
                : []),
            ...(Array.isArray(insights?.practiceGuide)
                ? insights.practiceGuide
                : []),
        ].slice(0, 6),
        motivationalMessage:
            insights?.summary || "Keep learning with consistent practice.",
    }
}

const updateStudentPerformanceInsights = async ({
    studentId,
    classId,
    quiz,
    quizAttempt,
    previousInsights,
    student,
}) => {
    const recentAttempts = await QuizAttempt.find({
        student: studentId,
        class: classId,
        status: { $in: ["submitted", "graded", "reviewed"] },
    })
        .populate({
            path: "quiz",
            select: "title questions.topic questions.difficulty questions.questionType",
        })
        .sort({ submittedAt: -1 })
        .limit(8)
        .select("quiz answers percentage submittedAt")
        .lean()

    const recentPerformances = recentAttempts.map((attemptDoc) => {
        const quizDoc = attemptDoc?.quiz || {}
        const quizQuestions = Array.isArray(quizDoc?.questions)
            ? quizDoc.questions
            : []

        const answers = Array.isArray(attemptDoc?.answers)
            ? attemptDoc.answers.map((ans) => {
                  const q = quizQuestions[ans.questionIndex] || {}
                  return {
                      topic: q.topic || q.difficulty || "General understanding",
                      questionType: q.questionType || "unknown",
                      marksAwarded: ans.marksAwarded,
                      maxMarks: ans.maxMarks,
                      correctnessScore: Number(ans.correctnessScore || 0),
                  }
              })
            : []

        return {
            quizTitle: quizDoc?.title || "Quiz",
            percentage: Number(attemptDoc?.percentage || 0),
            submittedAt: attemptDoc?.submittedAt,
            answers,
        }
    })

    const newInsights = await AdvisoryService.generatePerformanceInsights({
        quiz,
        attempt: {
            answers: quizAttempt.answers,
            marksObtained: quizAttempt.marksObtained,
            maxMarks: quizAttempt.maxMarks,
            percentage: quizAttempt.percentage,
        },
        student,
        previousInsights,
        recentPerformances,
    })

    const existingPerformance = await StudentPerformance.findOne({
        student: studentId,
        class: classId,
    })

    const previousHistory = Array.isArray(existingPerformance?.history)
        ? existingPerformance.history
        : []
    const updatedHistory = [
        ...previousHistory,
        {
            attempt: quizAttempt._id,
            quiz: quiz._id,
            score: quizAttempt.marksObtained,
            maxMarks: quizAttempt.maxMarks,
            percentage: quizAttempt.percentage,
            insightsSnapshot: newInsights,
            generatedAt: new Date(),
        },
    ]

    const attemptsCount = updatedHistory.length
    const averagePercentage =
        attemptsCount > 0
            ? updatedHistory.reduce(
                  (sum, item) => sum + Number(item.percentage || 0),
                  0
              ) / attemptsCount
            : 0
    const bestPercentage =
        attemptsCount > 0
            ? Math.max(
                  ...updatedHistory.map((item) => Number(item.percentage || 0))
              )
            : 0

    await StudentPerformance.findOneAndUpdate(
        { student: studentId, class: classId },
        {
            $set: {
                latestInsights: newInsights,
                stats: {
                    attemptsCount,
                    averagePercentage,
                    bestPercentage,
                    lastPercentage: Number(quizAttempt.percentage || 0),
                },
            },
            $push: {
                history: {
                    attempt: quizAttempt._id,
                    quiz: quiz._id,
                    score: quizAttempt.marksObtained,
                    maxMarks: quizAttempt.maxMarks,
                    percentage: quizAttempt.percentage,
                    insightsSnapshot: newInsights,
                    generatedAt: new Date(),
                },
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return newInsights
}

const getQuestionWiseVisibilityForStudent = (quiz) => {
    const settings = quiz?.settings || {}
    const releaseAfterDeadline =
        settings.releaseQuestionWiseAfterDeadline !== false
    const isPastDeadline =
        quiz?.deadline instanceof Date
            ? new Date() >= quiz.deadline
            : new Date() >= new Date(quiz?.deadline)

    const releaseGateOpen = releaseAfterDeadline ? isPastDeadline : true

    const canViewScores =
        releaseGateOpen && settings.allowQuestionWiseScores === true
    const canViewCorrectAnswers =
        releaseGateOpen && settings.allowQuestionWiseCorrectAnswers === true
    const canViewFeedback =
        releaseGateOpen && settings.allowQuestionWiseFeedback === true

    return {
        releaseAfterDeadline,
        releaseGateOpen,
        canViewScores,
        canViewCorrectAnswers,
        canViewFeedback,
        canViewAnyQuestionWise:
            canViewScores || canViewCorrectAnswers || canViewFeedback,
    }
}

const startQuizAttempt = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const { attemptToken } = req.body || {}

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

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

    const now = new Date()
    if (now < quiz.scheduledAt || now > quiz.deadline) {
        throw new ApiError(400, "Quiz is not currently active")
    }

    const classDoc = await Class.findById(quiz.classId)
    if (!classDoc || !classDoc.isStudent(req.user._id)) {
        throw new ApiError(403, "You are not enrolled in this class")
    }

    const existingAttempt = await QuizAttempt.findOne({
        student: req.user._id,
        quiz: quizId,
    }).lean()

    if (existingAttempt) {
        throw new ApiError(400, "Quiz already submitted")
    }

    let session = await QuizAttemptSession.findOne({
        student: req.user._id,
        quiz: quizId,
    })

    if (session && session.status !== "active") {
        throw new ApiError(400, "Quiz attempt session is no longer active")
    }

    if (session && now > session.expiresAt) {
        session.status = "expired"
        await session.save()
        throw new ApiError(400, "Quiz timer has expired")
    }

    if (attemptToken && session) {
        try {
            const decoded = verifyAttemptToken(attemptToken)
            const isTokenMatch =
                String(decoded.quizId) === String(quizId) &&
                String(decoded.studentId) === String(req.user._id)

            // Ignore stale/mismatched tokens and re-issue a fresh one below.
            if (!isTokenMatch) {
                // no-op
            }
        } catch (error) {
            // Ignore invalid/expired token and continue with session-based timer.
        }
    }

    if (!session) {
        const startedAt = now
        const durationMs = Number(quiz.duration || 0) * 60 * 1000
        const durationEnd = new Date(startedAt.getTime() + durationMs)
        const expiresAt =
            durationEnd < quiz.deadline ? durationEnd : new Date(quiz.deadline)

        session = await QuizAttemptSession.create({
            student: req.user._id,
            quiz: quiz._id,
            class: quiz.classId,
            startedAt,
            expiresAt,
            status: "active",
        })
    }

    const remainingSeconds = Math.max(
        0,
        Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000)
    )

    const attemptTokenExpiresIn = Math.max(1, remainingSeconds)
    const signedAttemptToken = createAttemptToken({
        quizId,
        studentId: req.user._id,
        startedAt: session.startedAt,
        expiresIn: attemptTokenExpiresIn,
    })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                attemptToken: signedAttemptToken,
                startedAt: session.startedAt,
                endsAt: session.expiresAt,
                serverNow: now,
                remainingSeconds,
            },
            "Quiz timer started"
        )
    )
})

// Submit quiz answers and calculate score
const submitQuizAnswers = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const {
        answers,
        attemptToken,
        forceDebar = false,
        debarReason = "",
    } = req.body

    const submittedAnswers = Array.isArray(answers) ? answers : []

    // ✅ Validate input
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    if (!forceDebar && submittedAnswers.length === 0) {
        throw new ApiError(400, "Quiz answers are required")
    }

    if (!attemptToken) {
        throw new ApiError(400, "Attempt timer token is required")
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
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    attemptId: existingAttempt._id,
                    marksObtained: existingAttempt.marksObtained,
                    maxMarks: existingAttempt.maxMarks,
                    percentage: existingAttempt.percentage,
                    grade: existingAttempt.calculateGrade(),
                    isPassed: existingAttempt.checkIfPassed(),
                    correctAnswers: existingAttempt.correctAnswers,
                    totalQuestions: existingAttempt.totalQuestions,
                    timeSpent: existingAttempt.timeSpent,
                    submittedAt: existingAttempt.submittedAt,
                },
                "Quiz was already submitted"
            )
        )
    }

    const session = await QuizAttemptSession.findOne({
        student: req.user._id,
        quiz: quizId,
    })

    if (!session || session.status !== "active") {
        throw new ApiError(
            400,
            "Quiz timer is not active. Please reload and start again"
        )
    }

    const decoded = verifyAttemptToken(attemptToken)
    if (
        String(decoded.quizId) !== String(quizId) ||
        String(decoded.studentId) !== String(req.user._id)
    ) {
        throw new ApiError(401, "Attempt timer token does not match quiz")
    }

    if (
        String(new Date(decoded.startedAt).toISOString()) !==
        String(new Date(session.startedAt).toISOString())
    ) {
        throw new ApiError(401, "Attempt timer token does not match session")
    }

    // ✅ Validate time constraints using server-side start
    const maxDuration = quiz.duration * 60 // Convert minutes to seconds
    const submissionTime = new Date()
    const actualTimeSpent = Math.floor(
        (submissionTime - session.startedAt) / 1000
    )

    if (actualTimeSpent > maxDuration + 30) {
        // Just flag it, don't throw an error and destroy the student's work
        console.warn(`Quiz submission exceeded time limit for quiz ${quizId}`)
    }

    // ✅ Check if late submission
    const isLateSubmission = submissionTime > quiz.deadline

    const studentDoc = await User.findById(req.user._id).select("fullName")
    const existingPerformance = await StudentPerformance.findOne({
        student: req.user._id,
        class: quiz.classId,
    }).lean()

    // ✅ Process and score answers
    const scoringResults = await processQuizAnswers(
        quiz,
        submittedAnswers,
        actualTimeSpent
    )

    const normalizedDebarReason = String(debarReason || "").trim()
    const isDebarred = Boolean(forceDebar)

    // ✅ Create quiz attempt record
    const quizAttempt = new QuizAttempt({
        student: req.user._id,
        quiz: quizId,
        class: quiz.classId,
        startedAt: new Date(session.startedAt),
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
        advisory: scoringResults.advisory,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        isDebarred,
        debarReason: isDebarred
            ? normalizedDebarReason || "Quiz policy violation detected"
            : "",
        debarredAt: isDebarred ? submissionTime : null,
    })

    await quizAttempt.save()

    session.status =
        submissionTime > session.expiresAt ? "expired" : "submitted"
    session.submittedAt = submissionTime
    await session.save()

    try {
        const performanceInsights = await updateStudentPerformanceInsights({
            studentId: req.user._id,
            classId: quiz.classId,
            quiz,
            quizAttempt,
            previousInsights: existingPerformance?.latestInsights,
            student: { fullName: studentDoc?.fullName || "Student" },
        })

        // Keep compatibility with existing advisory card in quiz results page.
        quizAttempt.advisory = toLegacyAdvisoryShape(performanceInsights)
        await quizAttempt.save()
    } catch (insightError) {
        console.error(
            "Failed to update student performance insights:",
            insightError
        )
    }

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
                isPassed: quizAttempt.checkIfPassed(),
                correctAnswers: quizAttempt.correctAnswers,
                totalQuestions: quizAttempt.totalQuestions,
                timeSpent: quizAttempt.timeSpent,
                submittedAt: quizAttempt.submittedAt,
                isDebarred: quizAttempt.isDebarred,
                debarReason: quizAttempt.debarReason,
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
            isPassed: attempt.checkIfPassed(),
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
                            { case: { $gte: ["$percentage", 91] }, then: "S" },
                            { case: { $gte: ["$percentage", 81] }, then: "A" },
                            { case: { $gte: ["$percentage", 71] }, then: "B" },
                            { case: { $gte: ["$percentage", 61] }, then: "C" },
                            { case: { $gte: ["$percentage", 51] }, then: "D" },
                            { case: { $gte: ["$percentage", 41] }, then: "E" },
                        ],
                        default: "F",
                    },
                },
                isPassed: { $gte: ["$percentage", 41] },
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
                            { case: { $gte: ["$percentage", 91] }, then: "S" },
                            { case: { $gte: ["$percentage", 81] }, then: "A" },
                            { case: { $gte: ["$percentage", 71] }, then: "B" },
                            { case: { $gte: ["$percentage", 61] }, then: "C" },
                            { case: { $gte: ["$percentage", 51] }, then: "D" },
                            { case: { $gte: ["$percentage", 41] }, then: "E" },
                        ],
                        default: "F",
                    },
                },
                isPassed: { $gte: ["$percentage", 41] },
            },
        },

        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },

        // Project final structure
        {
            $project: {
                _id: 1,
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
        {
            path: "quiz",
            select: "title requirements duration deadline settings questions.topic questions.difficulty questions.questionType",
        },
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

    const hasAdvisory =
        attempt.advisory?.motivationalMessage ||
        (Array.isArray(attempt.advisory?.strengths) &&
            attempt.advisory.strengths.length > 0) ||
        (Array.isArray(attempt.advisory?.weaknesses) &&
            attempt.advisory.weaknesses.length > 0) ||
        (Array.isArray(attempt.advisory?.recommendations) &&
            attempt.advisory.recommendations.length > 0)

    // Backfill advisory for older attempts created before advisory persistence.
    if (!hasAdvisory) {
        try {
            const generatedAdvisory =
                await AdvisoryService.generateAdvisoryReport(
                    attempt.quiz,
                    {
                        answers: attempt.answers,
                        marksObtained: attempt.marksObtained,
                        maxMarks: attempt.maxMarks,
                        percentage: attempt.percentage,
                        totalQuestions: attempt.totalQuestions,
                        correctAnswers: attempt.correctAnswers,
                        incorrectAnswers: attempt.incorrectAnswers,
                    },
                    { fullName: attempt.student?.fullName || "Student" }
                )

            attempt.advisory = generatedAdvisory
            await attempt.save()
        } catch (error) {
            console.error("Failed to backfill advisory report:", error)
        }
    }

    const questionWiseVisibility = isStudent
        ? getQuestionWiseVisibilityForStudent(attempt.quiz)
        : {
              canViewAnyQuestionWise: true,
              canViewScores: true,
              canViewCorrectAnswers: true,
              canViewFeedback: true,
          }

    const visibleAnswers = questionWiseVisibility.canViewAnyQuestionWise
        ? attempt.answers.map((answer) => {
              const payload = {
                  questionIndex: answer.questionIndex,
                  questionText: answer.questionText,
                  selectedAnswer: answer.selectedAnswer,
              }

              if (questionWiseVisibility.canViewScores) {
                  payload.isCorrect = answer.isCorrect
                  payload.marksAwarded = answer.marksAwarded
                  payload.maxMarks = answer.maxMarks
              }

              if (questionWiseVisibility.canViewCorrectAnswers) {
                  payload.correctAnswer = answer.correctAnswer
              }

              if (questionWiseVisibility.canViewFeedback) {
                  payload.gradingNotes = answer.gradingNotes
              }

              return payload
          })
        : []

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
                answers: visibleAnswers,
                facultyFeedback: attempt.facultyFeedback,
                advisory: attempt.advisory,
                questionWiseVisibility,
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

// ✅ Helper function to process quiz answers (AI Enhanced)
const processQuizAnswers = async (quiz, submittedAnswers, timeSpent) => {
    const processedAnswers = []
    let correctCount = 0
    let totalMarks = 0
    const negativeMarkingEnabled =
        quiz?.settings?.negativeMarkingEnabled === true
    const configuredRatio = Number(quiz?.settings?.negativeMarkingRatio)
    const negativeMarkingRatio = Number.isFinite(configuredRatio)
        ? Math.min(2, Math.max(0, configuredRatio))
        : 0

    // ✅ Evaluate answers in parallel (essential for AI speed)
    const evaluationPromises = quiz.questions.map(async (question, i) => {
        const submittedAnswer = submittedAnswers.find(
            (ans) => ans.questionIndex === i
        )

        if (!submittedAnswer) {
            // Missing answer handling
            return {
                questionIndex: i,
                questionText: question.questionText,
                selectedAnswer: "",
                correctAnswer: question.correctAnswer || "",
                isCorrect: false,
                marksAwarded: 0,
                correctnessScore: 0,
                maxMarks: question.points || quiz.requirements.marksPerQuestion,
                timeSpent: 0,
                gradingNotes: "Not answered",
            }
        }

        // ✅ Use Evaluation Service
        const evaluation = await EvaluationService.evaluateAnswer(
            question,
            submittedAnswer,
            question.points || quiz.requirements.marksPerQuestion
        )

        return {
            questionIndex: i,
            questionText: question.questionText,
            selectedAnswer: submittedAnswer.selectedAnswer,
            correctAnswer: question.correctAnswer || "Subjective",
            isCorrect: evaluation.isCorrect,
            marksAwarded: evaluation.marksAwarded,
            correctnessScore: Number(evaluation.correctnessScore || 0),
            maxMarks: question.points || quiz.requirements.marksPerQuestion,
            timeSpent: submittedAnswer.timeSpent || 0,
            gradingNotes: evaluation.feedback,
            manuallyGraded: evaluation.manuallyGraded || false,
            checkedByAgent: evaluation.checkedByAgent || "unknown",
        }
    })

    const results = await Promise.all(evaluationPromises)

    // ✅ Aggregate results
    results.forEach((res) => {
        processedAnswers.push(res)
        if (res.isCorrect) correctCount++
        totalMarks += res.marksAwarded

        const hasAttemptedAnswer =
            String(res.selectedAnswer || "").trim().length > 0
        if (
            negativeMarkingEnabled &&
            negativeMarkingRatio > 0 &&
            hasAttemptedAnswer &&
            !res.isCorrect
        ) {
            const deduction = Number(
                (Number(res.maxMarks || 0) * negativeMarkingRatio).toFixed(4)
            )
            totalMarks -= deduction
            res.negativeMarksDeducted = deduction
        }
    })

    totalMarks = Number(Math.max(0, totalMarks).toFixed(4))

    // Sort by index to maintain order
    processedAnswers.sort((a, b) => a.questionIndex - b.questionIndex)

    // 5. Generate Advisory Report (AI Agent)
    let advisoryReport = {}
    try {
        advisoryReport = await AdvisoryService.generateAdvisoryReport(
            quiz,
            {
                answers: processedAnswers,
                marksObtained: totalMarks,
                maxMarks: quiz.requirements.totalMarks,
                percentage: (totalMarks / quiz.requirements.totalMarks) * 100,
                totalQuestions: quiz.questions.length,
                correctAnswers: correctCount,
                incorrectAnswers: quiz.questions.length - correctCount,
            },
            { fullName: "Student" }
        ) // We might need to pass actual student object if available in context
    } catch (err) {
        console.error("Failed to generate advisory report:", err)
    }

    return {
        processedAnswers,
        correctCount,
        totalMarks,
        advisory: advisoryReport,
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
                    isPassed: attempt.checkIfPassed(),
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

const getMyPerformance = asyncHandler(async (req, res) => {
    const { classId } = req.query

    const query = { student: req.user._id }
    if (classId) {
        if (!mongoose.Types.ObjectId.isValid(classId)) {
            throw new ApiError(400, "Invalid class ID")
        }
        query.class = classId
    }

    const performanceDocs = await StudentPerformance.find(query)
        .populate("class", "subjectName subjectCode")
        .populate("history.quiz", "title")
        .sort({ updatedAt: -1 })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                performanceDocs,
                "Student performance insights retrieved successfully"
            )
        )
})

const getStudentPerformanceForFaculty = asyncHandler(async (req, res) => {
    const { studentId } = req.params
    const { classId } = req.query

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError(400, "Invalid student ID")
    }

    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(400, "Valid classId query param is required")
    }

    const classDoc = await Class.findById(classId)
    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    if (!classDoc.isFaculty(req.user._id)) {
        throw new ApiError(
            403,
            "Only class faculty can view student performance"
        )
    }

    if (!classDoc.isStudent(studentId)) {
        throw new ApiError(404, "Student is not enrolled in this class")
    }

    const performanceDoc = await StudentPerformance.findOne({
        student: studentId,
        class: classId,
    })
        .populate("student", "fullName email studentId")
        .populate("class", "subjectName subjectCode")
        .populate("history.quiz", "title")

    if (!performanceDoc) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    null,
                    "No performance insights found for this student in the selected class"
                )
            )
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                performanceDoc,
                "Student performance insights retrieved successfully"
            )
        )
})

// ✅ Debar student quiz attempt (for anti-cheat violations)
const debarStudentQuizAttempt = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const { attemptToken, debarReason = "" } = req.body

    // ✅ Validate input
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    if (!attemptToken) {
        throw new ApiError(400, "Attempt timer token is required")
    }

    // ✅ Get quiz
    const quiz = await Quiz.findById(quizId).populate(
        "classId",
        "faculty students isArchived"
    )

    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    // ✅ Get class document for access control
    const classDoc = await Class.findById(quiz.classId)
    if (!classDoc.isStudent(req.user._id)) {
        throw new ApiError(403, "You are not enrolled in this class")
    }

    // ✅ Check if student already has an attempt
    const existingAttempt = await QuizAttempt.findOne({
        student: req.user._id,
        quiz: quizId,
    })

    if (existingAttempt && existingAttempt.isDebarred) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { attemptId: existingAttempt._id, isDebarred: true },
                    "Student already debarred from this quiz"
                )
            )
    }

    // ✅ Verify token matches session
    const session = await QuizAttemptSession.findOne({
        student: req.user._id,
        quiz: quizId,
    })

    if (session) {
        try {
            const decoded = verifyAttemptToken(attemptToken)
            if (
                String(decoded.quizId) !== String(quizId) ||
                String(decoded.studentId) !== String(req.user._id)
            ) {
                throw new ApiError(
                    401,
                    "Attempt timer token does not match quiz"
                )
            }
        } catch (err) {
            // Token validation failed, but still allow debar for safety
            console.warn(`Token validation failed during debar: ${err.message}`)
        }
    }

    const submissionTime = new Date()
    const normalizedDebarReason = String(debarReason || "").trim()

    // ✅ Create debarred attempt record (minimal, no answers)
    let quizAttempt

    if (existingAttempt) {
        // Update existing attempt with debar status
        existingAttempt.isDebarred = true
        existingAttempt.debarReason =
            normalizedDebarReason || "Quiz policy violation detected"
        existingAttempt.debarredAt = submissionTime
        existingAttempt.status = "submitted"
        quizAttempt = await existingAttempt.save()
    } else {
        // Create new debarred attempt
        quizAttempt = new QuizAttempt({
            student: req.user._id,
            quiz: quizId,
            class: quiz.classId,
            startedAt: session ? session.startedAt : submissionTime,
            submittedAt: submissionTime,
            timeSpent: session
                ? Math.floor((submissionTime - session.startedAt) / 1000)
                : 0,
            answers: [], // No answers for debar
            totalQuestions: quiz.questions.length,
            correctAnswers: 0,
            incorrectAnswers: quiz.questions.length,
            marksObtained: 0,
            maxMarks: quiz.requirements.totalMarks,
            percentage: 0,
            isDebarred: true,
            debarReason:
                normalizedDebarReason || "Quiz policy violation detected",
            debarredAt: submissionTime,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            status: "submitted",
        })
        quizAttempt = await quizAttempt.save()
    }

    // ✅ Update session status
    if (session) {
        session.status = "submitted"
        session.submittedAt = submissionTime
        await session.save()
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                attemptId: quizAttempt._id,
                isDebarred: true,
                debarReason: quizAttempt.debarReason,
                debarredAt: quizAttempt.debarredAt,
            },
            "Student debarred from quiz due to policy violation"
        )
    )
})

// ✅ Update the export statement
export {
    startQuizAttempt,
    submitQuizAnswers,
    debarStudentQuizAttempt,
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
}
