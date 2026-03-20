import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
    BookOpen,
    Clock,
    CheckCircle,
    AlertCircle,
    Play,
    Calendar,
    ChevronRight,
    TrendingUp,
} from "lucide-react"
import { api } from "../../services/api.js"
import { DashboardSkeleton } from "../../components/LoadingStates"
import { useAuthStore } from "../../store/authStore"
import JoinClassModal from "../../components/JoinClassModal"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts"

export default function StudentDashboard() {
    const { user } = useAuthStore()
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [quizTab, setQuizTab] = useState("active")
    const [quizzes, setQuizzes] = useState([])
    const [quizzesLoading, setQuizzesLoading] = useState(false)
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

    const [analyticsData, setAnalyticsData] = useState([])

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
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome back, {user?.studentId || "Student"}!
                        </h1>
                        <p className="text-gray-600">
                            Track your progress and upcoming quizzes
                        </p>
                    </div>
                    {user?.studentId && (
                        <div className="mt-4 sm:mt-0 flex items-center bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                            <span className="text-sm text-gray-500 mr-2">
                                Student ID:
                            </span>
                            <span className="font-mono font-medium text-indigo-700">
                                {user.studentId}
                            </span>
                        </div>
                    )}
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
                        Performance Trend
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData}>
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
                                            stopOpacity={0.1}
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
                                />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow:
                                            "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorScore)"
                                    name="Score (%)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Quiz List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="border-b border-gray-200">
                                <div className="flex items-center justify-between px-2 sm:px-4">
                                    <nav className="flex -mb-px">
                                        {[
                                            "active",
                                            "upcoming",
                                            "completed",
                                            "missed",
                                        ].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setQuizTab(tab)}
                                                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors duration-200 ${
                                                    quizTab === tab
                                                        ? "border-indigo-600 text-indigo-600"
                                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
                                        {quizzes.slice(0, 3).map((quiz) => (
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

                    {/* Sidebar - Recent Activity & Classes */}
                    <div className="space-y-6">
                        {/* Enrolled Classes */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Your Classes
                                </h2>
                                <button
                                    onClick={() => setIsJoinModalOpen(true)}
                                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium cursor-pointer"
                                >
                                    Join New
                                </button>
                            </div>
                            <div className="space-y-3">
                                {dashboardData?.enrolledClasses
                                    ?.slice(0, 5)
                                    .map((cls) => (
                                        <Link
                                            key={cls._id}
                                            to={`/classes/${cls._id}`}
                                            className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-medium text-gray-900">
                                                        {cls.subjectName}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        {cls.subjectCode} •{" "}
                                                        {cls.faculty?.fullName}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
                                                className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0"
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

            <JoinClassModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
            />
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color }) {
    const colors = {
        blue: "bg-blue-100 text-blue-600",
        green: "bg-green-100 text-green-600",
        purple: "bg-purple-100 text-purple-600",
        indigo: "bg-indigo-100 text-indigo-600",
        orange: "bg-orange-100 text-orange-600",
    }

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                        {value}
                    </p>
                </div>
                <div
                    className={`h-12 w-12 rounded-lg ${colors[color]} flex items-center justify-center`}
                >
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    )
}

function QuizCard({ quiz, tab }) {
    const isMissed = tab === "missed"
    const isCompleted = tab === "completed"

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200">
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
