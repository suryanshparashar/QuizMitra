import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, BookOpen, Calendar, Clock } from "lucide-react"
import { api } from "../../services/api.js"

const STATUS_OPTIONS = ["all", "active", "upcoming", "completed", "missed"]

export default function StudentQuizzesList() {
    const [searchParams, setSearchParams] = useSearchParams()
    const initialStatus = searchParams.get("status") || "all"
    const [status, setStatus] = useState(
        STATUS_OPTIONS.includes(initialStatus) ? initialStatus : "all"
    )
    const [quizzes, setQuizzes] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setSearchParams(status === "all" ? {} : { status })
    }, [status, setSearchParams])

    useEffect(() => {
        const fetchQuizzes = async () => {
            setLoading(true)
            try {
                const query = status === "all" ? "" : `?status=${status}`
                const response = await api.get(
                    `/quizzes/student/quizzes${query}`
                )
                setQuizzes(response.data.data || [])
            } catch (error) {
                console.error("Error fetching student quizzes:", error)
                setQuizzes([])
            } finally {
                setLoading(false)
            }
        }

        fetchQuizzes()
    }, [status])

    const emptyMessage = useMemo(() => {
        if (status === "all") {
            return "No quizzes available yet."
        }

        return `No ${status} quizzes found.`
    }, [status])

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            All Quizzes
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                            View all quizzes with status filters.
                        </p>
                    </div>
                    <Link
                        to="/student/dashboard"
                        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Dashboard
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option}
                                onClick={() => setStatus(option)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
                                    status === option
                                        ? "bg-indigo-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                {option.charAt(0).toUpperCase() +
                                    option.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : quizzes.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            {emptyMessage}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {quizzes.map((quiz) => (
                                <div
                                    key={quiz._id}
                                    className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow duration-200"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">
                                                {quiz.title}
                                            </h2>
                                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                                                <p className="flex items-center">
                                                    <BookOpen className="h-4 w-4 mr-2" />
                                                    {quiz.classId?.subjectName}{" "}
                                                    ({quiz.classId?.subjectCode}
                                                    )
                                                </p>
                                                <p className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-2" />
                                                    Deadline:{" "}
                                                    {new Date(
                                                        quiz.deadline
                                                    ).toLocaleString()}
                                                </p>
                                                <p className="flex items-center">
                                                    <Clock className="h-4 w-4 mr-2" />
                                                    Duration: {quiz.duration}{" "}
                                                    mins
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 capitalize font-medium">
                                            {quiz.myStatus || "upcoming"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
