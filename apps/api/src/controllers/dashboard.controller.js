// controllers/dashboard.controller.js
import { QuizAttempt } from "../models/quizAttempt.model.js"
import { Quiz } from "../models/quiz.model.js"
import { Class } from "../models/class.model.js"
import { User } from "../models/user.model.js"
import { Notification } from "../models/notification.model.js"
import { ClassMessage } from "../models/classMessage.model.js"
import { ApiResponse, ApiError, asyncHandler } from "../utils/index.js"
import mongoose from "mongoose"

// ✅ Main dashboard - role-based
const getDashboard = asyncHandler(async (req, res) => {
    const { role } = req.user
    let dashboardData = {}

    if (role === "faculty") {
        dashboardData = await getFacultyDashboardData(req.user._id)
    } else {
        dashboardData = await getStudentDashboardData(req.user._id)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dashboardData,
                "Dashboard data retrieved successfully"
            )
        )
})

// ✅ Faculty-specific dashboard
const getFacultyDashboard = asyncHandler(async (req, res) => {
    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty can access faculty dashboard")
    }

    const dashboardData = await getFacultyDashboardData(req.user._id)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dashboardData,
                "Faculty dashboard data retrieved successfully"
            )
        )
})

// ✅ Student-specific dashboard
const getStudentDashboard = asyncHandler(async (req, res) => {
    if (
        req.user.role !== "student" &&
        req.user.role !== "class-representative"
    ) {
        throw new ApiError(403, "Only students can access student dashboard")
    }

    const dashboardData = await getStudentDashboardData(req.user._id)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dashboardData,
                "Student dashboard data retrieved successfully"
            )
        )
})

// ✅ Dashboard statistics
const getDashboardStats = asyncHandler(async (req, res) => {
    const { timeframe = "30d" } = req.query
    const userId = req.user._id
    const role = req.user.role

    let stats = {}

    if (role === "faculty") {
        stats = await getFacultyStats(userId, timeframe)
    } else {
        stats = await getStudentStats(userId, timeframe)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                stats,
                "Dashboard statistics retrieved successfully"
            )
        )
})

// ✅ Dashboard analytics
const getDashboardAnalytics = asyncHandler(async (req, res) => {
    const { period = "week", metric = "activity" } = req.query
    const userId = req.user._id
    const role = req.user.role

    let analytics = {}

    if (role === "faculty") {
        analytics = await getFacultyAnalytics(userId, period, metric)
    } else {
        analytics = await getStudentAnalytics(userId, period, metric)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                analytics,
                "Dashboard analytics retrieved successfully"
            )
        )
})

// ✅ Recent activity
const getRecentActivity = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query
    const userId = req.user._id
    const role = req.user.role

    let activities = []

    if (role === "faculty") {
        activities = await getFacultyRecentActivity(userId, parseInt(limit))
    } else {
        activities = await getStudentRecentActivity(userId, parseInt(limit))
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { activities },
                "Recent activity retrieved successfully"
            )
        )
})

// ✅ Upcoming events
const getUpcomingEvents = asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query
    const userId = req.user._id
    const role = req.user.role

    let events = []

    if (role === "faculty") {
        events = await getFacultyUpcomingEvents(userId, parseInt(limit))
    } else {
        events = await getStudentUpcomingEvents(userId, parseInt(limit))
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { events },
                "Upcoming events retrieved successfully"
            )
        )
})

// ✅ Dashboard notifications
const getDashboardNotifications = asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query
    const userId = req.user._id

    const notifications = await Notification.find({
        recipient: userId,
        isRead: false,
        isDeleted: false,
    })
        .populate("sender", "fullName avatar role")
        .populate("relatedClass", "subjectName subjectCode")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean()

    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
        isDeleted: false,
    })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notifications,
                unreadCount,
            },
            "Dashboard notifications retrieved successfully"
        )
    )
})

// ✅ Dashboard preferences
const getDashboardPreferences = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        "preferences.dashboard"
    )

    const defaultPreferences = {
        layout: "grid",
        widgets: {
            overview: true,
            recentActivity: true,
            upcomingEvents: true,
            notifications: true,
            quickActions: true,
            analytics: true,
        },
        theme: "light",
        autoRefresh: false,
        refreshInterval: 30000,
    }

    const preferences = user.preferences?.dashboard || defaultPreferences

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { preferences },
                "Dashboard preferences retrieved successfully"
            )
        )
})

