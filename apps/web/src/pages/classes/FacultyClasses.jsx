import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BookOpen, Users, PlusCircle, ArrowRight, Calendar } from "lucide-react"
import { api } from "../../services/api.js"

export default function FacultyClasses() {
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const response = await api.get("/classes/my-classes")
                setClasses(
                    Array.isArray(response?.data?.data)
                        ? response.data.data
                        : []
                )
            } catch (err) {
                console.error("Failed to fetch faculty classes:", err)
                setError(
                    err?.response?.data?.message ||
                        "Failed to load classes. Please try again."
                )
            } finally {
                setLoading(false)
            }
        }

        fetchClasses()
    }, [])

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
                    <p className="text-sm text-gray-600">Loading classes...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative space-y-6">
            <div className="pointer-events-none absolute -top-8 -left-8 h-40 w-40 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="pointer-events-none absolute top-10 right-0 h-44 w-44 rounded-full bg-indigo-300/20 blur-3xl" />

            <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-6 sm:p-7 text-white shadow-lg overflow-hidden">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_45%)]" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-blue-100 text-xs font-semibold tracking-[0.15em] uppercase">
                            Faculty Workspace
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-bold mt-1">
                            All Classes
                        </h1>
                        <p className="text-sm text-blue-100/90 mt-1.5">
                            Manage and review all classes created by you.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur-sm ring-1 ring-white/20">
                            {classes.length} Total
                        </span>
                        <Link
                            to="/classes/create"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-900 bg-white hover:bg-blue-50 shadow-sm transition"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Create Class
                        </Link>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                        Class Directory
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Open a class to manage students, quizzes, and
                        communication.
                    </p>
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">
                    {error}
                </div>
            ) : null}

            {!error && classes.length === 0 ? (
                <div className="bg-white/85 backdrop-blur-md ring-1 ring-blue-100 rounded-2xl p-10 text-center shadow-lg">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h2 className="text-lg font-semibold text-gray-800">
                        No classes created yet
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 mb-4">
                        Start by creating your first class to invite students.
                    </p>
                    <Link
                        to="/classes/create"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 transition ring-1 ring-primary-100"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Create First Class
                    </Link>
                </div>
            ) : null}

            {classes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {classes.map((classItem) => {
                        const studentCount = Array.isArray(classItem?.students)
                            ? classItem.students.filter(
                                  (s) => s.status === "active"
                              ).length
                            : classItem?.totalStudents || 0

                        return (
                            <div
                                key={classItem._id}
                                className="bg-white/85 backdrop-blur-sm ring-1 ring-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:ring-blue-200 transition"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {classItem.subjectName}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {classItem.subjectCode}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-700 px-2.5 py-1 text-xs font-semibold ring-1 ring-primary-100">
                                        {classItem.classCode}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600 bg-blue-50/70 rounded-lg px-2.5 py-2">
                                        <Users className="w-4 h-4" />
                                        {studentCount} Students
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 bg-indigo-50/70 rounded-lg px-2.5 py-2">
                                        <Calendar className="w-4 h-4" />
                                        Sem {classItem.semester || "-"}
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <Link
                                        to={`/classes/${classItem._id}`}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
                                    >
                                        View Details
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>

                                    <Link
                                        to={`/quizzes/create?classId=${classItem._id}`}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800"
                                    >
                                        Create Quiz
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}
