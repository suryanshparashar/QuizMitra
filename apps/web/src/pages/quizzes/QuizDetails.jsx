// pages/quizzes/QuizDetails.jsx
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"
import { formatForDateTimeLocal, toUtcIsoString } from "../../utils/dateTime.js"
import {
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    Award,
    Clock,
    FileText,
    Timer,
    Target,
    Calendar,
    BookOpen,
    Edit,
    Settings,
    Play,
    Eye,
    ChevronDown,
    Loader2,
} from "lucide-react"

export default function QuizDetails() {
    const { quizId } = useParams()
    const { user } = useAuthStore()
    const [quiz, setQuiz] = useState(null)
    const [quizStats, setQuizStats] = useState(null)
    const [loading, setLoading] = useState(true)

    // Edit Dates Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [newScheduledAt, setNewScheduledAt] = useState("")
    const [newDeadline, setNewDeadline] = useState("")
    const [savingDates, setSavingDates] = useState(false)
    const [savingVisibility, setSavingVisibility] = useState(false)
    const [questionWiseViewEnabled, setQuestionWiseViewEnabled] =
        useState(false)
    const [savingSettingKey, setSavingSettingKey] = useState("")

    useEffect(() => {
        fetchQuiz()
    }, [quizId])

    const fetchQuiz = async () => {
        try {
            const response = await api.get(`/quizzes/${quizId}`)
            const data = response.data.data
            setQuiz(data)
            setQuestionWiseViewEnabled(
                data?.settings?.allowQuestionWiseScores === true &&
                    data?.settings?.allowQuestionWiseCorrectAnswers === true
            )

            const isOwnerFaculty =
                user?.role === "faculty" &&
                (data?.userId?._id === user?._id || data?.userId === user?._id)

            if (isOwnerFaculty) {
                try {
                    const statsRes = await api.get(
                        `/quizzes/${quizId}/statistics`
                    )
                    setQuizStats(statsRes?.data?.data || null)
                } catch (statsError) {
                    // Keep UI usable with fallback values from quiz payload.
                    console.error("Error fetching quiz statistics:", statsError)
                }
            }
        } catch (error) {
            console.error("Error fetching quiz:", error)
        } finally {
            setLoading(false)
        }
    }

    const handlePublish = async () => {
        try {
            await api.patch(`/quizzes/${quizId}/publish`)
            setQuiz({ ...quiz, status: "published", isPublished: true })
        } catch (error) {
            console.log(error)
            alert(error.response?.data?.message || "Failed to publish quiz")
        }
    }

    const handleOpenEditModal = () => {
        setNewScheduledAt(formatForDateTimeLocal(quiz.scheduledAt))
        setNewDeadline(formatForDateTimeLocal(quiz.deadline))
        setIsEditModalOpen(true)
    }

    const handleSaveDates = async () => {
        if (!newScheduledAt || !newDeadline) {
            alert("Please provide both dates.")
            return
        }
        setSavingDates(true)
        try {
            await api.patch(`/quizzes/${quizId}`, {
                scheduledAt: toUtcIsoString(newScheduledAt),
                deadline: toUtcIsoString(newDeadline),
            })
            // Update local state to reflect changes without full refetch immediately
            setQuiz({
                ...quiz,
                scheduledAt: toUtcIsoString(newScheduledAt),
                deadline: toUtcIsoString(newDeadline),
            })
            setIsEditModalOpen(false)
        } catch (error) {
            console.log(error)
            alert(error.response?.data?.message || "Failed to save dates")
        } finally {
            setSavingDates(false)
        }
    }

    const handleToggleQuestionWiseView = async () => {
        const nextEnabled = !questionWiseViewEnabled
        setSavingVisibility(true)
        try {
            const nextSettings = {
                allowQuestionWiseScores: nextEnabled,
                allowQuestionWiseCorrectAnswers: nextEnabled,
                allowQuestionWiseFeedback: false,
                releaseQuestionWiseAfterDeadline: false,
            }

            await api.patch(`/quizzes/${quizId}`, {
                settings: nextSettings,
            })

            setQuiz((prev) => ({
                ...prev,
                settings: {
                    ...(prev?.settings || {}),
                    ...nextSettings,
                },
            }))
            setQuestionWiseViewEnabled(nextEnabled)
        } catch (error) {
            console.log(error)
            alert(
                error.response?.data?.message ||
                    "Failed to update result visibility settings"
            )
        } finally {
            setSavingVisibility(false)
        }
    }

    const handleToggleQuizSetting = async (settingKey) => {
        const currentValue = quiz?.settings?.[settingKey] === true
        const nextValue = !currentValue

        setSavingSettingKey(settingKey)
        try {
            await api.patch(`/quizzes/${quizId}`, {
                settings: {
                    [settingKey]: nextValue,
                },
            })

            setQuiz((prev) => ({
                ...prev,
                settings: {
                    ...(prev?.settings || {}),
                    [settingKey]: nextValue,
                },
            }))
        } catch (error) {
            console.log(error)
            alert(error.response?.data?.message || "Failed to update setting")
        } finally {
            setSavingSettingKey("")
        }
    }

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "published":
                return "bg-green-100 text-green-800 border-green-200"
            case "draft":
                return "bg-yellow-100 text-yellow-800 border-yellow-200"
            case "completed":
                return "bg-blue-100 text-blue-800 border-blue-200"
            default:
                return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case "published":
                return <CheckCircle className="h-4 w-4" />
            case "draft":
                return <AlertCircle className="h-4 w-4" />
            case "completed":
                return <Award className="h-4 w-4" />
            default:
                return <Clock className="h-4 w-4" />
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 font-medium">Loading quiz...</p>
                </div>
            </div>
        )
    }

    const canManageQuiz =
        user?.role === "faculty" &&
        (quiz.userId?._id === user._id || quiz.userId === user._id)

    const totalAttempts =
        quizStats?.totalAttempts ??
        quiz?.totalAttempts ??
        quiz?.attemptCount ??
        quiz?.attempts ??
        0
    const averageScore =
        quizStats?.averageScore ?? quiz?.averageScore ?? quiz?.avgScore ?? 0
    const negativeMarkingEnabled =
        quiz?.settings?.negativeMarkingEnabled === true
    const negativeMarkingRatio = Number(quiz?.settings?.negativeMarkingRatio)
    const safeNegativeMarkingRatio = Number.isFinite(negativeMarkingRatio)
        ? Math.max(0, negativeMarkingRatio)
        : 0

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/40 to-white pt-3 pb-8 sm:pt-4">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="pointer-events-none absolute -top-8 -left-10 h-28 w-28 rounded-full bg-cyan-200/30 blur-3xl" />
                <div className="pointer-events-none absolute top-20 -right-10 h-36 w-36 rounded-full bg-indigo-200/30 blur-3xl" />
                {/* Header */}
                <div className="mb-8 rounded-2xl border border-white/80 bg-white/75 backdrop-blur-md shadow-sm p-5 sm:p-6">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700 mb-4 transition-colors duration-200"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back
                    </button>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 mb-2">
                                {quiz.title}
                            </h1>
                            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                                {quiz.description}
                            </p>
                        </div>

                        <div className="mt-4 sm:mt-0 sm:ml-6">
                            <div
                                className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-semibold border shadow-sm ${getStatusColor(
                                    quiz.status
                                )}`}
                            >
                                {getStatusIcon(quiz.status)}
                                <span className="ml-2 capitalize">
                                    {quiz.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Quiz Information */}
                        <div className="bg-white/90 rounded-2xl shadow-sm border border-slate-200/70 ring-1 ring-white p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                                    Quiz Information
                                </h2>
                                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 text-xs font-semibold">
                                    Quick Summary
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Timer className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                                Duration
                                            </p>
                                            <p className="text-lg font-bold text-slate-900">
                                                {quiz.duration} minutes
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                                Questions
                                            </p>
                                            <p className="text-lg font-bold text-slate-900">
                                                {quiz.questions?.length || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Target className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                                                Total Marks
                                            </p>
                                            <p className="text-lg font-bold text-slate-900">
                                                {quiz.requirements
                                                    ?.totalMarks || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <Calendar className="h-5 w-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                                Scheduled
                                            </p>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {new Date(
                                                    quiz.scheduledAt
                                                ).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50 to-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 bg-rose-100 rounded-lg flex items-center justify-center">
                                                <AlertCircle className="h-5 w-5 text-rose-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                                                    Negative Marking
                                                </p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {negativeMarkingEnabled &&
                                                    safeNegativeMarkingRatio > 0
                                                        ? `Enabled (${safeNegativeMarkingRatio}x per wrong answer)`
                                                        : "Disabled"}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                negativeMarkingEnabled &&
                                                safeNegativeMarkingRatio > 0
                                                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                            }`}
                                        >
                                            {negativeMarkingEnabled &&
                                            safeNegativeMarkingRatio > 0
                                                ? "Active"
                                                : "Off"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center">
                                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                                    <div>
                                        <p className="text-sm font-medium text-red-900">
                                            Deadline
                                        </p>
                                        <p className="text-sm text-red-700">
                                            {new Date(
                                                quiz.deadline
                                            ).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quiz Questions Preview (Faculty Only) */}
                        {user?.role === "faculty" && quiz.questions && (
                            <div className="bg-white/90 rounded-2xl shadow-sm border border-slate-200/70 ring-1 ring-white p-6">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                        <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                                        Questions Preview
                                    </h2>
                                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold">
                                        {quiz.questions?.length || 0} Total
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    {quiz.questions?.map((question, index) => (
                                        <div
                                            key={index}
                                            className="group relative overflow-hidden border border-slate-200 rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-white via-slate-50/70 to-blue-50/40 hover:shadow-md hover:border-blue-200 transition-all duration-200"
                                        >
                                            <div className="flex items-start justify-between mb-3 gap-3">
                                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-blue-900 text-white text-xs font-bold shadow-sm">
                                                        {index + 1}
                                                    </span>
                                                    Question {index + 1}
                                                </h3>
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100/90 text-blue-800 border border-blue-200 shadow-sm">
                                                    {question.marks || 1} mark
                                                    {(question.marks || 1) !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            </div>

                                            <p className="text-slate-700 mb-4 leading-relaxed text-[15px]">
                                                {question.questionText}
                                            </p>

                                            {Array.isArray(question.options) &&
                                                question.options.length > 0 && (
                                                    <div className="mb-4">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2.5">
                                                            Options:
                                                        </p>
                                                        <ul className="space-y-2">
                                                            {question.options?.map(
                                                                (
                                                                    option,
                                                                    optIndex
                                                                ) => {
                                                                    const optionLabel =
                                                                        String.fromCharCode(
                                                                            65 +
                                                                                optIndex
                                                                        )
                                                                    const isCorrectOption =
                                                                        question.correctAnswer ===
                                                                            option ||
                                                                        question.correctAnswer ===
                                                                            optionLabel

                                                                    return (
                                                                        <li
                                                                            key={
                                                                                optIndex
                                                                            }
                                                                            className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 border transition-colors duration-200 ${
                                                                                isCorrectOption
                                                                                    ? "bg-emerald-50 border-emerald-200"
                                                                                    : "bg-white/80 border-slate-200 hover:bg-slate-50"
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center space-x-2 min-w-0">
                                                                                <span
                                                                                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-sm font-medium ${
                                                                                        isCorrectOption
                                                                                            ? "bg-emerald-200 text-emerald-800"
                                                                                            : "bg-gray-100 text-gray-600"
                                                                                    }`}
                                                                                >
                                                                                    {
                                                                                        optionLabel
                                                                                    }
                                                                                </span>
                                                                                <span className="text-slate-700 truncate">
                                                                                    {
                                                                                        option
                                                                                    }
                                                                                </span>
                                                                            </div>

                                                                            {isCorrectOption && (
                                                                                <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                                                                                    Correct
                                                                                </span>
                                                                            )}
                                                                        </li>
                                                                    )
                                                                }
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}

                                            {!(
                                                Array.isArray(
                                                    question.options
                                                ) && question.options.length > 0
                                            ) && (
                                                <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50/80 rounded-lg border border-green-200">
                                                    <p className="text-sm flex items-center gap-1.5">
                                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                                        <span className="font-medium text-green-900">
                                                            Correct Answer:
                                                        </span>{" "}
                                                        <span className="text-green-700">
                                                            {
                                                                question.correctAnswer
                                                            }
                                                        </span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="relative overflow-hidden bg-white/90 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-blue-100 p-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5rem)] overflow-y-auto pr-3">
                            <div className="pointer-events-none absolute -top-16 -right-12 h-32 w-32 rounded-full bg-blue-200/30 blur-2xl" />
                            <div className="relative">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
                                    <Settings className="h-5 w-5 mr-2 text-blue-600" />
                                    Actions
                                </h3>
                                <p className="text-xs text-slate-500 mb-5">
                                    Manage quiz lifecycle, visibility, and
                                    anti-cheat settings.
                                </p>

                                <div className="space-y-4">
                                    {/* Faculty Controls */}
                                    {canManageQuiz && (
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/70 ring-1 ring-slate-200 p-3 space-y-3">
                                                {(quiz.status === "draft" ||
                                                    new Date(quiz.deadline) <
                                                        new Date()) && (
                                                    <>
                                                        <button
                                                            onClick={
                                                                handlePublish
                                                            }
                                                            className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold rounded-lg hover:from-emerald-700 hover:to-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                                        >
                                                            <Play className="h-4 w-4 mr-2" />
                                                            {quiz.status ===
                                                            "draft"
                                                                ? "Publish Quiz"
                                                                : "Re-publish Quiz"}
                                                        </button>

                                                        <Link
                                                            to={`/quizzes/${quizId}/edit`}
                                                            className="block"
                                                        >
                                                            <button className="w-full inline-flex items-center justify-center px-4 py-3 bg-white text-gray-700 ring-1 ring-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit Questions
                                                            </button>
                                                        </Link>

                                                        <button
                                                            onClick={
                                                                handleOpenEditModal
                                                            }
                                                            className="w-full inline-flex items-center justify-center px-4 py-3 bg-white text-gray-700 ring-1 ring-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                                        >
                                                            <Calendar className="h-4 w-4 mr-2" />
                                                            Edit Timings
                                                        </button>
                                                    </>
                                                )}

                                                {quiz.status === "published" &&
                                                    new Date(quiz.deadline) >=
                                                        new Date() && (
                                                        <button
                                                            onClick={
                                                                handleOpenEditModal
                                                            }
                                                            className="w-full inline-flex items-center justify-center px-4 py-3 bg-white text-gray-700 ring-1 ring-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                                        >
                                                            <Calendar className="h-4 w-4 mr-2" />
                                                            Edit Timings
                                                        </button>
                                                    )}

                                                <Link
                                                    to={`/quiz-grading/${quizId}`}
                                                    className="block"
                                                >
                                                    <button className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Results
                                                    </button>
                                                </Link>
                                            </div>

                                            <details
                                                className="group border border-gray-200 rounded-xl p-3 bg-white/80"
                                                open={false}
                                            >
                                                <summary className="cursor-pointer list-none flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
                                                        <span className="text-sm font-semibold text-gray-800">
                                                            Student Result
                                                            Visibility
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${questionWiseViewEnabled ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-600"}`}
                                                    >
                                                        {questionWiseViewEnabled
                                                            ? "ON"
                                                            : "OFF"}
                                                    </span>
                                                </summary>

                                                <div className="mt-3">
                                                    <button
                                                        onClick={
                                                            handleToggleQuestionWiseView
                                                        }
                                                        disabled={
                                                            savingVisibility
                                                        }
                                                        role="switch"
                                                        aria-checked={
                                                            questionWiseViewEnabled
                                                        }
                                                        className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 transition-all duration-200 hover:bg-slate-100/80 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                    >
                                                        <span className="text-xs font-semibold text-slate-800">
                                                            Question-wise View
                                                        </span>

                                                        <span
                                                            className={`relative inline-flex h-7 w-16 items-center rounded-full transition-colors duration-200 ${
                                                                questionWiseViewEnabled
                                                                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600"
                                                                    : "bg-slate-300"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`absolute text-[10px] font-bold tracking-wide ${
                                                                    questionWiseViewEnabled
                                                                        ? "left-2 text-white"
                                                                        : "right-2 text-slate-600"
                                                                }`}
                                                            >
                                                                {questionWiseViewEnabled
                                                                    ? "ON"
                                                                    : "OFF"}
                                                            </span>
                                                            <span
                                                                className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                                                                    questionWiseViewEnabled
                                                                        ? "translate-x-10"
                                                                        : "translate-x-1"
                                                                }`}
                                                            />
                                                        </span>
                                                    </button>
                                                    <div
                                                        aria-live="polite"
                                                        className={`mt-2 min-h-[14px] transition-opacity duration-150 flex items-center gap-1.5 ${
                                                            savingVisibility
                                                                ? "text-slate-500 opacity-100"
                                                                : "opacity-0"
                                                        }`}
                                                    >
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        <span className="text-[11px]">
                                                            Saving...
                                                        </span>
                                                    </div>
                                                </div>
                                            </details>

                                            <details
                                                className="group border border-gray-200 rounded-xl p-3 bg-white/80"
                                                open={false}
                                            >
                                                <summary className="cursor-pointer list-none flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
                                                        <span className="text-sm font-semibold text-gray-800">
                                                            Anti-Cheat Shuffle
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${quiz?.settings?.shuffleQuestions || quiz?.settings?.shuffleOptions ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-600"}`}
                                                    >
                                                        {quiz?.settings
                                                            ?.shuffleQuestions ||
                                                        quiz?.settings
                                                            ?.shuffleOptions
                                                            ? "ACTIVE"
                                                            : "OFF"}
                                                    </span>
                                                </summary>

                                                <div className="mt-3 space-y-2">
                                                    <button
                                                        onClick={() =>
                                                            handleToggleQuizSetting(
                                                                "shuffleQuestions"
                                                            )
                                                        }
                                                        disabled={
                                                            savingSettingKey ===
                                                            "shuffleQuestions"
                                                        }
                                                        role="switch"
                                                        aria-checked={
                                                            quiz?.settings
                                                                ?.shuffleQuestions ===
                                                            true
                                                        }
                                                        className={`w-full inline-flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 transition-all duration-200 hover:bg-slate-100/80 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                                            quiz?.settings
                                                                ?.shuffleQuestions
                                                                ? "focus:ring-violet-500"
                                                                : "focus:ring-slate-400"
                                                        }`}
                                                    >
                                                        <span className="text-xs font-semibold text-slate-800">
                                                            Shuffle Questions
                                                        </span>

                                                        <span
                                                            className={`relative inline-flex h-7 w-16 items-center rounded-full transition-colors duration-200 ${
                                                                quiz?.settings
                                                                    ?.shuffleQuestions
                                                                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600"
                                                                    : "bg-slate-300"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`absolute text-[10px] font-bold tracking-wide ${
                                                                    quiz
                                                                        ?.settings
                                                                        ?.shuffleQuestions
                                                                        ? "left-2 text-white"
                                                                        : "right-2 text-slate-600"
                                                                }`}
                                                            >
                                                                {quiz?.settings
                                                                    ?.shuffleQuestions
                                                                    ? "ON"
                                                                    : "OFF"}
                                                            </span>
                                                            <span
                                                                className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                                                                    quiz
                                                                        ?.settings
                                                                        ?.shuffleQuestions
                                                                        ? "translate-x-10"
                                                                        : "translate-x-1"
                                                                }`}
                                                            />
                                                        </span>
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleToggleQuizSetting(
                                                                "shuffleOptions"
                                                            )
                                                        }
                                                        disabled={
                                                            savingSettingKey ===
                                                            "shuffleOptions"
                                                        }
                                                        role="switch"
                                                        aria-checked={
                                                            quiz?.settings
                                                                ?.shuffleOptions ===
                                                            true
                                                        }
                                                        className={`w-full inline-flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 transition-all duration-200 hover:bg-slate-100/80 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                                            quiz?.settings
                                                                ?.shuffleOptions
                                                                ? "focus:ring-violet-500"
                                                                : "focus:ring-slate-400"
                                                        }`}
                                                    >
                                                        <span className="text-xs font-semibold text-slate-800">
                                                            Shuffle Options
                                                        </span>

                                                        <span
                                                            className={`relative inline-flex h-7 w-16 items-center rounded-full transition-colors duration-200 ${
                                                                quiz?.settings
                                                                    ?.shuffleOptions
                                                                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600"
                                                                    : "bg-slate-300"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`absolute text-[10px] font-bold tracking-wide ${
                                                                    quiz
                                                                        ?.settings
                                                                        ?.shuffleOptions
                                                                        ? "left-2 text-white"
                                                                        : "right-2 text-slate-600"
                                                                }`}
                                                            >
                                                                {quiz?.settings
                                                                    ?.shuffleOptions
                                                                    ? "ON"
                                                                    : "OFF"}
                                                            </span>
                                                            <span
                                                                className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                                                                    quiz
                                                                        ?.settings
                                                                        ?.shuffleOptions
                                                                        ? "translate-x-10"
                                                                        : "translate-x-1"
                                                                }`}
                                                            />
                                                        </span>
                                                    </button>

                                                    {(savingSettingKey ===
                                                        "shuffleQuestions" ||
                                                        savingSettingKey ===
                                                            "shuffleOptions") && (
                                                        <div className="flex items-center gap-1.5 text-slate-500 mt-2">
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            <span className="text-[11px]">
                                                                Saving...
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        </div>
                                    )}

                                    {/* Student Controls */}
                                    {user?.role === "student" && (
                                        <div className="space-y-3">
                                            {quiz.userAttempt ? (
                                                <div className="bg-green-50/90 text-green-800 p-4 rounded-xl flex flex-col border border-green-200 shadow-sm">
                                                    <div className="flex items-center mb-2">
                                                        <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                                                        <p className="font-medium text-sm">
                                                            You have already
                                                            completed this quiz.
                                                        </p>
                                                    </div>
                                                    <Link
                                                        to={`/quiz-results/${quiz.userAttempt._id}`}
                                                        className="inline-flex items-center justify-center px-4 py-2 mt-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Results
                                                    </Link>
                                                </div>
                                            ) : !quiz.canTakeQuiz ? (
                                                <div className="bg-yellow-50/90 text-yellow-800 p-4 rounded-xl flex items-center border border-yellow-200 shadow-sm">
                                                    <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
                                                    <p className="font-medium text-sm">
                                                        This quiz is not
                                                        currently active. Check
                                                        the schedule above.
                                                    </p>
                                                </div>
                                            ) : (
                                                <Link
                                                    to={`/quizzes/${quizId}/take`}
                                                    className="block"
                                                >
                                                    <button className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                                        <Play className="h-4 w-4 mr-2" />
                                                        Take Quiz
                                                    </button>
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Quiz Stats */}
                                <div className="mt-8 pt-6 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-4">
                                        Quiz Statistics
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                Attempts
                                            </p>
                                            <p className="text-xl font-semibold text-gray-900 mt-1">
                                                {totalAttempts}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                Average Score
                                            </p>
                                            <p className="text-xl font-semibold text-gray-900 mt-1">
                                                {averageScore}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Dates Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsEditModalOpen(false)}
                    ></div>
                    <div className="relative w-full max-w-md p-6 mx-auto bg-white rounded-xl shadow-2xl z-10">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-xl font-bold text-gray-900">
                                Edit Timings
                            </h3>
                            <button
                                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                <span className="sr-only">Close</span>
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Scheduled Start Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={newScheduledAt}
                                    onChange={(e) =>
                                        setNewScheduledAt(e.target.value)
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Deadline (End Time)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={newDeadline}
                                    onChange={(e) =>
                                        setNewDeadline(e.target.value)
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveDates}
                                disabled={savingDates}
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {savingDates ? "Saving..." : "Save Dates"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
