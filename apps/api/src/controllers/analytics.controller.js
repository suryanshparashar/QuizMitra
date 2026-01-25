import { QuizAttempt } from "../models/quizAttempt.model.js"
import { Quiz } from "../models/quiz.model.js"
import { Class } from "../models/class.model.js"
import { User } from "../models/user.model.js"
import { ApiResponse, ApiError, asyncHandler } from "../utils/index.js"
import mongoose from "mongoose"

// Get overall analytics (admin/faculty dashboard)
const getOverallAnalytics = asyncHandler(async (req, res) => {
    const { timeframe = "30d", role } = req.query
    const userId = req.user._id

    // ✅ Calculate date range
    const dateRange = getDateRange(timeframe)

    let analytics = {}

    if (req.user.role === "faculty") {
        // ✅ Faculty Analytics
        const facultyClasses = await Class.find({
            faculty: userId,
            isArchived: false,
        }).select("_id")

        const classIds = facultyClasses.map((c) => c._id)

        const [
            totalClasses,
            totalQuizzes,
            totalAttempts,
            averageScore,
            studentStats,
        ] = await Promise.all([
            Class.countDocuments({ faculty: userId, isArchived: false }),
            Quiz.countDocuments({
                userId: userId,
                createdAt: { $gte: dateRange.start },
            }),
            QuizAttempt.countDocuments({
                class: { $in: classIds },
                createdAt: { $gte: dateRange.start },
            }),
            QuizAttempt.aggregate([
                {
                    $match: {
                        class: { $in: classIds },
                        createdAt: { $gte: dateRange.start },
                    },
                },
                { $group: { _id: null, avgScore: { $avg: "$percentage" } } },
            ]),
            getStudentEngagementStats(classIds, dateRange),
        ])

        analytics = {
            overview: {
                totalClasses,
                totalQuizzes,
                totalAttempts,
                averageScore: averageScore[0]?.avgScore?.toFixed(2) || 0,
                activeStudents: studentStats.activeStudents,
                totalStudents: studentStats.totalStudents,
            },
            trends: await getQuizTrends(userId, dateRange),
            topPerformers: await getTopPerformers(classIds, dateRange),
            recentActivity: await getRecentActivity(userId, dateRange),
        }
    } else {
        // ✅ Student Analytics
        const [totalAttempts, averageScore, classesEnrolled, recentAttempts] =
            await Promise.all([
                QuizAttempt.countDocuments({
                    student: userId,
                    createdAt: { $gte: dateRange.start },
                }),
                QuizAttempt.aggregate([
                    {
                        $match: {
                            student: userId,
                            createdAt: { $gte: dateRange.start },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            avgScore: { $avg: "$percentage" },
                        },
                    },
                ]),
                Class.countDocuments({
                    "students.user": userId,
                    "students.status": "active",
                    isArchived: false,
                }),
                getStudentRecentAttempts(userId, dateRange),
            ])

        analytics = {
            overview: {
                totalAttempts,
                averageScore: averageScore[0]?.avgScore?.toFixed(2) || 0,
                classesEnrolled,
                quizzesCompleted: totalAttempts,
            },
            performance: await getStudentPerformanceTrend(userId, dateRange),
            subjectWise: await getStudentSubjectWisePerformance(
                userId,
                dateRange
            ),
            recentActivity: recentAttempts,
        }
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                analytics,
                "Overall analytics retrieved successfully"
            )
        )
})

// Get class performance analytics
const getClassPerformanceAnalytics = asyncHandler(async (req, res) => {
    const { classId } = req.params
    const { timeframe = "30d" } = req.query

    if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(400, "Invalid class ID")
    }

    // ✅ Verify access
    const classDoc = await Class.findById(classId)
    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    if (
        !classDoc.isFaculty(req.user._id) &&
        !classDoc.isStudent(req.user._id)
    ) {
        throw new ApiError(403, "Access denied")
    }

    const dateRange = getDateRange(timeframe)

    // ✅ Get class analytics
    const [
        classInfo,
        quizStats,
        studentPerformance,
        attendanceRate,
        difficultyAnalysis,
    ] = await Promise.all([
        getClassBasicInfo(classId),
        getClassQuizStats(classId, dateRange),
        getClassStudentPerformance(classId, dateRange),
        getClassAttendanceRate(classId, dateRange),
        getClassDifficultyAnalysis(classId, dateRange),
    ])

    const analytics = {
        class: classInfo,
        overview: {
            totalStudents: classInfo.totalStudents,
            totalQuizzes: quizStats.totalQuizzes,
            averageScore: quizStats.averageScore,
            attendanceRate: attendanceRate,
            passRate: studentPerformance.passRate,
        },
        performance: {
            scoreDistribution: studentPerformance.scoreDistribution,
            topPerformers: studentPerformance.topPerformers,
            strugglingStudents: studentPerformance.strugglingStudents,
        },
        quizAnalytics: {
            difficultyBreakdown: difficultyAnalysis,
            completionTrends: await getQuizCompletionTrends(classId, dateRange),
            averageTimeSpent: quizStats.averageTimeSpent,
        },
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                analytics,
                "Class performance analytics retrieved successfully"
            )
        )
})