// ✅ Update dashboard preferences
const updateDashboardPreferences = asyncHandler(async (req, res) => {
    const { layout, widgets, theme, autoRefresh, refreshInterval } = req.body

    const updateData = {}
    if (layout) updateData["preferences.dashboard.layout"] = layout
    if (widgets) updateData["preferences.dashboard.widgets"] = widgets
    if (theme) updateData["preferences.dashboard.theme"] = theme
    if (autoRefresh !== undefined)
        updateData["preferences.dashboard.autoRefresh"] = autoRefresh
    if (refreshInterval)
        updateData["preferences.dashboard.refreshInterval"] = refreshInterval

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, upsert: true }
    ).select("preferences.dashboard")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { preferences: updatedUser.preferences.dashboard },
                "Dashboard preferences updated successfully"
            )
        )
})

// ✅ Helper Functions for Faculty Dashboard
const getFacultyDashboardData = async (facultyId) => {
    const [
        classes,
        quizzes,
        recentAttempts,
        messages,
        stats,
        last10AttemptAverageTrend,
    ] = await Promise.all([
        // Classes
        Class.find({ faculty: facultyId, isArchived: false })
            .populate("students.user", "fullName studentId avatar")
            .populate("classRepresentative", "fullName studentId")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),

        // Recent Quizzes
        Quiz.find({ userId: facultyId })
            .populate("classId", "subjectName subjectCode")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),

        // Recent Quiz Attempts
        QuizAttempt.find({})
            .populate([
                { path: "student", select: "fullName studentId avatar" },
                { path: "quiz", select: "title" },
                {
                    path: "class",
                    select: "subjectName faculty",
                    match: { faculty: facultyId },
                },
            ])
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),

        // Recent Messages
        ClassMessage.find({})
            .populate("class", "faculty", { faculty: facultyId })
            .populate("sender", "fullName avatar role")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),

        // Quick Stats
        getFacultyStats(facultyId),

        // Last 10 attempt average trend for line chart
        getFacultyLast10AttemptAverageTrend(facultyId),
    ])

    // Filter out null results from population
    const filteredAttempts = recentAttempts.filter((attempt) => attempt.class)
    const filteredMessages = messages.filter((msg) => msg.class)

    return {
        overview: stats,
        classes: classes.map((cls) => ({
            ...cls,
            totalStudents:
                cls.students?.filter((s) => s.status === "active").length || 0,
            hasClassRep: Boolean(cls.classRepresentative),
        })),
        recentQuizzes: quizzes.map((quiz) => ({
            ...quiz,
            computedStatus: getQuizStatus(quiz),
            canEdit: quiz.status === "draft",
        })),
        recentAttempts: filteredAttempts.slice(0, 5),
        last10AttemptAverageTrend,
        recentMessages: filteredMessages,
        quickActions: [
            {
                id: "create-class",
                title: "Create New Class",
                icon: "🏫",
                url: "/classes/create",
            },
            {
                id: "create-quiz",
                title: "Create Quiz",
                icon: "📝",
                url: "/quizzes/create",
            },
            {
                id: "view-analytics",
                title: "View Analytics",
                icon: "📊",
                url: "/analytics",
            },
            {
                id: "grade-quizzes",
                title: "Grade Quizzes",
                icon: "✅",
                url: "/grading",
            },
        ],
    }
}

const getFacultyLast10AttemptAverageTrend = async (facultyId) => {
    const quizIds = (await Quiz.find({ userId: facultyId }).select("_id")).map(
        (q) => q._id
    )

    if (!quizIds.length) {
        return []
    }

    const quizWiseAverage = await QuizAttempt.aggregate([
        {
            $match: {
                quiz: { $in: quizIds },
                status: "submitted",
            },
        },
        {
            $group: {
                _id: "$quiz",
                avgScore: { $avg: "$percentage" },
                latestSubmittedAt: { $max: "$submittedAt" },
                attemptsCount: { $sum: 1 },
            },
        },
        { $sort: { latestSubmittedAt: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "quizzes",
                localField: "_id",
                foreignField: "_id",
                as: "quiz",
            },
        },
        {
            $unwind: {
                path: "$quiz",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                _id: 0,
                quizId: "$_id",
                name: { $ifNull: ["$quiz.title", "Untitled Quiz"] },
                avgScore: { $round: ["$avgScore", 2] },
                attemptsCount: 1,
                submittedAt: "$latestSubmittedAt",
            },
        },
    ])

    return quizWiseAverage.reverse()
}

