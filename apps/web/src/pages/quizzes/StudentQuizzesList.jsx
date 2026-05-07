import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
    ArrowLeft,
    BookOpen,
    Calendar,
    Clock,
    Eye,
    PlayCircle,
    TriangleAlert,
} from "lucide-react"
import { api } from "../../services/api.js"

const STATUS_OPTIONS = ["all", "active", "upcoming", "completed", "missed"]

const STATUS_STYLE = {
    all: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/10 dark:text-slate-300 dark:border-slate-700/50",
    active: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-300 dark:border-emerald-700/50",
    upcoming: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-300 dark:border-blue-700/50",
    completed: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/10 dark:text-indigo-300 dark:border-indigo-700/50",
    missed: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/10 dark:text-rose-300 dark:border-rose-700/50",
}

const toTitleCase = (value) => {
    const text = String(value || "")
    return text.charAt(0).toUpperCase() + text.slice(1)
}

const formatDateTime = (value) => {
    if (!value) return "Not set"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "Invalid date"
    return parsed.toLocaleString()
}

const formatDate = (value) => {
    if (!value) return "Not set"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "Invalid date"
    return parsed.toLocaleDateString()
}

function QuizActionButton({ quiz }) {
    if (quiz.myStatus === "active") {
        return (
            <Link
                to={`/quizzes/${quiz._id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
                <PlayCircle className="h-4 w-4" />
                Start Quiz
            </Link>
        )
    }

    if (quiz.myStatus === "completed" && quiz?.attempt?._id) {
        return (
            <Link
                to={`/quiz-results/${quiz.attempt._id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary-200 hover:text-primary-700"
            >
                <Eye className="h-4 w-4" />
                View Result
            </Link>
        )
    }

    if (quiz.myStatus === "upcoming") {
        return (
            <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
            >
                Starts {formatDate(quiz.scheduledAt)}
            </button>
        )
    }

    return (
        <Link
            to={`/quizzes/${quiz._id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary-200 hover:text-primary-700"
        >
            <Eye className="h-4 w-4" />
            View Details
        </Link>
    )
}

export default function StudentQuizzesList() {
    const [searchParams, setSearchParams] = useSearchParams()
    const initialStatus = searchParams.get("status") || "all"

    const [status, setStatus] = useState(
        STATUS_OPTIONS.includes(initialStatus) ? initialStatus : "all"
    )
    const [quizzes, setQuizzes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        setSearchParams(status === "all" ? {} : { status })
    }, [status, setSearchParams])

    useEffect(() => {
        let isMounted = true

        const fetchQuizzes = async () => {
            setLoading(true)
            setError("")

            try {
                const query = status === "all" ? "" : `?status=${status}`
                const response = await api.get(
                    `/quizzes/student/quizzes${query}`
                )
                if (!isMounted) return
                setQuizzes(response?.data?.data || [])
            } catch (fetchError) {
                console.error("Error fetching student quizzes:", fetchError)
                if (!isMounted) return
                setQuizzes([])
                setError(
                    fetchError?.response?.data?.message ||
                        "Unable to fetch quizzes right now"
                )
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchQuizzes()

        return () => {
            isMounted = false
        }
    }, [status])

    const emptyMessage = useMemo(() => {
        if (status === "all") {
            return "No quizzes available yet."
        }

        return `No ${status} quizzes found.`
    }, [status])

    const activeCount = quizzes.filter(
        (quiz) => quiz.myStatus === "active"
    ).length
    const completedCount = quizzes.filter(
        (quiz) => quiz.myStatus === "completed"
    ).length

    return (
        <div className="qm-page min-h-screen">
            <div className="max-w-6xl mx-auto space-y-6">
                <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 px-6 py-7 text-white shadow-[0_16px_36px_rgba(15,23,42,0.2)]">
                    <div className="pointer-events-none absolute -right-12 -top-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                                Student Workspace
                            </p>
                            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight">
                                Quiz Center
                            </h1>
                            <p className="mt-2 text-sm text-blue-100/90 max-w-2xl">
                                Track active, upcoming, completed, and missed
                                quizzes from one place.
                            </p>
                        </div>

                        <Link
                            to="/student/dashboard"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                            Quizzes In View
                        </p>
                        <p className="mt-1 text-2xl font-black text-slate-900">
                            {quizzes.length}
                        </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                            Active In View
                        </p>
                        <p className="mt-1 text-2xl font-black text-emerald-700">
                            {activeCount}
                        </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                            Completed In View
                        </p>
                        <p className="mt-1 text-2xl font-black text-indigo-700">
                            {completedCount}
                        </p>
                    </article>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Filter By Status
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setStatus(option)}
                                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                                    status === option
                                        ? "border-primary-200 bg-primary-50 text-primary-700"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
                                }`}
                            >
                                {toTitleCase(option)}
                            </button>
                        ))}
                    </div>
                </section>

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                    </div>
                )}

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">
                            {toTitleCase(status)} Quizzes
                        </h2>
                        <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.all}`}
                        >
                            {quizzes.length} found
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-10 text-center text-sm text-slate-500">
                            Loading quizzes...
                        </div>
                    ) : quizzes.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-12 text-center">
                            <TriangleAlert className="mx-auto h-8 w-8 text-slate-400" />
                            <p className="mt-3 text-sm font-medium text-slate-600">
                                {emptyMessage}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {quizzes.map((quiz) => (
                                <article
                                    key={quiz._id}
                                    className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-900">
                                                    {quiz.title}
                                                </h3>
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[quiz.myStatus] || STATUS_STYLE.all}`}
                                                >
                                                    {quiz.myStatus ||
                                                        "upcoming"}
                                                </span>
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                                                <p className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-slate-500" />
                                                    {quiz.classId?.subjectName}{" "}
                                                    ({quiz.classId?.subjectCode}
                                                    )
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-slate-500" />
                                                    Duration: {quiz.duration}{" "}
                                                    min
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-500" />
                                                    Starts:{" "}
                                                    {formatDateTime(
                                                        quiz.scheduledAt
                                                    )}
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-500" />
                                                    Deadline:{" "}
                                                    {formatDateTime(
                                                        quiz.deadline
                                                    )}
                                                </p>
                                            </div>

                                            {quiz.myStatus === "completed" &&
                                                quiz?.attempt && (
                                                    <p className="mt-3 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                        Score:{" "}
                                                        {Number(
                                                            quiz.attempt
                                                                .percentage || 0
                                                        ).toFixed(2)}
                                                        %
                                                    </p>
                                                )}
                                        </div>

                                        <div className="flex shrink-0 items-center">
                                            <QuizActionButton quiz={quiz} />
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
