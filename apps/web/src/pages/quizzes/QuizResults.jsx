import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
    ArrowLeft,
    Award,
    BarChart3,
    Calendar,
    Clock,
    ShieldAlert,
    Target,
    Trophy,
} from "lucide-react"
import { api } from "../../services/api.js"

const formatNumber = (value) => Number(value || 0).toFixed(2)

const formatDateTime = (value) => {
    if (!value) return "Not available"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "Invalid date"
    return parsed.toLocaleString()
}

const formatAnswerValue = (value) => {
    if (value === null || value === undefined || value === "") {
        return "Not answered"
    }

    if (Array.isArray(value)) {
        return value.length > 0 ? value.join(", ") : "Not answered"
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value)
        } catch {
            return "[Complex answer]"
        }
    }

    return String(value)
}

const formatDuration = (seconds) => {
    const value = Number(seconds || 0)
    const minutes = Math.floor(value / 60)
    const remaining = value % 60

    if (minutes === 0) {
        return `${remaining}s`
    }

    return `${minutes}m ${remaining}s`
}

const gradeStyleMap = {
    S: "text-emerald-700 bg-emerald-100 border-emerald-200",
    A: "text-blue-700 bg-blue-100 border-blue-200",
    B: "text-indigo-700 bg-indigo-100 border-indigo-200",
    C: "text-amber-700 bg-amber-100 border-amber-200",
    D: "text-orange-700 bg-orange-100 border-orange-200",
    E: "text-rose-700 bg-rose-100 border-rose-200",
    F: "text-red-700 bg-red-100 border-red-200",
    N: "text-red-800 bg-red-200 border-red-300",
}