// ✅ Helper Functions for Student Dashboard
const getStudentDashboardData = async (studentId) => {
    const [enrolledClasses, upcomingQuizzes, recentAttempts, messages, stats] =
        await Promise.all([
            // Enrolled Classes
            Class.find({
                "students.user": studentId,
                "students.status": "active",
                isArchived: false,
            })
                .populate("faculty", "fullName email avatar")
                .populate("classRepresentative", "fullName studentId")
                .sort({ createdAt: -1 })
                .lean(),

            // Upcoming Quizzes
            Quiz.find({
                classId: { $in: await getStudentClassIds(studentId) },
                status: "published",
                deadline: { $gte: new Date() },
            })
                .populate("classId", "subjectName subjectCode")
                .populate("userId", "fullName")
                .sort({ scheduledAt: 1 })
                .limit(5)
                .lean(),

            // Recent Attempts
            QuizAttempt.find({ student: studentId })
                .populate([
                    { path: "quiz", select: "title" },
                    { path: "class", select: "subjectName subjectCode" },
                ])
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),

            // Recent Messages
            ClassMessage.find({
                class: { $in: await getStudentClassIds(studentId) },
            })
                .populate("sender", "fullName avatar role")
                .populate("class", "subjectName subjectCode")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),

            // Quick Stats
            getStudentQuickStats(studentId),
        ])

    return {
        overview: stats,
        enrolledClasses: enrolledClasses.map((cls) => ({
            ...cls,
            totalStudents:
                cls.students?.filter((s) => s.status === "active").length || 0,
            isClassRep:
                cls.classRepresentative?._id?.toString() ===
                studentId.toString(),
        })),
        upcomingQuizzes: upcomingQuizzes.map((quiz) => ({
            ...quiz,
            computedStatus: getQuizStatus(quiz),
            timeUntilDeadline: getTimeUntilDate(quiz.deadline),
            canTake: canTakeQuiz(quiz),
        })),
        recentAttempts: recentAttempts.map((attempt) => ({
            ...attempt,
            grade: calculateGrade(attempt.percentage, attempt.isDebarred),
            isPassed: attempt.percentage >= 41,
        })),
        recentMessages: messages,
        quickActions: [
            {
                id: "join-class",
                title: "Join New Class",
                icon: "🎓",
                url: "/classes/join",
            },
            {
                id: "take-quiz",
                title: "Take Quiz",
                icon: "📝",
                url: "/quizzes",
            },
            {
                id: "view-results",
                title: "View Results",
                icon: "📊",
                url: "/results",
            },
            {
                id: "class-messages",
                title: "Class Messages",
                icon: "💬",
                url: "/messages",
            },
        ],
    }
}

// ✅ Quick Stats Functions
const getFacultyQuickStats = async (facultyId) => {
    const [
        totalClasses,
        totalQuizzes,
        totalStudents,
        activeQuizzes,
        pendingGrades,
    ] = await Promise.all([
        Class.countDocuments({ faculty: facultyId, isArchived: false }),
        Quiz.countDocuments({ userId: facultyId }),
        Class.aggregate([
            { $match: { faculty: facultyId, isArchived: false } },
            { $unwind: "$students" },
            { $match: { "students.status": "active" } },
            { $count: "total" },
        ]),
        Quiz.countDocuments({
            userId: facultyId,
            status: "published",
            scheduledAt: { $lte: new Date() },
            deadline: { $gte: new Date() },
        }),
        QuizAttempt.countDocuments({
            quiz: { $in: await Quiz.find({ userId: facultyId }).select("_id") },
            status: "submitted",
        }),
    ])

    return {
        totalClasses,
        totalQuizzes,
        totalStudents: totalStudents[0]?.total || 0,
        activeQuizzes,
        pendingGrades: pendingGrades || 0,
    }
}

const getStudentQuickStats = async (studentId) => {
    const [
        enrolledClasses,
        totalQuizzes,
        completedQuizzes,
        upcomingQuizzes,
        averageScore,
    ] = await Promise.all([
        Class.countDocuments({
            "students.user": studentId,
            "students.status": "active",
            isArchived: false,
        }),
        Quiz.countDocuments({
            classId: { $in: await getStudentClassIds(studentId) },
            status: "published",
        }),
        QuizAttempt.countDocuments({ student: studentId }),
        Quiz.countDocuments({
            classId: { $in: await getStudentClassIds(studentId) },
            status: "published",
            deadline: { $gte: new Date() },
        }),
        QuizAttempt.aggregate([
            { $match: { student: studentId } },
            { $group: { _id: null, avg: { $avg: "$percentage" } } },
        ]),
    ])

    return {
        enrolledClasses,
        totalQuizzes,
        completedQuizzes,
        upcomingQuizzes,
        averageScore: averageScore[0]?.avg?.toFixed(1) || 0,
    }
}

