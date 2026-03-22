import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
    Users,
    BookOpen,
    FileText,
    Play,
    Plus,
    Calendar,
    TrendingUp,
    Clock,
    CheckCircle,
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
} from "recharts"

export default function FacultyDashboard() {
    const { user } = useAuthStore()
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const dashboardRes = await api.get("/dashboard")
                setDashboardData(dashboardRes.data.data)
            } catch (error) {
                console.error("Error fetching dashboard:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) {
        return <DashboardSkeleton />
    }

    const attemptAverageTrend = dashboardData?.last10AttemptAverageTrend || []
    const chartData = attemptAverageTrend.map((point, index) => ({
        ...point,
        shortName:
            point.name && point.name.length > 16
                ? `${point.name.slice(0, 16)}...`
                : point.name || `Quiz ${index + 1}`,
    }))

    const latestAvgScore = Number(chartData.at(-1)?.avgScore || 0)
    const previousAvgScore = Number(chartData.at(-2)?.avgScore || 0)
    const trendDelta = Number((latestAvgScore - previousAvgScore).toFixed(1))

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "active":
                return "bg-green-100 text-green-800"
            case "completed":
                return "bg-blue-100 text-blue-800"
            case "draft":
                return "bg-yellow-100 text-yellow-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case "active":
                return <Play className="h-3 w-3" />
            case "completed":
                return <CheckCircle className="h-3 w-3" />
            default:
                return <Clock className="h-3 w-3" />
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="relative overflow-hidden mb-8 rounded-3xl border border-blue-100 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-6 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.18)] sm:px-8">
                    <div className="pointer-events-none absolute -top-14 -right-10 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-12 left-20 h-36 w-36 rounded-full bg-indigo-300/20 blur-2xl" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/90 mb-2">
                                Faculty Workspace
                            </p>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                Faculty Dashboard
                            </h1>
                            <p className="text-blue-100/90">
                                Manage classes, launch quizzes, and monitor
                                class-wide performance.
                            </p>
                        </div>
                        {user?.facultyId && (
                            <div className="flex items-center bg-white/10 backdrop-blur px-4 py-2.5 rounded-xl border border-white/20">
                                <span className="text-sm text-blue-100 mr-2">
                                    Faculty ID:
                                </span>
                                <span className="font-mono font-semibold text-white">
                                    {user.facultyId}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                        Overview
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Total Classes
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {dashboardData?.overview
                                            ?.totalClasses || 0}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Total Students
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {dashboardData?.overview
                                            ?.totalStudents || 0}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Users className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Total Quizzes
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {dashboardData?.overview
                                            ?.totalQuizzes || 0}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Avg Performance
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {dashboardData?.overview
                                            ?.averagePerformance || 0}
                                        %
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="mb-8">
                    {/* Analytics Chart */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-blue-50 rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-blue-200/30 blur-2xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-12 w-44 h-44 rounded-full bg-indigo-200/20 blur-3xl" />

                        <div className="relative z-10">
                            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                                    <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                                    Quiz-wise Average Performance (Last 10
                                    Quizzes)
                                </h2>
                                <span className="inline-flex items-center rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-semibold w-fit">
                                    Updated Live
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold border border-blue-200">
                                    Latest Avg: {latestAvgScore.toFixed(1)}%
                                </span>
                                <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                                        trendDelta >= 0
                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                            : "bg-rose-100 text-rose-700 border-rose-200"
                                    }`}
                                >
                                    Trend: {trendDelta >= 0 ? "+" : ""}
                                    {trendDelta}%
                                </span>
                                <span className="inline-flex items-center rounded-full bg-white/80 backdrop-blur text-slate-700 px-3 py-1 text-xs font-semibold border border-slate-200">
                                    Quizzes: {chartData.length}
                                </span>
                            </div>

                            <div className="h-80 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm p-2 sm:p-3">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient
                                                    id="facultyAvgArea"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="#4f46e5"
                                                        stopOpacity={0.2}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="#4f46e5"
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
                                                tick={{
                                                    fontSize: 12,
                                                    fill: "#64748B",
                                                }}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{
                                                    fontSize: 12,
                                                    fill: "#64748B",
                                                }}
                                            />
                                            <Tooltip
                                                labelFormatter={(_, payload) =>
                                                    payload?.[0]?.payload
                                                        ?.name || "Quiz"
                                                }
                                                formatter={(value, dataKey) => {
                                                    if (
                                                        dataKey === "avgScore"
                                                    ) {
                                                        return [
                                                            `${value}%`,
                                                            "Quiz Avg Score",
                                                        ]
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
                                            <Area
                                                type="monotone"
                                                dataKey="avgScore"
                                                stroke="none"
                                                fill="url(#facultyAvgArea)"
                                                isAnimationActive={false}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="avgScore"
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
                                                name="Quiz Avg Score (%)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                                        <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
                                        <p className="font-medium">
                                            No submitted quiz data yet
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Publish and evaluate quizzes to see
                                            the trend.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                                <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                                Manage Classes
                            </h2>
                            <p className="text-sm text-slate-600 mt-1">
                                Use the dedicated classes page to manage
                                students, quizzes, and class details.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link to="/classes">
                                <button className="inline-flex items-center px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors duration-200 cursor-pointer">
                                    View Classes
                                </button>
                            </Link>
                            <Link to="/classes/create">
                                <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New Class
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
