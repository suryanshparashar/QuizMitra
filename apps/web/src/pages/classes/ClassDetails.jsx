import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import {
    AlertCircle,
    ArrowRight,
    CalendarDays,
    Check,
    Clock3,
    Copy,
    FileText,
    GraduationCap,
    MessageSquareText,
    PlusCircle,
    Send,
    Shield,
    ShieldOff,
    Trash2,
    UserRound,
    Users,
} from "lucide-react"
import { useAuthStore } from "../../store/authStore.js"
import { api } from "../../services/api.js"

const TAB_CONFIG = [
    { value: "classroom", label: "Classroom" },
    { value: "quizzes", label: "Classwork" },
    { value: "members", label: "Members" },
]

const QUIZ_SECTION_CONFIG = [
    {
        key: "active",
        title: "Live Quizzes",
        description: "Currently open for attempts.",
    },
    {
        key: "scheduled",
        title: "Scheduled Quizzes",
        description: "Upcoming quizzes that are not yet live.",
    },
    {
        key: "expired",
        title: "Closed Quizzes",
        description: "Submission window has ended.",
    },
    {
        key: "draft",
        title: "Draft Quizzes",
        description: "Visible only to faculty until published.",
    },
]

const toDate = (value) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

const normalizeId = (value) => {
    if (!value) return ""
    if (typeof value === "string") return value
    if (typeof value === "object" && value._id) return String(value._id)
    return String(value)
}

const getInitials = (name = "") => {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
}

const formatDate = (value) => {
    const date = toDate(value)
    if (!date) return "Not available"

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
}

const formatDateTime = (value) => {
    const date = toDate(value)
    if (!date) return "Not available"

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })
}

const formatRelativeTime = (value) => {
    const date = toDate(value)
    if (!date) return "Unknown time"

    const diffMs = Date.now() - date.getTime()
    const isPast = diffMs >= 0
    const minutes = Math.round(Math.abs(diffMs) / 60000)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ${isPast ? "ago" : "from now"}`

    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ${isPast ? "ago" : "from now"}`

    const days = Math.round(hours / 24)
    return `${days}d ${isPast ? "ago" : "from now"}`
}

const getRoleLabel = (role) => {
    if (role === "faculty") return "Faculty"
    if (role === "student") return "Student"
    if (role === "admin") return "Admin"
    return "Member"
}

const getQuizBadgeClass = (quiz) => {
    if (quiz.status === "draft") {
        return "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/10 dark:text-amber-300 dark:ring-amber-700/50"
    }

    if (quiz.computedStatus === "active") {
        return "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-300 dark:ring-emerald-700/50"
    }

    if (quiz.computedStatus === "scheduled") {
        return "bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-900/10 dark:text-blue-300 dark:ring-blue-700/50"
    }

    if (quiz.computedStatus === "expired") {
        return "bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-900/10 dark:text-slate-300 dark:ring-slate-700/50"
    }

    return "bg-indigo-100 text-indigo-800 ring-indigo-200 dark:bg-indigo-900/10 dark:text-indigo-300 dark:ring-indigo-700/50"
}

const getQuizStatusLabel = (quiz) => {
    if (quiz.status === "draft") return "Draft"
    if (quiz.computedStatus === "active") return "Live"
    if (quiz.computedStatus === "scheduled") return "Scheduled"
    if (quiz.computedStatus === "expired") return "Closed"
    return "Published"
}