// ✅ Helper Functions
const getStudentClassIds = async (studentId) => {
    const classes = await Class.find({
        "students.user": studentId,
        "students.status": "active",
    }).select("_id")
    return classes.map((c) => c._id)
}

const getQuizStatus = (quiz) => {
    const now = new Date()
    if (quiz.status === "draft") return "draft"
    if (now < new Date(quiz.scheduledAt)) return "scheduled"
    if (now >= new Date(quiz.scheduledAt) && now <= new Date(quiz.deadline))
        return "active"
    if (now > new Date(quiz.deadline)) return "expired"
    return "unknown"
}

const canTakeQuiz = (quiz) => {
    const now = new Date()
    return (
        quiz.status === "published" &&
        now >= new Date(quiz.scheduledAt) &&
        now <= new Date(quiz.deadline)
    )
}

const getTimeUntilDate = (date) => {
    const now = new Date()
    const target = new Date(date)
    const diffMs = target - now

    if (diffMs <= 0) return "Expired"

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    )

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
}

const calculateGrade = (percentage, isDebarred = false) => {
    if (isDebarred) return "N"
    if (percentage >= 91) return "S"
    if (percentage >= 81) return "A"
    if (percentage >= 71) return "B"
    if (percentage >= 61) return "C"
    if (percentage >= 51) return "D"
    if (percentage >= 41) return "E"
    return "F"
}

const getFacultyStats = async (facultyId, timeframe) => {
    // 1. Calculate Total Students (Unique students across all active classes)
    const classes = await Class.find({
        faculty: facultyId,
        isArchived: false,
    }).select("students")
    const uniqueStudentIds = new Set()
    classes.forEach((c) => {
        c.students.forEach((s) => {
            if (s.status === "active") uniqueStudentIds.add(s.user.toString())
        })
    })
    const totalStudents = uniqueStudentIds.size

    // 2. Calculate Average Performance (Across all quizzes created by faculty)
    const quizzes = await Quiz.find({ userId: facultyId }).select("_id")
    const quizIds = quizzes.map((q) => q._id)

    const performanceStats = await QuizAttempt.aggregate([
        { $match: { quiz: { $in: quizIds }, status: "submitted" } },
        { $group: { _id: null, avgPercentage: { $avg: "$percentage" } } },
    ])
    const averagePerformance =
        performanceStats[0]?.avgPercentage?.toFixed(1) || 0

    // 3. Count Total Classes and Quizzes
    const totalClasses = classes.length
    const totalQuizzes = quizzes.length

    // 4. Active Quizzes
    const activeQuizzes = await Quiz.countDocuments({
        userId: facultyId,
        status: "published",
        scheduledAt: { $lte: new Date() },
        deadline: { $gte: new Date() },
    })

    return {
        totalStudents,
        averagePerformance,
        totalClasses,
        totalQuizzes,
        activeQuizzes,
    }
}

const getStudentStats = async (studentId, timeframe) => {
    // 1. Enrolled Classes (Active only)
    const enrolledClasses = await Class.countDocuments({
        "students.user": studentId,
        "students.status": "active",
        isArchived: false,
    })

    // 2. Completed Quizzes
    const completedQuizzes = await QuizAttempt.countDocuments({
        student: studentId,
        status: "submitted",
    })

    // 3. Average Score
    const avgStats = await QuizAttempt.aggregate([
        { $match: { student: studentId, status: "submitted" } },
        { $group: { _id: null, avg: { $avg: "$percentage" } } },
    ])
    const averageScore = avgStats[0]?.avg?.toFixed(1) || 0

    // 4. Upcoming Deadlines (Active quizzes closing soon)
    const upcomingDeadlines = await Quiz.countDocuments({
        classId: { $in: await getStudentClassIds(studentId) },
        status: "published",
        deadline: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }, // Next 7 days
    })

    return {
        enrolledClasses,
        completedQuizzes,
        averageScore,
        upcomingDeadlines,
    }
}