// Get student progress analytics
const getStudentProgressAnalytics = asyncHandler(async (req, res) => {
    const { studentId } = req.params
    const { timeframe = "90d" } = req.query

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError(400, "Invalid student ID")
    }

    // ✅ Verify access (student can only see own data, faculty can see their class students)
    if (req.user.role === "student" && studentId !== req.user._id.toString()) {
        throw new ApiError(403, "Access denied")
    }

    if (req.user.role === "faculty") {
        const hasAccess = await verifyFacultyStudentAccess(
            req.user._id,
            studentId
        )
        if (!hasAccess) {
            throw new ApiError(403, "Access denied")
        }
    }

    const dateRange = getDateRange(timeframe)

    const [
        studentInfo,
        progressTrend,
        subjectWisePerformance,
        strengths,
        improvements,
        recentActivity,
    ] = await Promise.all([
        getStudentBasicInfo(studentId),
        getStudentProgressTrend(studentId, dateRange),
        getStudentSubjectWisePerformance(studentId, dateRange),
        getStudentStrengths(studentId, dateRange),
        getStudentImprovementAreas(studentId, dateRange),
        getStudentRecentActivity(studentId, dateRange),
    ])

    const analytics = {
        student: studentInfo,
        progress: {
            trend: progressTrend,
            overallImprovement: calculateOverallImprovement(progressTrend),
            consistency: calculateConsistency(progressTrend),
        },
        performance: {
            subjectWise: subjectWisePerformance,
            strengths: strengths,
            improvementAreas: improvements,
        },
        engagement: {
            quizzesAttempted: progressTrend.length,
            averageScore:
                progressTrend.reduce((acc, curr) => acc + curr.score, 0) /
                    progressTrend.length || 0,
            timeSpentLearning: recentActivity.totalTimeSpent,
        },
        recentActivity: recentActivity.activities,
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                analytics,
                "Student progress analytics retrieved successfully"
            )
        )
})

// Get quiz difficulty analytics
const getQuizDifficultyAnalytics = asyncHandler(async (req, res) => {
    const { quizId } = req.params

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    // ✅ Get quiz and verify access
    const quiz = await Quiz.findById(quizId).populate("classId")
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (!quiz.classId.isFaculty(req.user._id)) {
        throw new ApiError(
            403,
            "Only quiz creator can view difficulty analytics"
        )
    }

    const [basicStats, questionAnalysis, timeAnalysis, scoreDistribution] =
        await Promise.all([
            getQuizBasicStats(quizId),
            getQuestionDifficultyAnalysis(quizId),
            getQuizTimeAnalysis(quizId),
            getQuizScoreDistribution(quizId),
        ])

    const analytics = {
        quiz: {
            _id: quiz._id,
            title: quiz.title,
            totalQuestions: quiz.questions.length,
            maxMarks: quiz.requirements.totalMarks,
        },
        overview: basicStats,
        difficulty: {
            overall: calculateOverallDifficulty(basicStats.averageScore),
            questionWise: questionAnalysis,
            recommendations:
                generateDifficultyRecommendations(questionAnalysis),
        },
        timing: timeAnalysis,
        distribution: scoreDistribution,
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                analytics,
                "Quiz difficulty analytics retrieved successfully"
            )
        )
})

// Get time-based analytics
const getTimeBasedAnalytics = asyncHandler(async (req, res) => {
    const { period = "week", type = "attempts" } = req.query

    const dateRange = getDateRangeForPeriod(period)
    let analytics = {}

    if (req.user.role === "faculty") {
        const facultyClasses = await Class.find({
            faculty: req.user._id,
            isArchived: false,
        }).select("_id")
        const classIds = facultyClasses.map((c) => c._id)

        if (type === "attempts") {
            analytics = await getTimeBasedAttempts(classIds, dateRange, period)
        } else if (type === "performance") {
            analytics = await getTimeBasedPerformance(
                classIds,
                dateRange,
                period
            )
        } else if (type === "engagement") {
            analytics = await getTimeBasedEngagement(
                classIds,
                dateRange,
                period
            )
        }
    } else {
        // Student time-based analytics
        if (type === "performance") {
            analytics = await getStudentTimeBasedPerformance(
                req.user._id,
                dateRange,
                period
            )
        }
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                analytics,
                "Time-based analytics retrieved successfully"
            )
        )
})

