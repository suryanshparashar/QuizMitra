import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
    Users,
    BookOpen,
    FileText,
    Play,
    Plus,
    Eye,
    Calendar,
    TrendingUp,
    Clock,
    CheckCircle,
} from "lucide-react"
import { api } from "../../services/api.js"

export default function FacultyDashboard() {
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const response = await api.get("/dashboard")
            setDashboardData(response.data.data)
        } catch (error) {
            console.error("Error fetching dashboard:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 font-medium">
                        Loading dashboard...
                    </p>
                </div>
            </div>
        )
    }

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
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Faculty Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Manage your classes, quizzes, and track student progress
                    </p>
                </div>

                {/* Overview Stats */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                        Overview
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
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

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
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

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
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

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Active Quizzes
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {dashboardData?.overview
                                            ?.activeQuizzes || 0}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Play className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Your Classes */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                        <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                                        Your Classes
                                    </h2>
                                    <Link to="/classes/create">
                                        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create New Class
                                        </button>
                                    </Link>
                                </div>
                            </div>

                            <div className="p-6">
                                {dashboardData?.classes?.length === 0 ? (
                                    <div className="text-center py-8">
                                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">
                                            No classes created yet
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {dashboardData?.classes?.map(
                                            (classItem) => (
                                                <div
                                                    key={classItem._id}
                                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow duration-200"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                                {
                                                                    classItem.subjectName
                                                                }
                                                            </h3>
                                                            <p className="text-sm text-gray-600 mb-3">
                                                                Code:{" "}
                                                                <span className="font-mono font-medium">
                                                                    {
                                                                        classItem.subjectCode
                                                                    }
                                                                </span>
                                                            </p>

                                                            <div className="flex items-center space-x-6 text-sm text-gray-500">
                                                                <div className="flex items-center">
                                                                    <Users className="h-4 w-4 mr-1" />
                                                                    {
                                                                        classItem.totalStudents
                                                                    }{" "}
                                                                    Students
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <FileText className="h-4 w-4 mr-1" />
                                                                    {
                                                                        classItem.totalQuizzes
                                                                    }{" "}
                                                                    Quizzes
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-2 ml-4">
                                                            <Link
                                                                to={`/classes/${classItem._id}`}
                                                            >
                                                                <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors duration-200">
                                                                    <Eye className="h-4 w-4 mr-1" />
                                                                    View Details
                                                                </button>
                                                            </Link>
                                                            <Link
                                                                to={`/quizzes/create?classId=${classItem._id}`}
                                                            >
                                                                <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors duration-200">
                                                                    <Plus className="h-4 w-4 mr-1" />
                                                                    Create Quiz
                                                                </button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activities */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                    <Clock className="h-5 w-5 mr-2 text-blue-600" />
                                    Recent Activities
                                </h2>
                            </div>

                            <div className="p-6">
                                {dashboardData?.recentActivities?.length ===
                                0 ? (
                                    <div className="text-center py-8">
                                        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-sm">
                                            No recent activities
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {dashboardData?.recentActivities?.map(
                                            (activity) => (
                                                <div
                                                    key={activity._id}
                                                    className="border-l-4 border-blue-200 pl-4 py-2"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900 mb-1">
                                                                {activity.title}
                                                            </p>
                                                            <div className="flex items-center mb-2">
                                                                <span
                                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                                        activity.status
                                                                    )}`}
                                                                >
                                                                    {getStatusIcon(
                                                                        activity.status
                                                                    )}
                                                                    <span className="ml-1">
                                                                        {
                                                                            activity.status
                                                                        }
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center text-xs text-gray-500">
                                                                <Calendar className="h-3 w-3 mr-1" />
                                                                {new Date(
                                                                    activity.createdAt
                                                                ).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
