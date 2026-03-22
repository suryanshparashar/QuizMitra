import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuthStore } from "../../store/authStore.js"
import {
    Users,
    BookOpen,
    MapPin,
    Calendar,
    Clock,
    BarChart3,
    MessageSquare,
    GraduationCap,
    Hash,
    User,
    Shield,
    ShieldOff,
    Trash2,
    Check,
    Copy,
    FileText,
} from "lucide-react"
import { api } from "../../services/api.js"

export default function ClassDetails() {
    const { classId } = useParams() // Reverted back to classId since App.jsx maps to :classId
    const [classData, setClassData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [quizzes, setQuizzes] = useState([])
    const [quizzesLoading, setQuizzesLoading] = useState(true)
    const [error, setError] = useState("")
    const { user } = useAuthStore()
    const [actionLoading, setActionLoading] = useState(null) // studentId of loading action
    const [copied, setCopied] = useState(false)
    const [activeTab, setActiveTab] = useState(
        user?.role === "faculty" ? "students" : "quizzes"
    )
    const [showAllQuizzes, setShowAllQuizzes] = useState(false)

    const MAX_VISIBLE_QUIZZES = 6

    useEffect(() => {
        fetchClassDetails()
        fetchQuizzes()
    }, [classId])

    const fetchQuizzes = async () => {
        try {
            const response = await api.get(`/quizzes/class/${classId}/quizzes`)
            setQuizzes(response.data.data.quizzes || response.data.data) // Depending on pagination structure
        } catch (err) {
            console.error("Failed to fetch quizzes:", err)
        } finally {
            setQuizzesLoading(false)
        }
    }

    const fetchClassDetails = async () => {
        try {
            const response = await api.get(`/classes/id/${classId}`) // Use the new dedicated get-by-id endpoint
            setClassData(response.data.data)
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to fetch class details"
            )
        } finally {
            setLoading(false)
        }
    }

    const isFaculty =
        user?._id === classData?.faculty?._id ||
        user?._id === classData?.faculty

    const handleAssignCR = async (studentId) => {
        if (
            !confirm(
                "Are you sure you want to assign this student as Class Representative?"
            )
        )
            return
        setActionLoading(studentId)
        try {
            await api.post(`/classes/${classData._id}/cr/assign/${studentId}`)
            fetchClassDetails() // Refresh data
        } catch (error) {
            console.error("Error assigning CR:", error)
            alert("Failed to assign CR")
        } finally {
            setActionLoading(null)
        }
    }

    const handleRemoveCR = async () => {
        if (
            !confirm(
                "Are you sure you want to remove the Class Representative?"
            )
        )
            return
        const crId =
            classData.classRepresentative?._id || classData.classRepresentative
        setActionLoading(crId)
        try {
            await api.delete(`/classes/${classData._id}/cr/remove`)
            fetchClassDetails()
        } catch (error) {
            console.error("Error removing CR:", error)
            alert("Failed to remove CR")
        } finally {
            setActionLoading(null)
        }
    }

    const handleRemoveStudent = async (studentId) => {
        if (
            !confirm(
                "Are you sure you want to remove this student from the class?"
            )
        )
            return
        setActionLoading(studentId)
        try {
            await api.delete(
                `/classes/${classData.classCode}/students/${studentId}/remove`
            )
            fetchClassDetails() // Refresh data
        } catch (error) {
            console.error("Error removing student:", error)
            alert("Failed to remove student")
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="bg-white/85 backdrop-blur rounded-2xl shadow-xl ring-1 ring-blue-100 p-8 max-w-md w-full mx-4">
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
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
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
    const visibleQuizzes = showAllQuizzes
        ? quizzes
        : quizzes.slice(0, MAX_VISIBLE_QUIZZES)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />
                <div className="absolute top-32 right-0 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
            </div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Class Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {classInfo.subjectName}
                    </h1>
                    <p className="text-gray-600 text-lg">
                        {classInfo.subjectCode} • {classInfo.classCode}
                    </p>

                    <div className="mt-5 inline-flex items-center rounded-xl bg-white/90 backdrop-blur-sm ring-1 ring-blue-100 p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setActiveTab("students")}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                                activeTab === "students"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-blue-50"
                            }`}
                        >
                            Students
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("quizzes")}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                                activeTab === "quizzes"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-blue-50"
                            }`}
                        >
                            Quizzes
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Class Information Card */}
                        <div className="relative overflow-hidden bg-white/90 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-blue-100 p-6">
                            <div className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-blue-200/30 blur-2xl" />
                            <div className="relative">
                                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                            <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                                            Class Information
                                        </h2>
                                        <p className="text-sm text-slate-600 mt-1">
                                            Schedule and class identity details.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold ring-1 ring-blue-100">
                                            {classInfo.totalStudents || 0}{" "}
                                            Students
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-semibold ring-1 ring-indigo-100">
                                            {quizzes.length} Quizzes
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-blue-100 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shadow-sm">
                                                <Calendar className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-blue-700/80 font-semibold">
                                                    Semester
                                                </p>
                                                <p className="font-semibold text-slate-900 mt-0.5">
                                                    {classInfo.semester || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-100 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shadow-sm">
                                                <Clock className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-emerald-700/80 font-semibold">
                                                    Slot
                                                </p>
                                                <p className="font-semibold text-slate-900 mt-0.5">
                                                    {classInfo.classSlot || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 ring-1 ring-indigo-100 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shadow-sm">
                                                <MapPin className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-indigo-700/80 font-semibold">
                                                    Venue
                                                </p>
                                                <p className="font-semibold text-slate-900 mt-0.5">
                                                    {classInfo.venue || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-100 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shadow-sm">
                                                    <Hash className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-amber-700/80 font-semibold">
                                                        Class Code
                                                    </p>
                                                    <p className="font-semibold text-slate-900 mt-0.5">
                                                        {classInfo.classCode}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(
                                                        classInfo.classCode
                                                    )
                                                    setCopied(true)
                                                    setTimeout(
                                                        () => setCopied(false),
                                                        2000
                                                    )
                                                }}
                                                className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 cursor-pointer"
                                                title="Copy Class Code"
                                            >
                                                {copied ? (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Students List */}
                        {activeTab === "students" && (
                            <div className="bg-white/85 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-blue-100 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                                    Active Students (
                                    {classInfo.totalStudents || 0})
                                </h2>
                                <div className="space-y-3">
                                    {classInfo.students
                                        ?.filter((s) => s.status === "active")
                                        .map((student) => {
                                            const isCR =
                                                classInfo.classRepresentative
                                                    ?._id ===
                                                    student.user._id ||
                                                classInfo.classRepresentative ===
                                                    student.user._id
                                            return (
                                                <div
                                                    key={student.user._id}
                                                    className={`flex items-center space-x-4 p-4 rounded-xl transition-all ${isCR ? "bg-gradient-to-r from-blue-50 to-indigo-50 ring-1 ring-blue-200 shadow-sm" : "bg-white/80 ring-1 ring-slate-100 hover:ring-blue-200 hover:shadow-sm"}`}
                                                >
                                                    <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${isCR ? "bg-blue-600" : "bg-gradient-to-br from-blue-500 to-purple-600"}`}
                                                    >
                                                        {isCR ? (
                                                            <Shield className="w-5 h-5 text-white" />
                                                        ) : (
                                                            <User className="w-5 h-5 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2">
                                                            <p className="font-medium text-gray-900">
                                                                {
                                                                    student.user
                                                                        .fullName
                                                                }
                                                            </p>
                                                            {isCR && (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                                                    Class Rep
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-500">
                                                            {student.user.email}
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

                                                    {/* Faculty Actions */}
                                                    {isFaculty && (
                                                        <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-blue-100">
                                                            {isCR ? (
                                                                <button
                                                                    onClick={
                                                                        handleRemoveCR
                                                                    }
                                                                    disabled={
                                                                        actionLoading ===
                                                                        student
                                                                            .user
                                                                            ._id
                                                                    }
                                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                                                    title="Revoke CR Status"
                                                                >
                                                                    <ShieldOff className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() =>
                                                                        handleAssignCR(
                                                                            student
                                                                                .user
                                                                                ._id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        actionLoading ===
                                                                        student
                                                                            .user
                                                                            ._id
                                                                    }
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                                    title="Assign as CR"
                                                                >
                                                                    <Shield className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() =>
                                                                    handleRemoveStudent(
                                                                        student
                                                                            .user
                                                                            ._id
                                                                    )
                                                                }
                                                                disabled={
                                                                    actionLoading ===
                                                                    student.user
                                                                        ._id
                                                                }
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                                title="Remove Student"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
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
                        )}

                        {/* Quizzes List */}
                        {activeTab === "quizzes" && (
                            <div className="relative overflow-hidden bg-white/90 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-blue-100 p-6">
                                <div className="pointer-events-none absolute -top-16 -right-14 h-36 w-36 rounded-full bg-violet-200/30 blur-2xl" />
                                <div className="relative">
                                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                                                Class Quizzes
                                            </h2>
                                            <p className="text-sm text-slate-600 mt-1">
                                                Explore and manage quizzes for
                                                this class.
                                            </p>
                                        </div>
                                        {isFaculty && (
                                            <Link
                                                to={`/quizzes/create?classId=${classId}`}
                                            >
                                                <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer shadow-sm">
                                                    <FileText className="w-4 h-4" />
                                                    Create Quiz
                                                </button>
                                            </Link>
                                        )}
                                    </div>

                                    <div className="mb-5 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 px-3 py-1 text-xs font-semibold ring-1 ring-violet-100">
                                            Total: {quizzes.length}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-3 py-1 text-xs font-semibold ring-1 ring-green-100">
                                            Published:{" "}
                                            {
                                                quizzes.filter(
                                                    (q) =>
                                                        q.status === "published"
                                                ).length
                                            }
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-semibold ring-1 ring-amber-100">
                                            Draft:{" "}
                                            {
                                                quizzes.filter(
                                                    (q) => q.status === "draft"
                                                ).length
                                            }
                                        </span>
                                    </div>

                                    {quizzesLoading ? (
                                        <div className="flex flex-col items-center justify-center py-10">
                                            <div className="animate-spin rounded-full h-9 w-9 border-4 border-blue-500 border-t-transparent"></div>
                                            <p className="text-sm text-slate-500 mt-3">
                                                Loading quizzes...
                                            </p>
                                        </div>
                                    ) : quizzes.length === 0 ? (
                                        <div className="text-center py-10 rounded-xl bg-slate-50/70 ring-1 ring-slate-100">
                                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-gray-600 mb-4">
                                                {isFaculty
                                                    ? "No quizzes have been created for this class yet."
                                                    : "No active or published quizzes available for this class."}
                                            </p>
                                            {isFaculty && (
                                                <Link
                                                    to={`/quizzes/create?classId=${classId}`}
                                                >
                                                    <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors cursor-pointer ring-1 ring-blue-100">
                                                        Create First Quiz
                                                    </button>
                                                </Link>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                {visibleQuizzes.map((quiz) => (
                                                    <Link
                                                        key={quiz._id}
                                                        to={`/quizzes/${quiz._id}`}
                                                    >
                                                        <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/85 ring-1 ring-slate-100 hover:ring-blue-200 hover:bg-blue-50/60 transition-all cursor-pointer">
                                                            <div className="w-11 h-11 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                                <FileText className="w-5 h-5 text-violet-700" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-semibold text-gray-900 truncate">
                                                                    {quiz.title}
                                                                </h3>
                                                                <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                                                                    {quiz.description ||
                                                                        "No description"}
                                                                </p>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <span
                                                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                                                                        quiz.status ===
                                                                        "published"
                                                                            ? "bg-green-100 text-green-800 ring-1 ring-green-200"
                                                                            : quiz.status ===
                                                                                "draft"
                                                                              ? "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200"
                                                                              : "bg-gray-100 text-gray-800 ring-1 ring-gray-200"
                                                                    }`}
                                                                >
                                                                    {
                                                                        quiz.status
                                                                    }
                                                                </span>
                                                                <p className="text-xs text-gray-500 mt-1.5">
                                                                    {new Date(
                                                                        quiz.createdAt
                                                                    ).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>

                                            {quizzes.length >
                                                MAX_VISIBLE_QUIZZES && (
                                                <div className="pt-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowAllQuizzes(
                                                                (prev) => !prev
                                                            )
                                                        }
                                                        className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-100 cursor-pointer"
                                                    >
                                                        {showAllQuizzes
                                                            ? "Show fewer quizzes"
                                                            : `Show all ${quizzes.length} quizzes`}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Statistics Card */}
                        <div className="relative overflow-hidden bg-white/90 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-blue-100 p-6">
                            <div className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-indigo-200/25 blur-3xl" />
                            <div className="relative">
                                <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center">
                                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                                    Statistics
                                </h2>
                                <p className="text-sm text-slate-600 mb-5">
                                    Snapshot of class participation and profile.
                                </p>

                                <div className="grid grid-cols-1 gap-3">
                                    <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 ring-1 ring-blue-100 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-5 h-5 text-blue-600" />
                                                <span className="text-blue-900 font-medium">
                                                    Total Students
                                                </span>
                                            </div>
                                            <span className="text-2xl font-bold text-blue-700">
                                                {classInfo.totalStudents || 0}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 ring-1 ring-violet-100 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-violet-600" />
                                                <span className="text-violet-900 font-medium">
                                                    Total Quizzes
                                                </span>
                                            </div>
                                            <span className="text-2xl font-bold text-violet-700">
                                                {quizzes.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 ring-1 ring-emerald-100 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-5 h-5 text-emerald-600" />
                                                <span className="text-emerald-900 font-medium">
                                                    Department
                                                </span>
                                            </div>
                                            <span className="text-base font-bold text-emerald-700 text-right max-w-[55%] truncate">
                                                {classInfo.department || "-"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 ring-1 ring-amber-100 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-orange-600" />
                                                <span className="text-orange-900 font-medium">
                                                    Academic Year
                                                </span>
                                            </div>
                                            <span className="text-base font-bold text-orange-700">
                                                {classInfo.academicYear || "-"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Messages Card */}
                        <div className="bg-white/85 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-blue-100 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                                Communication
                            </h2>
                            <p className="text-gray-600 mb-4">
                                View and manage class messages and
                                announcements.
                            </p>
                            <Link to={`/classes/${classId}/messages`}>
                                <button className="w-full bg-gradient-to-r from-slate-100 to-blue-100/80 text-gray-700 px-4 py-3 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-colors flex items-center justify-center space-x-2 cursor-pointer ring-1 ring-blue-100">
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
