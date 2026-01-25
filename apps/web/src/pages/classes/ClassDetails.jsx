import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import {
    Users,
    BookOpen,
    MapPin,
    Calendar,
    Clock,
    BarChart3,
    Plus,
    MessageSquare,
    ArrowLeft,
    GraduationCap,
    Hash,
    User,
} from "lucide-react"
import { api } from "../../services/api.js"

export default function ClassDetails() {
    const { classCode } = useParams() // Changed from classId to classCode
    const [classData, setClassData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        fetchClassDetails()
    }, [classCode]) // Changed from classId to classCode

    const fetchClassDetails = async () => {
        try {
            const response = await api.get(`/classes/${classCode}`) // Using classCode in URL
            setClassData(response.data.data)
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to fetch class details"
            )
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="text-gray-600 text-lg">
                        Loading class details...
                    </p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Error Loading Class
                        </h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={fetchClassDetails}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Updated data structure - no more nested objects
    const classInfo = classData

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/classes"
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Back to Classes</span>
                            </Link>
                        </div>
                        <Link to={`/quizzes/create?classCode=${classCode}`}>
                            {" "}
                            {/* Changed classId to classCode */}
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm">
                                <Plus className="w-4 h-4" />
                                <span>Create Quiz</span>
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Class Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {classInfo.subjectName}
                    </h1>
                    <p className="text-gray-600 text-lg">
                        {classInfo.subjectCode} • {classInfo.classCode}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Class Information Card */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                                Class Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Semester
                                        </p>
                                        <p className="font-medium text-gray-900">
                                            {classInfo.semester}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Slot
                                        </p>
                                        <p className="font-medium text-gray-900">
                                            {classInfo.classSlot}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Venue
                                        </p>
                                        <p className="font-medium text-gray-900">
                                            {classInfo.venue}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <Hash className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Class Code
                                        </p>
                                        <p className="font-medium text-gray-900">
                                            {classInfo.classCode}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Students List */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-blue-600" />
                                Active Students ({classInfo.totalStudents ||
                                    0}) {/* Updated to use totalStudents */}
                            </h2>
                            <div className="space-y-3">
                                {classInfo.students
                                    ?.filter((s) => s.status === "active")
                                    .map((student) => (
                                        <div
                                            key={student.user._id}
                                            className="flex items-center space-x-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                                        >
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">
                                                    {student.user.fullName}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {student.user.email}{" "}
                                                    {/* Updated to show email instead of studentId */}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-500">
                                                    Joined
                                                </p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {new Date(
                                                        student.joinedAt
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                {(!classInfo.students ||
                                    classInfo.students.filter(
                                        (s) => s.status === "active"
                                    ).length === 0) && (
                                    <div className="text-center py-8">
                                        <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">
                                            No active students in this class
                                            yet.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Statistics Card */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                                Statistics
                            </h2>
                            <div className="space-y-4">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Users className="w-5 h-5 text-blue-600" />
                                            <span className="text-blue-900 font-medium">
                                                Total Students
                                            </span>
                                        </div>
                                        <span className="text-2xl font-bold text-blue-600">
                                            {classInfo.totalStudents || 0}{" "}
                                            {/* Updated */}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <BookOpen className="w-5 h-5 text-green-600" />
                                            <span className="text-green-900 font-medium">
                                                Department
                                            </span>
                                        </div>
                                        <span className="text-lg font-bold text-green-600">
                                            {classInfo.department}{" "}
                                            {/* Changed from totalQuizzes to department */}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="w-5 h-5 text-orange-600" />
                                            <span className="text-orange-900 font-medium">
                                                Academic Year
                                            </span>
                                        </div>
                                        <span className="text-lg font-bold text-orange-600">
                                            {classInfo.academicYear}{" "}
                                            {/* Changed from activeQuizzes to academicYear */}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Messages Card */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                                Communication
                            </h2>
                            <p className="text-gray-600 mb-4">
                                View and manage class messages and
                                announcements.
                            </p>
                            <Link to={`/classes/${classCode}/messages`}>
                                {" "}
                                {/* Changed classId to classCode */}
                                <button className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>View Messages</span>
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