function AdvisoryList({ title, items, tone }) {
    if (!Array.isArray(items) || items.length === 0) return null

    const toneClasses = {
        green: {
            card: "border-emerald-200 bg-emerald-50",
            dot: "bg-emerald-500",
            text: "text-emerald-800",
            heading: "text-emerald-900",
        },
        red: {
            card: "border-rose-200 bg-rose-50",
            dot: "bg-rose-500",
            text: "text-rose-800",
            heading: "text-rose-900",
        },
        blue: {
            card: "border-blue-200 bg-blue-50",
            dot: "bg-blue-500",
            text: "text-blue-800",
            heading: "text-blue-900",
        },
    }

    const palette = toneClasses[tone] || toneClasses.blue

    return (
        <section className={`rounded-2xl border p-4 ${palette.card}`}>
            <h4 className={`text-sm font-bold uppercase tracking-[0.08em] ${palette.heading}`}>
                {title}
            </h4>
            <ul className="mt-3 space-y-2">
                {items.map((item, index) => (
                    <li
                        key={`${title}-${index}`}
                        className={`flex items-start gap-2 text-sm ${palette.text}`}
                    >
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${palette.dot}`} />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default function QuizResults() {
    const { attemptId } = useParams()

    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        let isMounted = true

        const fetchResults = async () => {
            setLoading(true)
            setError("")

            try {
                const response = await api.get(`/quiz-attempts/${attemptId}/details`)
                if (!isMounted) return
                setResults(response?.data?.data || null)
            } catch (fetchError) {
                console.error("Error fetching quiz results:", fetchError)
                if (!isMounted) return
                setResults(null)
                setError(
                    fetchError?.response?.data?.message ||
                        "Unable to load quiz results"
                )
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchResults()

        return () => {
            isMounted = false
        }
    }, [attemptId])

    if (loading) {
        return (
            <div className="qm-page min-h-screen flex items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
                    Loading results...
                </div>
            </div>
        )
    }

    if (!results) {
        return (
            <div className="qm-page min-h-screen">
                <div className="max-w-3xl mx-auto rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                    <p className="text-sm font-semibold text-red-700">
                        {error || "Result data is unavailable for this attempt."}
                    </p>
                    <Link
                        to="/dashboard"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    const score = results?.score || {}
    const performance = results?.performance || {}
    const timing = results?.timing || {}
    const answers = Array.isArray(results?.answers) ? results.answers : []
    const advisory = results?.advisory || {}
    const questionWiseVisibility = results?.questionWiseVisibility || {}

    const canViewAnyQuestionWise =
        questionWiseVisibility?.canViewAnyQuestionWise === true

    const isDebarred = score?.grade === "N" || results?.isDebarred === true

    const statusStyle = isDebarred
        ? "bg-red-100 text-red-800 border-red-300"
        : score?.isPassed
          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
          : "bg-rose-100 text-rose-800 border-rose-300"

    const statusLabel = isDebarred
        ? "Debarred"
        : score?.isPassed
          ? "Passed"
          : "Failed"

    const classLabel = results?.class
        ? `${results.class.subjectName} (${results.class.subjectCode})`
        : "Class details unavailable"

    const strengths = Array.isArray(advisory?.strengths) ? advisory.strengths : []
    const weaknesses = Array.isArray(advisory?.weaknesses)
        ? advisory.weaknesses
        : []
    const recommendations = Array.isArray(advisory?.recommendations)
        ? advisory.recommendations
        : []

    return (
        <div className="qm-page min-h-screen space-y-6">
            <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 px-6 py-7 text-white shadow-[0_18px_42px_rgba(15,23,42,0.22)]">
                <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                            Assessment Review
                        </p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl sm:text-3xl font-black tracking-tight">
                            <Trophy className="h-7 w-7 text-blue-200" />
                            Quiz Results
                        </h1>
                        <p className="mt-2 text-sm sm:text-base text-blue-100/95">
                            {results?.quiz?.title || "Quiz"}
                        </p>
                        <p className="mt-1 text-sm text-blue-200">{classLabel}</p>
                    </div>

                    <div className="flex gap-2">
                        <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${statusStyle}`}
                        >
                            {statusLabel}
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${gradeStyleMap[score?.grade] || gradeStyleMap.F}`}
                        >
                            Grade {score?.grade || "-"}
                        </span>
                    </div>
                </div>
            </section>

            {error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900">
                            Score Summary
                        </h2>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Marks
                                </p>
                                <p className="mt-1 text-2xl font-black text-slate-900">
                                    {formatNumber(score?.marksObtained)} /
                                    {formatNumber(score?.maxMarks)}
                                </p>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Percentage
                                </p>
                                <p className="mt-1 text-2xl font-black text-indigo-700">
                                    {formatNumber(score?.percentage)}%
                                </p>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Accuracy
                                </p>
                                <p className="mt-1 text-2xl font-black text-blue-700">
                                    {formatNumber(performance?.accuracy)}%
                                </p>
                            </article>
                        </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                            <BarChart3 className="h-5 w-5 text-primary-600" />
                            Performance Breakdown
                        </h2>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-sm font-semibold text-emerald-900">
                                    Correct Answers
                                </p>
                                <p className="mt-1 text-2xl font-black text-emerald-700">
                                    {performance?.correctAnswers || 0}
                                </p>
                            </article>
                            <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                <p className="text-sm font-semibold text-rose-900">
                                    Incorrect Answers
                                </p>
                                <p className="mt-1 text-2xl font-black text-rose-700">
                                    {performance?.incorrectAnswers || 0}
                                </p>
                            </article>
                            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                <p className="text-sm font-semibold text-blue-900">
                                    Total Questions
                                </p>
                                <p className="mt-1 text-2xl font-black text-blue-700">
                                    {performance?.totalQuestions || answers.length || 0}
                                </p>
                            </article>
                            <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                                <p className="text-sm font-semibold text-indigo-900">
                                    Time Spent
                                </p>
                                <p className="mt-1 text-2xl font-black text-indigo-700">
                                    {formatDuration(timing?.timeSpent)}
                                </p>
                            </article>
                        </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900">
                            Advisory Insights
                        </h2>
                        {advisory?.motivationalMessage ? (
                            <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                {advisory.motivationalMessage}
                            </p>
                        ) : (
                            <p className="mt-3 text-sm text-slate-600">
                                Advisory is not available for this attempt yet.
                            </p>
                        )}
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <AdvisoryList
                                title="Strengths"
                                items={strengths}
                                tone="green"
                            />
                            <AdvisoryList
                                title="Weaknesses"
                                items={weaknesses}
                                tone="red"
                            />
                            <AdvisoryList
                                title="Recommendations"
                                items={recommendations}
                                tone="blue"
                            />
                        </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900">
                            Question-wise Review
                        </h2>

                        {!canViewAnyQuestionWise ? (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                {questionWiseVisibility?.releaseAfterDeadline &&
                                !questionWiseVisibility?.releaseGateOpen
                                    ? "Question-wise results are locked until the quiz deadline."
                                    : "Faculty has currently disabled question-wise result visibility for this quiz."}
                            </div>
                        ) : answers.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-600">
                                No question-wise responses are available for this attempt.
                            </p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {answers.map((answer, index) => (
                                    <article
                                        key={`${answer?.questionIndex ?? index}-${index}`}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <p className="text-sm font-bold text-slate-900">
                                            Q{Number(answer?.questionIndex ?? index) + 1}: {" "}
                                            {answer?.questionText || "Question"}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-700">
                                            <span className="font-semibold">Your Response:</span>{" "}
                                            {formatAnswerValue(answer?.selectedAnswer)}
                                        </p>

                                        {questionWiseVisibility?.canViewCorrectAnswers && (
                                            <p className="mt-1 text-sm text-emerald-700">
                                                <span className="font-semibold">
                                                    Correct Answer:
                                                </span>{" "}
                                                {formatAnswerValue(answer?.correctAnswer)}
                                            </p>
                                        )}

                                        {questionWiseVisibility?.canViewScores && (
                                            <p className="mt-1 text-sm text-blue-700">
                                                <span className="font-semibold">Score:</span>{" "}
                                                {formatNumber(answer?.marksAwarded)} / {" "}
                                                {formatNumber(answer?.maxMarks)}
                                            </p>
                                        )}

                                        {questionWiseVisibility?.canViewFeedback &&
                                            answer?.gradingNotes && (
                                                <p className="mt-1 text-sm text-indigo-700">
                                                    <span className="font-semibold">
                                                        Feedback:
                                                    </span>{" "}
                                                    {answer.gradingNotes}
                                                </p>
                                            )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <Award className="h-5 w-5 text-primary-600" />
                            Attempt Stats
                        </h3>
                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Submitted</span>
                                <span className="font-semibold text-slate-900">
                                    {formatDateTime(timing?.submittedAt)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Time Used</span>
                                <span className="font-semibold text-slate-900">
                                    {formatDuration(timing?.timeSpent)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Late Submission</span>
                                <span className="font-semibold text-slate-900">
                                    {timing?.isLateSubmission ? "Yes" : "No"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Time Exceeded</span>
                                <span className="font-semibold text-slate-900">
                                    {timing?.wasTimeExceeded ? "Yes" : "No"}
                                </span>
                            </div>
                        </div>
                    </section>

                    {isDebarred && (
                        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-red-900">
                                <ShieldAlert className="h-5 w-5" />
                                Debar Notice
                            </h3>
                            <p className="mt-2 text-sm text-red-800">
                                {results?.debarReason || "This attempt was marked as debarred."}
                            </p>
                        </section>
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="space-y-2 text-sm text-slate-600">
                            <p className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary-600" />
                                Keep reviewing weak areas to improve consistency.
                            </p>
                            <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary-600" />
                                Compare this attempt with your upcoming quizzes.
                            </p>
                            <p className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary-600" />
                                Practice timed sessions for better pace control.
                            </p>
                        </div>

                        <Link
                            to="/dashboard"
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </section>
                </aside>
            </div>
        </div>
    )
}
