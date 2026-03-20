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
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        All Classes
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Manage and review all classes created by you.
                    </p>
                </div>

                <Link
                    to="/classes/create"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-purple-700 shadow-sm hover:shadow-md transition"
                >
                    <PlusCircle className="w-4 h-4" />
                    Create Class
                </Link>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            {!error && classes.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h2 className="text-lg font-semibold text-gray-800">
                        No classes created yet
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 mb-4">
                        Start by creating your first class to invite students.
                    </p>
                    <Link
                        to="/classes/create"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 transition"
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
                                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition"
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
                                    <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-700 px-2.5 py-1 text-xs font-semibold">
                                        {classItem.classCode}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Users className="w-4 h-4" />
                                        {studentCount} Students
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="w-4 h-4" />
                                        Sem {classItem.semester || "-"}
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between">
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