const getFacultyAnalytics = async (facultyId, period, metric) => {
    // Fetch last 5 quizzes to show performance trend
    const recentQuizzes = await Quiz.find({ userId: facultyId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title _id")

    const quizIds = recentQuizzes.map((q) => q._id)

    const stats = await QuizAttempt.aggregate([
        { $match: { quiz: { $in: quizIds }, status: "submitted" } },
        {
            $group: {
                _id: "$quiz",
                avgScore: { $avg: "$percentage" },
                totalAttempts: { $sum: 1 },
            },
        },
    ])

    // Map stats back to quizzes ensuring order
    const chartData = recentQuizzes
        .map((quiz) => {
            const stat = stats.find(
                (s) => s._id.toString() === quiz._id.toString()
            )
            return {
                name:
                    quiz.title.substring(0, 15) +
                    (quiz.title.length > 15 ? "..." : ""), // Truncate title
                avgScore: stat?.avgScore ? Math.round(stat.avgScore) : 0,
                attempts: stat?.totalAttempts || 0,
            }
        })
        .reverse() // Show oldest to newest

    return { chartData }
}

const getStudentAnalytics = async (studentId, period, metric) => {
    // Fetch last 10 quiz attempts for trend line
    const attempts = await QuizAttempt.find({
        student: studentId,
        status: "submitted",
    })
        .sort({ submittedAt: -1 })
        .limit(10)
        .populate("quiz", "title")

    const chartData = attempts
        .map((attempt) => ({
            name:
                attempt.quiz?.title?.substring(0, 15) +
                    (attempt.quiz?.title?.length > 15 ? "..." : "") || "Quiz",
            score: Math.round(attempt.percentage),
            date: attempt.submittedAt,
        }))
        .reverse() // Oldest to newest

    return { chartData }
}

const getFacultyRecentActivity = async (facultyId, limit) => {
    // Combine recent quiz creations and student submissions
    const recentQuizzes = await Quiz.find({ userId: facultyId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("classId", "subjectName")

    const quizIds = (await Quiz.find({ userId: facultyId }).select("_id")).map(
        (q) => q._id
    )
    const recentAttempts = await QuizAttempt.find({ quiz: { $in: quizIds } })
        .sort({ submittedAt: -1 })
        .limit(limit)
        .populate("student", "fullName")
        .populate("quiz", "title")

    const activities = [
        ...recentQuizzes.map((q) => ({
            type: "quiz_created",
            title: `Created quiz "${q.title}"`,
            subtitle: q.classId?.subjectName,
            status: q.status,
            timestamp: q.createdAt,
            id: q._id,
        })),
        ...recentAttempts.map((a) => ({
            type: "submission",
            title: `${a.student.fullName} submitted "${a.quiz.title}"`,
            subtitle: `Score: ${Math.round(a.percentage)}%`,
            status: "completed",
            timestamp: a.submittedAt,
            id: a._id,
        })),
    ]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit)

    return activities
}

const getStudentRecentActivity = async (studentId, limit) => {
    // 1. Recent Quiz Attempts
    const attempts = await QuizAttempt.find({
        student: studentId,
        status: "submitted",
    })
        .sort({ submittedAt: -1 })
        .limit(limit)
        .populate("quiz", "title")
        .populate("class", "subjectName")

    // 2. New Quizzes Published in enrolled classes
    const enrolledClassIds = await getStudentClassIds(studentId)
    const newQuizzes = await Quiz.find({
        classId: { $in: enrolledClassIds },
        status: "published",
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("classId", "subjectName")

    const activities = [
        ...attempts.map((a) => ({
            type: "submission",
            title: `You submitted "${a.quiz.title}"`,
            subtitle: `Score: ${Math.round(a.percentage)}%`,
            status: "completed",
            timestamp: a.submittedAt,
            id: a._id,
        })),
        ...newQuizzes.map((q) => ({
            type: "new_quiz",
            title: `New Quiz: "${q.title}"`,
            subtitle: q.classId?.subjectName,
            status: "active",
            timestamp: q.createdAt,
            id: q._id,
        })),
    ]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit)

    return activities
}

const getFacultyUpcomingEvents = async (facultyId, limit) => {
    // Implementation for faculty upcoming events
    return []
}

const getStudentUpcomingEvents = async (studentId, limit) => {
    // Implementation for student upcoming events
    return []
}

export {
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
}
