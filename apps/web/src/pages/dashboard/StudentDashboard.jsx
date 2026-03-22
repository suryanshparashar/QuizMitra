import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
    BookOpen,
    Clock,
    CheckCircle,
    Calendar,
    TrendingUp,
} from "lucide-react"
import { api } from "../../services/api.js"
import { DashboardSkeleton } from "../../components/LoadingStates"
import { useAuthStore } from "../../store/authStore"
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Line,
    ReferenceLine,
} from "recharts"

export default function StudentDashboard() {
    const { user } = useAuthStore()
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [quizTab, setQuizTab] = useState("active")
    const [quizzes, setQuizzes] = useState([])
    const [quizzesLoading, setQuizzesLoading] = useState(false)

    const [analyticsData, setAnalyticsData] = useState([])

    const chartData = analyticsData.map((point, index) => ({
        ...point,
        shortName:
            point?.name && point.name.length > 12
                ? `${point.name.slice(0, 12)}...`
                : point?.name || `Quiz ${index + 1}`,
    }))
    const latestScore = Number(chartData.at(-1)?.score || 0)
    const previousScore = Number(chartData.at(-2)?.score || 0)
    const trendDelta = Number((latestScore - previousScore).toFixed(1))
    const averageScore =
        chartData.length > 0
            ? Number(
                  (
                      chartData.reduce(
                          (sum, point) => sum + Number(point?.score || 0),
                          0
                      ) / chartData.length
                  ).toFixed(1)
              )
            : 0

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardRes, analyticsRes] = await Promise.all([
                    api.get("/dashboard"),
                    api.get("/dashboard/analytics"),
                ])
                setDashboardData(dashboardRes.data.data)
                setAnalyticsData(analyticsRes.data.data.chartData)
            } catch (error) {
                console.error("Error fetching dashboard:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    useEffect(() => {
        fetchQuizzes()
    }, [quizTab])

    const fetchQuizzes = async () => {
        setQuizzesLoading(true)
        try {
            const response = await api.get(
                `/quizzes/student/quizzes?status=${quizTab}`
            )
            setQuizzes(response.data.data)
        } catch (error) {
            console.error("Error fetching quizzes:", error)
        } finally {
            setQuizzesLoading(false)
        }
    }

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <div
            className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 py-8"
            style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                  repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 32px,
                    rgba(0, 0, 0, 0.015) 32px,
                    rgba(0, 0, 0, 0.015) 33px
                  ),
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 32px,
                    rgba(0, 0, 0, 0.015) 32px,
                    rgba(0, 0, 0, 0.015) 33px
                  )
                `,
                backgroundBlendMode: "overlay",
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="relative overflow-hidden mb-8 rounded-3xl border border-blue-100 bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 px-6 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.18)] sm:px-8">
                    <div className="pointer-events-none absolute -top-14 -right-10 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-12 left-20 h-36 w-36 rounded-full bg-indigo-300/20 blur-2xl" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/90 mb-2">
                                Student Workspace
                            </p>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                Welcome back, {user?.studentId || "Student"}!
                            </h1>
                            <p className="text-blue-100/90">
                                Track your progress and upcoming quizzes from
                                one clean view.
                            </p>
                        </div>
                        {user?.studentId && (
                            <div className="flex items-center bg-white/10 backdrop-blur px-4 py-2.5 rounded-xl border border-white/20">
                                <span className="text-sm text-blue-100 mr-2">
                                    Student ID:
                                </span>
                                <span className="font-mono font-semibold text-white">
                                    {user.studentId}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Enrolled Classes"
                        value={dashboardData?.overview?.enrolledClasses || 0}
                        icon={BookOpen}
                        color="blue"
                    />
                    <StatCard
                        title="Completed Quizzes"
                        value={dashboardData?.overview?.completedQuizzes || 0}
                        icon={CheckCircle}
                        color="green"
                    />
                    <StatCard
                        title="Average Score"
                        value={`${dashboardData?.overview?.averageScore || 0}%`}
                        icon={TrendingUp}
                        color="purple"
                    />
                    <StatCard
                        title="Upcoming Deadlines"
                        value={dashboardData?.overview?.upcomingDeadlines || 0}
                        icon={Clock}
                        color="orange"
                    />
                </div>

                {/* Performance Chart */}
                <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                            <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
                            Performance Trend
                        </h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                Latest: {latestScore.toFixed(1)}%
                            </span>
                            <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                                    trendDelta >= 0
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-rose-200 bg-rose-50 text-rose-700"
                                }`}
                            >
                                Trend: {trendDelta >= 0 ? "+" : ""}
                                {trendDelta}%
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                Avg: {averageScore.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    <div className="h-72 rounded-xl border border-slate-100 bg-gradient-to-b from-indigo-50/40 to-white p-3">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient
                                            id="colorScore"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#6366f1"
                                                stopOpacity={0.22}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#6366f1"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#E2E8F0"
                                    />
                                    <XAxis
                                        dataKey="shortName"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "#64748B" }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        domain={[0, 100]}
                                        tick={{ fontSize: 12, fill: "#64748B" }}
                                    />
                                    <Tooltip
                                        labelFormatter={(_, payload) =>
                                            payload?.[0]?.payload?.name ||
                                            "Quiz"
                                        }
                                        formatter={(value, dataKey) => {
                                            if (dataKey === "score") {
                                                return [`${value}%`, "Score"]
                                            }
                                            return [value, dataKey]
                                        }}
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "1px solid #E2E8F0",
                                            background: "#FFFFFF",
                                            boxShadow:
                                                "0 10px 15px -3px rgb(15 23 42 / 0.12)",
                                        }}
                                    />
                                    <ReferenceLine
                                        y={averageScore}
                                        stroke="#94A3B8"
                                        strokeDasharray="5 5"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="none"
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                        name="Score (%)"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#4f46e5"
                                        strokeWidth={3}
                                        dot={{
                                            r: 4,
                                            strokeWidth: 2,
                                            fill: "#fff",
                                        }}
                                        activeDot={{
                                            r: 6,
                                            strokeWidth: 2,
                                            fill: "#fff",
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                                <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
                                <p className="font-medium">
                                    No performance data yet
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Complete quizzes to unlock your trend
                                    analytics.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Quiz List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-98 overflow-hidden">
                            <div className="border-b border-slate-200 bg-slate-50/80">
                                <div className="flex items-center justify-between px-2 sm:px-4">
                                    <nav className="flex py-2 gap-1">
                                        {[
                                            "active",
                                            "upcoming",
                                            "completed",
                                            "missed",
                                        ].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setQuizTab(tab)}
                                                className={`py-2 px-4 rounded-lg text-sm font-medium transition ${
                                                    quizTab === tab
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "text-gray-600 hover:text-gray-900 hover:bg-white"
                                                }`}
                                            >
                                                {tab.charAt(0).toUpperCase() +
                                                    tab.slice(1)}
                                            </button>
                                        ))}
                                    </nav>
                                    <Link
                                        to={`/student/quizzes?status=${quizTab}`}
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        View All
                                    </Link>
                                </div>
                            </div>

                            <div className="p-6">
                                {quizzesLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </div>
                                ) : quizzes.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                            <BookOpen className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                            No {quizTab} quizzes
                                        </h3>
                                        <p className="text-gray-500 mt-1">
                                            You're all caught up!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {quizzes.slice(0, 2).map((quiz) => (
                                            <QuizCard
                                                key={quiz._id}
                                                quiz={quiz}
                                                tab={quizTab}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Recent Activity */}
                    <div className="space-y-6">
                        {/* Recent Activity */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Recent Activity
                                </h2>
                                <Link
                                    to="/student/quizzes?status=completed"
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                    View All
                                </Link>
                            </div>
                            <div className="space-y-4">
                                {dashboardData?.recentAttempts?.length === 0 ? (
                                    <p className="text-gray-500 text-sm">
                                        No recent activity
                                    </p>
                                ) : (
                                    dashboardData?.recentAttempts
                                        ?.slice(0, 5)
                                        .map((attempt) => (
                                            <div
                                                key={attempt._id}
                                                className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                                            >
                                                <div
                                                    className={`mt-1 h-2 w-2 rounded-full ${
                                                        attempt.isPassed
                                                            ? "bg-green-500"
                                                            : "bg-red-500"
                                                    }`}
                                                />
                                                <div>
                                                    <p className="text-sm text-gray-900 font-medium">
                                                        {attempt.quiz?.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Score: {attempt.grade} (
                                                        {attempt.percentage}%) •{" "}
                                                        {new Date(
                                                            attempt.createdAt
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color }) {
    const colorConfig = {
        blue: {
            bg: "from-blue-50/80 to-white",
            border: "border-blue-100/50",
            label: "text-blue-600",
            icon: "from-blue-500 to-blue-600",
            gradient: "bg-blue-200/30",
            hoverGradient: "group-hover:bg-blue-300/40",
        },
        green: {
            bg: "from-emerald-50/80 to-white",
            border: "border-emerald-100/50",
            label: "text-emerald-600",
            icon: "from-emerald-500 to-emerald-600",
            gradient: "bg-emerald-200/30",
            hoverGradient: "group-hover:bg-emerald-300/40",
        },
        purple: {
            bg: "from-violet-50/80 to-white",
            border: "border-violet-100/50",
            label: "text-violet-600",
            icon: "from-violet-500 to-violet-600",
            gradient: "bg-violet-200/30",
            hoverGradient: "group-hover:bg-violet-300/40",
        },
        indigo: {
            bg: "from-indigo-50/80 to-white",
            border: "border-indigo-100/50",
            label: "text-indigo-600",
            icon: "from-indigo-500 to-indigo-600",
            gradient: "bg-indigo-200/30",
            hoverGradient: "group-hover:bg-indigo-300/40",
        },
        orange: {
            bg: "from-amber-50/80 to-white",
            border: "border-amber-100/50",
            label: "text-amber-600",
            icon: "from-amber-500 to-amber-600",
            gradient: "bg-amber-200/30",
            hoverGradient: "group-hover:bg-amber-300/40",
        },
    }

    const config = colorConfig[color] || colorConfig.blue

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl shadow-sm border ${config.border} bg-gradient-to-br ${config.bg} p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
        >
            <div
                className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full ${config.gradient} blur-2xl ${config.hoverGradient} transition-all duration-300`}
            />
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p
                        className={`text-xs font-semibold uppercase tracking-wider ${config.label} mb-1`}
                    >
                        {title}
                    </p>
                    <p className="text-4xl font-bold text-slate-900 mt-2">
                        {value}
                    </p>
                </div>
                <div
                    className={`h-16 w-16 bg-gradient-to-br ${config.icon} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}
                >
                    <Icon className="h-8 w-8 text-white" />
                </div>
            </div>
        </div>
    )
}

function QuizCard({ quiz, tab }) {
    const isMissed = tab === "missed"
    const isCompleted = tab === "completed"

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gradient-to-r from-white to-slate-50/80 border border-slate-200 rounded-xl hover:shadow-md transition-shadow duration-200">
            <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                        {quiz.title}
                    </h3>
                    {isMissed && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium">
                            Missed
                        </span>
                    )}
                    {isCompleted && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                            Completed
                        </span>
                    )}
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                    <p className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2" />
                        {quiz.classId?.subjectName} ({quiz.classId?.subjectCode}
                        )
                    </p>
                    <p className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Due: {new Date(quiz.deadline).toLocaleString()}
                    </p>
                    <p className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Duration: {quiz.duration} mins
                    </p>
                </div>
            </div>

            <div>
                {tab === "active" && (
                    <Link to={`/quizzes/${quiz._id}`}>
                        <button className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                            Start Quiz
                        </button>
                    </Link>
                )}
                {tab === "upcoming" && (
                    <button
                        disabled
                        className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed"
                    >
                        Starts {new Date(quiz.scheduledAt).toLocaleDateString()}
                    </button>
                )}
                {tab === "completed" && (
                    <Link to={`/quiz-results/${quiz.attempt?._id}`}>
                        <button className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                            View Result
                        </button>
                    </Link>
                )}
            </div>
        </div>
    )
}