// Get comparison analytics
const getComparisonAnalytics = asyncHandler(async (req, res) => {
    const { compareType, ids, metric = "performance" } = req.query

    if (!compareType || !ids) {
        throw new ApiError(400, "Comparison type and IDs are required")
    }

    const idArray = ids
        .split(",")
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    if (idArray.length < 2) {
        throw new ApiError(400, "At least 2 valid IDs required for comparison")
    }

    let comparison = {}

    if (compareType === "classes") {
        comparison = await compareClasses(idArray, metric, req.user._id)
    } else if (compareType === "students") {
        comparison = await compareStudents(idArray, metric, req.user._id)
    } else if (compareType === "quizzes") {
        comparison = await compareQuizzes(idArray, metric, req.user._id)
    } else {
        throw new ApiError(400, "Invalid comparison type")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                comparison,
                "Comparison analytics retrieved successfully"
            )
        )
})

// Export analytics data
const exportAnalyticsData = asyncHandler(async (req, res) => {
    const { type, format = "json", filters = {} } = req.query

    if (!type) {
        throw new ApiError(400, "Export type is required")
    }

    let data = {}

    switch (type) {
        case "class-performance":
            data = await exportClassPerformanceData(filters, req.user._id)
            break
        case "student-progress":
            data = await exportStudentProgressData(filters, req.user._id)
            break
        case "quiz-results":
            data = await exportQuizResultsData(filters, req.user._id)
            break
        default:
            throw new ApiError(400, "Invalid export type")
    }

    if (format === "csv") {
        // Convert to CSV format
        const csvData = convertToCSV(data)
        res.setHeader("Content-Type", "text/csv")
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${type}-${Date.now()}.csv"`
        )
        return res.send(csvData)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, data, "Analytics data exported successfully")
        )
})

// ✅ Helper Functions

const getDateRange = (timeframe) => {
    const now = new Date()
    let start = new Date()

    switch (timeframe) {
        case "7d":
            start.setDate(now.getDate() - 7)
            break
        case "30d":
            start.setDate(now.getDate() - 30)
            break
        case "90d":
            start.setDate(now.getDate() - 90)
            break
        case "1y":
            start.setFullYear(now.getFullYear() - 1)
            break
        default:
            start.setDate(now.getDate() - 30)
    }

    return { start, end: now }
}

const getStudentEngagementStats = async (classIds, dateRange) => {
    const stats = await QuizAttempt.aggregate([
        {
            $match: {
                class: { $in: classIds },
                createdAt: { $gte: dateRange.start },
            },
        },
        {
            $group: {
                _id: "$student",
                attempts: { $sum: 1 },
            },
        },
        {
            $group: {
                _id: null,
                activeStudents: {
                    $sum: { $cond: [{ $gte: ["$attempts", 1] }, 1, 0] },
                },
                totalStudents: { $sum: 1 },
            },
        },
    ])

    return stats[0] || { activeStudents: 0, totalStudents: 0 }
}

const getQuizTrends = async (userId, dateRange) => {
    return await Quiz.aggregate([
        {
            $match: {
                userId: userId,
                createdAt: { $gte: dateRange.start },
            },
        },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ])
}

const getTopPerformers = async (classIds, dateRange) => {
    return await QuizAttempt.aggregate([
        {
            $match: {
                class: { $in: classIds },
                createdAt: { $gte: dateRange.start },
            },
        },
        {
            $group: {
                _id: "$student",
                averageScore: { $avg: "$percentage" },
                totalAttempts: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "student",
            },
        },
        { $unwind: "$student" },
        { $sort: { averageScore: -1 } },
        { $limit: 5 },
        {
            $project: {
                studentName: "$student.fullName",
                studentId: "$student.studentId",
                averageScore: { $round: ["$averageScore", 2] },
                totalAttempts: 1,
            },
        },
    ])
}

const getRecentActivity = async (userId, dateRange) => {
    return await Quiz.aggregate([
        {
            $match: {
                userId: userId,
                createdAt: { $gte: dateRange.start },
            },
        },
        {
            $lookup: {
                from: "quizattempts",
                localField: "_id",
                foreignField: "quiz",
                as: "attempts",
            },
        },
        {
            $project: {
                title: 1,
                status: 1,
                createdAt: 1,
                attemptCount: { $size: "$attempts" },
            },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
    ])
}

// More helper functions would go here...

export {
    getOverallAnalytics,
    getClassPerformanceAnalytics,
    getStudentProgressAnalytics,
    getQuizDifficultyAnalytics,
    getTimeBasedAnalytics,
    getComparisonAnalytics,
    exportAnalyticsData,
}