export default function ClassDetails() {
    const { classId } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const { user } = useAuthStore()

    const [classData, setClassData] = useState(null)
    const [quizzes, setQuizzes] = useState([])
    const [messages, setMessages] = useState([])

    const [loading, setLoading] = useState(true)
    const [quizzesLoading, setQuizzesLoading] = useState(true)
    const [messagesLoading, setMessagesLoading] = useState(false)

    const [error, setError] = useState("")
    const [messagesError, setMessagesError] = useState("")

    const [actionLoading, setActionLoading] = useState("")
    const [copied, setCopied] = useState(false)

    const [newMessage, setNewMessage] = useState("")
    const [postingMessage, setPostingMessage] = useState(false)

    const [commentDrafts, setCommentDrafts] = useState({})
    const [commentLoadingId, setCommentLoadingId] = useState("")
    const [deletingMessageId, setDeletingMessageId] = useState("")
    const [deletingCommentKey, setDeletingCommentKey] = useState("")

    const activeTabParam = searchParams.get("tab")
    const activeTab = TAB_CONFIG.some((tab) => tab.value === activeTabParam)
        ? activeTabParam
        : "classroom"

    const classObjectId = classData?._id
    const classCode = classData?.classCode

    const fetchClassDetails = useCallback(async () => {
        setLoading(true)
        setError("")

        try {
            const response = await api.get(`/classes/id/${classId}`)
            setClassData(response?.data?.data || null)
        } catch (err) {
            console.error("Failed to fetch class details:", err)
            setError(
                err?.response?.data?.message || "Failed to fetch class details"
            )
        } finally {
            setLoading(false)
        }
    }, [classId])

    const fetchQuizzes = useCallback(async () => {
        setQuizzesLoading(true)

        try {
            const response = await api.get(`/quizzes/class/${classId}/quizzes`)
            const fetched = response?.data?.data?.quizzes
            setQuizzes(Array.isArray(fetched) ? fetched : [])
        } catch (err) {
            console.error("Failed to fetch quizzes:", err)
            setQuizzes([])
        } finally {
            setQuizzesLoading(false)
        }
    }, [classId])

    const fetchMessages = useCallback(
        async ({ silent = false } = {}) => {
            if (!silent) {
                setMessagesLoading(true)
            }

            try {
                const response = await api.get(
                    `/class-messages/class/${classId}/messages?limit=20&sort=newest`
                )
                const fetchedMessages = response?.data?.data?.messages
                setMessages(
                    Array.isArray(fetchedMessages) ? fetchedMessages : []
                )
                setMessagesError("")
            } catch (err) {
                console.error("Failed to fetch class messages:", err)
                setMessagesError(
                    err?.response?.data?.message ||
                        "Failed to load classroom announcements."
                )
            } finally {
                if (!silent) {
                    setMessagesLoading(false)
                }
            }
        },
        [classId]
    )

    useEffect(() => {
        setMessages([])
        setMessagesError("")
        fetchClassDetails()
        fetchQuizzes()
    }, [classId, fetchClassDetails, fetchQuizzes])

    useEffect(() => {
        if (activeTab === "classroom") {
            fetchMessages()
        }
    }, [activeTab, fetchMessages])

    const currentUserId = normalizeId(user?._id)
    const isFaculty = currentUserId === normalizeId(classData?.faculty)
    const isClassRepresentative =
        currentUserId === normalizeId(classData?.classRepresentative)
    const canPostMessages = isFaculty || isClassRepresentative

    const activeStudents = useMemo(() => {
        if (!Array.isArray(classData?.students)) {
            return []
        }

        return classData.students.filter((student) => {
            if (!student?.status) return true
            return student.status === "active"
        })
    }, [classData])

    const upcomingQuizzes = useMemo(() => {
        const now = Date.now()

        return [...quizzes]
            .filter((quiz) => {
                const deadline = toDate(quiz.deadline)
                return deadline ? deadline.getTime() >= now : false
            })
            .sort((a, b) => {
                const first = toDate(a.deadline)?.getTime() || 0
                const second = toDate(b.deadline)?.getTime() || 0
                return first - second
            })
            .slice(0, 4)
    }, [quizzes])

    const quizzesBySection = useMemo(() => {
        const sectionBuckets = {
            active: quizzes.filter(
                (quiz) =>
                    quiz.status !== "draft" && quiz.computedStatus === "active"
            ),
            scheduled: quizzes.filter(
                (quiz) =>
                    quiz.status !== "draft" &&
                    quiz.computedStatus === "scheduled"
            ),
            expired: quizzes.filter(
                (quiz) =>
                    quiz.status !== "draft" && quiz.computedStatus === "expired"
            ),
            draft: quizzes.filter((quiz) => quiz.status === "draft"),
        }

        if (!isFaculty) {
            sectionBuckets.draft = []
        }

        return sectionBuckets
    }, [isFaculty, quizzes])

    const handleTabChange = (nextTab) => {
        if (nextTab === "classroom") {
            setSearchParams({}, { replace: true })
            return
        }

        setSearchParams({ tab: nextTab }, { replace: true })
    }

    const handleAssignCR = useCallback(
        async (studentId) => {
            if (!classObjectId) return

            if (
                !window.confirm("Assign this student as class representative?")
            ) {
                return
            }

            setActionLoading(studentId)
            try {
                await api.post(
                    `/classes/${classObjectId}/cr/assign/${studentId}`
                )
                await fetchClassDetails()
            } catch (err) {
                console.error("Error assigning CR:", err)
                window.alert("Failed to assign class representative")
            } finally {
                setActionLoading("")
            }
        },
        [classObjectId, fetchClassDetails]
    )

    const handleRemoveCR = useCallback(async () => {
        if (!classObjectId) return

        if (!window.confirm("Remove the current class representative?")) {
            return
        }

        const crId = normalizeId(classData?.classRepresentative)
        setActionLoading(crId)

        try {
            await api.delete(`/classes/${classObjectId}/cr/remove`)
            await fetchClassDetails()
        } catch (err) {
            console.error("Error removing CR:", err)
            window.alert("Failed to remove class representative")
        } finally {
            setActionLoading("")
        }
    }, [classData, classObjectId, fetchClassDetails])

    const handleRemoveStudent = useCallback(
        async (studentId) => {
            if (!classCode) return

            if (!window.confirm("Remove this student from the class?")) {
                return
            }

            setActionLoading(studentId)

            try {
                await api.delete(
                    `/classes/${classCode}/students/${studentId}/remove`
                )
                await fetchClassDetails()
            } catch (err) {
                console.error("Error removing student:", err)
                window.alert("Failed to remove student")
            } finally {
                setActionLoading("")
            }
        },
        [classCode, fetchClassDetails]
    )

    const handleCopyClassCode = async () => {
        if (!classCode) return

        try {
            await navigator.clipboard.writeText(classCode)
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
        } catch (err) {
            console.error("Failed to copy class code:", err)
        }
    }

    const handlePostMessage = async (event) => {
        event.preventDefault()
        const trimmedMessage = newMessage.trim()

        if (!trimmedMessage) {
            return
        }

        setPostingMessage(true)

        try {
            await api.post(`/class-messages/class/${classId}/messages`, {
                content: trimmedMessage,
            })
            setNewMessage("")
            await fetchMessages({ silent: true })
        } catch (err) {
            console.error("Failed to post message:", err)
            setMessagesError(
                err?.response?.data?.message ||
                    "Failed to post announcement. Please try again."
            )
        } finally {
            setPostingMessage(false)
        }
    }

    const handleCommentChange = (messageId, value) => {
        setCommentDrafts((previous) => ({
            ...previous,
            [messageId]: value,
        }))
    }

    const handleAddComment = async (messageId) => {
        const content = commentDrafts[messageId]?.trim()
        if (!content) {
            return
        }

        setCommentLoadingId(messageId)

        try {
            await api.post(`/class-messages/messages/${messageId}/comments`, {
                content,
            })
            setCommentDrafts((previous) => ({
                ...previous,
                [messageId]: "",
            }))
            await fetchMessages({ silent: true })
        } catch (err) {
            console.error("Failed to add comment:", err)
            setMessagesError(
                err?.response?.data?.message ||
                    "Failed to add comment. Please try again."
            )
        } finally {
            setCommentLoadingId("")
        }
    }

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm("Delete this announcement?")) {
            return
        }

        setDeletingMessageId(messageId)

        try {
            await api.delete(`/class-messages/messages/${messageId}`)
            await fetchMessages({ silent: true })
        } catch (err) {
            console.error("Failed to delete message:", err)
            setMessagesError(
                err?.response?.data?.message || "Failed to delete announcement."
            )
        } finally {
            setDeletingMessageId("")
        }
    }

    const handleDeleteComment = async (messageId, commentId) => {
        if (!window.confirm("Delete this comment?")) {
            return
        }

        const commentKey = `${messageId}:${commentId}`
        setDeletingCommentKey(commentKey)

        try {
            await api.delete(
                `/class-messages/messages/${messageId}/comments/${commentId}`
            )
            await fetchMessages({ silent: true })
        } catch (err) {
            console.error("Failed to delete comment:", err)
            setMessagesError(
                err?.response?.data?.message || "Failed to delete comment."
            )
        } finally {
            setDeletingCommentKey("")
        }
    }

    if (loading) {
        return (
            <div className="min-h-[65vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
                    <p className="text-sm font-medium text-slate-600">
                        Loading classroom...
                    </p>
                </div>
            </div>
        )
    }

    if (error || !classData) {
        return (
            <div className="min-h-[65vh] flex items-center justify-center">
                <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h2 className="text-center text-xl font-bold text-slate-900">
                        Unable to load class
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        {error || "Class details are unavailable right now."}
                    </p>
                    <div className="mt-5 flex justify-center">
                        <button
                            type="button"
                            onClick={fetchClassDetails}
                            className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative space-y-6">
            <div className="pointer-events-none absolute -top-8 -left-10 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />
            <div className="pointer-events-none absolute top-6 right-0 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />

            <section className="relative overflow-hidden rounded-[30px] border border-slate-200/70 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-900 to-blue-900 px-7 py-8 text-white">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_48%)]" />
                    <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-xs uppercase tracking-[0.18em] text-blue-100/90">
                                Classroom
                            </p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                                {classData.subjectName}
                            </h1>
                            <p className="mt-2 text-sm text-blue-100/90 sm:text-base">
                                {classData.subjectCode} • Semester{" "}
                                {classData.semester} • {classData.classSlot}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                                {classData.totalStudents ||
                                    activeStudents.length}{" "}
                                members
                            </span>
                            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                                {quizzes.length} quizzes
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyClassCode}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
                                title="Copy class code"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                                {copied ? "Copied" : classData.classCode}
                            </button>
                        </div>
                    </div>
                </div>

                <nav className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                    {TAB_CONFIG.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => handleTabChange(tab.value)}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                activeTab === tab.value
                                    ? "bg-white text-primary-700 shadow-sm ring-1 ring-primary-200 dark:bg-slate-900/70 dark:text-indigo-400 dark:ring-indigo-900/10 dark:shadow-indigo-900/70"
                                    : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/90 dark:hover:text-white"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </section>

            {activeTab === "classroom" && (
                <div className="grid gap-6 lg:grid-cols-12">
                    <section className="space-y-5 lg:col-span-8">
                        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                                    <MessageSquareText className="h-5 w-5 text-primary-600" />
                                    Classroom Stream
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => fetchMessages()}
                                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 cursor-pointer"
                                >
                                    Refresh
                                </button>
                            </div>

                            {canPostMessages ? (
                                <form
                                    onSubmit={handlePostMessage}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                >
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        Post an announcement
                                    </label>
                                    <textarea
                                        value={newMessage}
                                        onChange={(event) =>
                                            setNewMessage(event.target.value)
                                        }
                                        rows={4}
                                        maxLength={1000}
                                        placeholder="Share updates, reminders, or study pointers with your class..."
                                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                    />
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <span className="text-xs text-slate-500">
                                            {newMessage.trim().length}/1000
                                        </span>
                                        <button
                                            type="submit"
                                            disabled={
                                                postingMessage ||
                                                !newMessage.trim().length
                                            }
                                            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                        >
                                            <Send className="h-4 w-4" />
                                            {postingMessage
                                                ? "Posting..."
                                                : "Post"}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                    Faculty and class representatives can post
                                    announcements. You can still participate in
                                    comments below.
                                </div>
                            )}

                            {messagesError ? (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {messagesError}
                                </div>
                            ) : null}

                            {messagesLoading ? (
                                <div className="py-10 text-center text-sm text-slate-500">
                                    Loading announcements...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                                    <GraduationCap className="mx-auto h-8 w-8 text-slate-400" />
                                    <p className="mt-2 text-sm text-slate-600">
                                        No announcements yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    {messages.map((message) => {
                                        const sender =
                                            message.senderDetails || {}
                                        const senderId = normalizeId(sender._id)
                                        const canDeleteMessage =
                                            senderId === currentUserId
                                        const senderName =
                                            sender.fullName || "Class"
                                        const senderAvatar = sender.avatar
                                        const sortedComments = Array.isArray(
                                            message.comments
                                        )
                                            ? [...message.comments].sort(
                                                  (first, second) => {
                                                      const firstTime =
                                                          toDate(
                                                              first.createdAt
                                                          )?.getTime() || 0
                                                      const secondTime =
                                                          toDate(
                                                              second.createdAt
                                                          )?.getTime() || 0
                                                      return (
                                                          firstTime - secondTime
                                                      )
                                                  }
                                              )
                                            : []

                                        return (
                                            <article
                                                key={message._id}
                                                className="rounded-2xl border border-slate-200 bg-white p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/10 dark:text-indigo-300">
                                                            {senderAvatar ? (
                                                                <img
                                                                    src={
                                                                        senderAvatar
                                                                    }
                                                                    alt={`${senderName} avatar`}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                getInitials(
                                                                    senderName
                                                                )
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                    {sender.fullName ||
                                                                        "Class Member"}
                                                                </p>
                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                                                    {getRoleLabel(
                                                                        sender.role
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500">
                                                                {formatRelativeTime(
                                                                    message.createdAt
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {canDeleteMessage ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDeleteMessage(
                                                                    message._id
                                                                )
                                                            }
                                                            disabled={
                                                                deletingMessageId ===
                                                                message._id
                                                            }
                                                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:!bg-red-900/50 dark:hover:!text-red-200 cursor-pointer"
                                                            title="Delete announcement"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    ) : null}
                                                </div>

                                                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                                                    {message.content}
                                                </p>

                                                <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
                                                    {sortedComments.length ===
                                                    0 ? (
                                                        <p className="text-xs text-slate-500">
                                                            No comments yet.
                                                        </p>
                                                    ) : (
                                                        sortedComments.map(
                                                            (comment) => {
                                                                const commentAuthorId =
                                                                    normalizeId(
                                                                        comment
                                                                            ?.commenter
                                                                            ?._id
                                                                    )
                                                                const canDeleteComment =
                                                                    commentAuthorId ===
                                                                    currentUserId
                                                                const commentKey = `${message._id}:${comment._id}`

                                                                return (
                                                                    <div
                                                                        key={
                                                                            comment._id
                                                                        }
                                                                        className="flex items-start justify-between gap-2 rounded-lg bg-white px-2.5 py-2"
                                                                    >
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-slate-800">
                                                                                {
                                                                                    comment
                                                                                        ?.commenter
                                                                                        ?.fullName
                                                                                }
                                                                            </p>
                                                                            <p className="text-xs text-slate-700">
                                                                                {
                                                                                    comment.content
                                                                                }
                                                                            </p>
                                                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                                                {formatRelativeTime(
                                                                                    comment.createdAt
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        {canDeleteComment ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleDeleteComment(
                                                                                        message._id,
                                                                                        comment._id
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    deletingCommentKey ===
                                                                                    commentKey
                                                                                }
                                                                                className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:!bg-red-900/50 dark:hover:!text-red-200"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                )
                                                            }
                                                        )
                                                    )}

                                                    <form
                                                        onSubmit={(event) => {
                                                            event.preventDefault()
                                                            handleAddComment(
                                                                message._id
                                                            )
                                                        }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <input
                                                            type="text"
                                                            value={
                                                                commentDrafts[
                                                                    message._id
                                                                ] || ""
                                                            }
                                                            onChange={(event) =>
                                                                handleCommentChange(
                                                                    message._id,
                                                                    event.target
                                                                        .value
                                                                )
                                                            }
                                                            maxLength={500}
                                                            placeholder="Add class comment..."
                                                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={
                                                                commentLoadingId ===
                                                                    message._id ||
                                                                !(
                                                                    commentDrafts[
                                                                        message
                                                                            ._id
                                                                    ] || ""
                                                                ).trim().length
                                                            }
                                                            className="rounded-lg bg-primary-600 p-2 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                                        >
                                                            <Send className="h-3.5 w-3.5" />
                                                        </button>
                                                    </form>
                                                </div>
                                            </article>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="space-y-5 lg:col-span-4">
                        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900">
                                Upcoming Quizzes
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Earliest deadlines in this class.
                            </p>

                            {upcomingQuizzes.length === 0 ? (
                                <p className="mt-4 text-sm text-slate-500">
                                    No upcoming quizzes.
                                </p>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {upcomingQuizzes.map((quiz) => (
                                        <Link
                                            key={quiz._id}
                                            to={`/quizzes/${quiz._id}`}
                                            className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-primary-200 hover:bg-white"
                                        >
                                            <p className="text-sm font-semibold text-slate-900">
                                                {quiz.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                Due{" "}
                                                {formatDateTime(quiz.deadline)}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900">
                                Class Snapshot
                            </h3>
                            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-700">
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                                        Department
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {classData.department || "-"}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                                        Academic Year
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {classData.academicYear || "-"}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                                        Venue
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {classData.venue || "-"}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-900 to-indigo-900 p-5 text-white shadow-sm">
                            <h3 className="text-base font-bold">
                                Quick Actions
                            </h3>
                            <div className="mt-4 space-y-2">
                                {isFaculty ? (
                                    <Link
                                        to={`/quizzes/create?classId=${classId}`}
                                        className="inline-flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
                                    >
                                        Create Quiz
                                        <PlusCircle className="h-4 w-4" />
                                    </Link>
                                ) : (
                                    <Link
                                        to="/student/quizzes"
                                        className="inline-flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
                                    >
                                        View All My Quizzes
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    onClick={handleCopyClassCode}
                                    className="inline-flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
                                >
                                    Copy Class Code
                                    {copied ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </section>
                    </aside>
                </div>
            )}

            {activeTab === "quizzes" && (
                <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Quizzes / Classwork
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                                All quizzes mapped by timeline and publication
                                state.
                            </p>
                        </div>
                        {isFaculty ? (
                            <Link
                                to={`/quizzes/create?classId=${classId}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Create Quiz
                            </Link>
                        ) : null}
                    </div>

                    {quizzesLoading ? (
                        <div className="py-12 text-center text-sm text-slate-500">
                            Loading quizzes...
                        </div>
                    ) : quizzes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                            <FileText className="mx-auto h-8 w-8 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-600">
                                No quizzes available in this class yet.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-7">
                            {QUIZ_SECTION_CONFIG.map((section) => {
                                const sectionItems =
                                    quizzesBySection[section.key] || []

                                if (sectionItems.length === 0) {
                                    return null
                                }

                                return (
                                    <div key={section.key}>
                                        <div className="mb-3 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-base font-bold text-slate-900">
                                                    {section.title}
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    {section.description}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                {sectionItems.length}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {sectionItems.map((quiz) => {
                                                const canTakeQuiz =
                                                    !isFaculty &&
                                                    quiz.computedStatus ===
                                                        "active"
                                                const actionLabel = canTakeQuiz
                                                    ? "Take Quiz"
                                                    : isFaculty
                                                      ? "Manage"
                                                      : "View"
                                                const actionPath = canTakeQuiz
                                                    ? `/quizzes/${quiz._id}/take`
                                                    : `/quizzes/${quiz._id}`

                                                return (
                                                    <article
                                                        key={quiz._id}
                                                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-primary-200 hover:bg-white"
                                                    >
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                            <div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <h4 className="text-base font-semibold text-slate-900">
                                                                        {
                                                                            quiz.title
                                                                        }
                                                                    </h4>
                                                                    <span
                                                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${getQuizBadgeClass(quiz)}`}
                                                                    >
                                                                        {getQuizStatusLabel(
                                                                            quiz
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-1 text-sm text-slate-600">
                                                                    {quiz.description ||
                                                                        "No description provided."}
                                                                </p>
                                                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                                        Starts{" "}
                                                                        {formatDateTime(
                                                                            quiz.scheduledAt
                                                                        )}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <Clock3 className="h-3.5 w-3.5" />
                                                                        Due{" "}
                                                                        {formatDateTime(
                                                                            quiz.deadline
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <Link
                                                                to={actionPath}
                                                                className="inline-flex items-center gap-1.5 self-start rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                            >
                                                                {actionLabel}
                                                                <ArrowRight className="h-4 w-4" />
                                                            </Link>
                                                        </div>
                                                    </article>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>
            )}

            {activeTab === "members" && (
                <div className="grid gap-6 xl:grid-cols-12">
                    <section className="space-y-4 xl:col-span-4">
                        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900">
                                Teachers
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Faculty managing this class.
                            </p>

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                        {classData?.faculty?.avatar ? (
                                            <img
                                                src={classData.faculty.avatar}
                                                alt={`${classData?.faculty?.fullName || "Faculty"} avatar`}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            getInitials(
                                                classData?.faculty?.fullName ||
                                                    "F"
                                            )
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {classData?.faculty?.fullName ||
                                                "Faculty"}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {classData?.faculty?.email ||
                                                "No email available"}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                                    <Shield className="h-3.5 w-3.5" />
                                    Lead Instructor
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900">
                                Member Stats
                            </h3>
                            <div className="mt-4 grid gap-2 text-sm">
                                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                                    Total active students:{" "}
                                    {activeStudents.length}
                                </div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                                    Class representative:{" "}
                                    {classData?.classRepresentative?.fullName ||
                                        "Not assigned"}
                                </div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                                    Class created:{" "}
                                    {formatDate(classData?.createdAt)}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="xl:col-span-8">
                        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                                    <Users className="h-5 w-5 text-primary-600" />
                                    Students
                                </h2>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                    {activeStudents.length} active
                                </span>
                            </div>

                            {activeStudents.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                                    <UserRound className="mx-auto h-8 w-8 text-slate-400" />
                                    <p className="mt-2 text-sm text-slate-600">
                                        No active students in this class.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {activeStudents.map((student) => {
                                        const studentProfile =
                                            student.user || {}
                                        const studentId =
                                            normalizeId(studentProfile)
                                        const studentAvatar =
                                            studentProfile.avatar
                                        const isCR =
                                            studentId ===
                                            normalizeId(
                                                classData?.classRepresentative
                                            )
                                        const isActionBusy =
                                            actionLoading === studentId
                                        const avatarClasses = isCR
                                            ? "bg-amber-100 text-amber-800 ring-2 ring-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:ring-amber-700"
                                            : "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 dark:ring-primary-700"

                                        return (
                                            <article
                                                key={studentId}
                                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${avatarClasses}`}
                                                        >
                                                            {studentAvatar ? (
                                                                <img
                                                                    src={
                                                                        studentAvatar
                                                                    }
                                                                    alt={`${studentProfile.fullName || "Student"} avatar`}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                getInitials(
                                                                    studentProfile.fullName ||
                                                                        "S"
                                                                )
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                    {
                                                                        studentProfile.fullName
                                                                    }
                                                                </p>
                                                                {isCR ? (
                                                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                                                                        CR
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-xs text-slate-500">
                                                                {
                                                                    studentProfile.email
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span className="text-[11px] text-slate-500">
                                                        Joined{" "}
                                                        {formatDate(
                                                            student.joinedAt
                                                        )}
                                                    </span>
                                                </div>

                                                {isFaculty ? (
                                                    <div className="mt-3 flex items-center gap-2">
                                                        {isCR ? (
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    handleRemoveCR
                                                                }
                                                                disabled={
                                                                    isActionBusy
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <ShieldOff className="h-3.5 w-3.5" />
                                                                Revoke CR
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleAssignCR(
                                                                        studentId
                                                                    )
                                                                }
                                                                disabled={
                                                                    isActionBusy
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-2.5 py-1.5 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <Shield className="h-3.5 w-3.5" />
                                                                Make CR
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveStudent(
                                                                    studentId
                                                                )
                                                            }
                                                            disabled={
                                                                isActionBusy
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </article>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}
