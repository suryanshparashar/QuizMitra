import { useEffect, useMemo, useState } from "react"
import {
    BarChart3,
    Brain,
    GraduationCap,
    Lightbulb,
    Target,
    TrendingUp,
    Users,
} from "lucide-react"
import { api } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

const formatValue = (value) => Number(value || 0).toFixed(2)

const InsightList = ({ title, items, tone = "blue" }) => {
    const toneMap = {
        blue: {
            card: "bg-blue-50 border-blue-100",
            heading: "text-blue-900",
            bullet: "bg-blue-500",
            text: "text-blue-800",
        },
        green: {
            card: "bg-emerald-50 border-emerald-100",
            heading: "text-emerald-900",
            bullet: "bg-emerald-500",
            text: "text-emerald-800",
        },
        orange: {
            card: "bg-orange-50 border-orange-100",
            heading: "text-orange-900",
            bullet: "bg-orange-500",
            text: "text-orange-800",
        },
        indigo: {
            card: "bg-indigo-50 border-indigo-100",
            heading: "text-indigo-900",
            bullet: "bg-indigo-500",
            text: "text-indigo-800",
        },
    }

    const palette = toneMap[tone] || toneMap.blue
    const list = Array.isArray(items) ? items : []

    return (
        <section className={`rounded-2xl border p-4 ${palette.card}`}>
            <h3 className={`text-sm font-bold uppercase tracking-[0.08em] ${palette.heading}`}>
                {title}
            </h3>

            {list.length > 0 ? (
                <ul className="mt-3 space-y-2">
                    {list.map((item, index) => (
                        <li
                            key={`${title}-${index}`}
                            className={`flex items-start gap-2 text-sm ${palette.text}`}
                        >
                            <span
                                className={`mt-1.5 h-1.5 w-1.5 rounded-full ${palette.bullet}`}
                            />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={`mt-3 text-sm ${palette.text}`}>
                    Insights will appear after more attempts.
                </p>
            )}
        </section>
    )
}

const StatCard = ({ label, value }) => {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500 font-semibold">
                {label}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {value}
            </p>
        </article>
    )
}

export default function PerformanceInsights() {
    const { user } = useAuthStore()
    const role = user?.role

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [studentPerformances, setStudentPerformances] = useState([])
    const [selectedPerformanceId, setSelectedPerformanceId] = useState("")

    const [classes, setClasses] = useState([])
    const [selectedClassId, setSelectedClassId] = useState("")
    const [selectedStudentId, setSelectedStudentId] = useState("")
    const [facultyPerformance, setFacultyPerformance] = useState(null)

    const selectedStudentPerformance = useMemo(() => {
        if (!selectedPerformanceId) {
            return studentPerformances[0] || null
        }

        return (
            studentPerformances.find(
                (item) => item._id === selectedPerformanceId
            ) || null
        )
    }, [studentPerformances, selectedPerformanceId])

    const selectedClass = useMemo(() => {
        return classes.find((entry) => entry._id === selectedClassId) || null
    }, [classes, selectedClassId])

    const facultyStudents = useMemo(() => {
        const classStudents = Array.isArray(selectedClass?.students)
            ? selectedClass.students
            : []

        return classStudents
            .filter((entry) => entry?.status === "active" && entry?.user)
            .map((entry) => entry.user)
    }, [selectedClass])

    useEffect(() => {
        if (role === "student") {
            loadStudentInsights()
            return
        }

        if (role === "faculty") {
            loadFacultyClasses()
            return
        }

        setLoading(false)
    }, [role])

    useEffect(() => {
        if (!selectedClassId) return

        const students = facultyStudents
        if (students.length > 0) {
            setSelectedStudentId((previous) => {
                if (students.some((student) => student._id === previous)) {
                    return previous
                }
                return students[0]._id
            })
        } else {
            setSelectedStudentId("")
            setFacultyPerformance(null)
        }
    }, [selectedClassId, facultyStudents])

    useEffect(() => {
        if (role !== "faculty") return
        if (!selectedClassId || !selectedStudentId) return

        loadFacultyStudentInsights(selectedClassId, selectedStudentId)
    }, [role, selectedClassId, selectedStudentId])

    const loadStudentInsights = async () => {
        setLoading(true)
        setError("")

        try {
            const response = await api.get("/quiz-attempts/performance/me")
            const data = Array.isArray(response?.data?.data)
                ? response.data.data
                : []
            setStudentPerformances(data)
            if (data.length > 0) {
                setSelectedPerformanceId(data[0]._id)
            }
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                    "Failed to load performance insights"
            )
        } finally {
            setLoading(false)
        }
    }

    const loadFacultyClasses = async () => {
        setLoading(true)
        setError("")

        try {
            const response = await api.get("/classes/my-classes")
            const data = Array.isArray(response?.data?.data)
                ? response.data.data
                : []
            setClasses(data)
            if (data.length > 0) {
                setSelectedClassId(data[0]._id)
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to load classes")
        } finally {
            setLoading(false)
        }
    }

    const loadFacultyStudentInsights = async (classId, studentId) => {
        setLoading(true)
        setError("")

        try {
            const response = await api.get(
                `/quiz-attempts/performance/student/${studentId}`,
                {
                    params: { classId },
                }
            )
            setFacultyPerformance(response?.data?.data || null)
        } catch (err) {
            setFacultyPerformance(null)
            setError(
                err?.response?.data?.message ||
                    "Failed to load student insights"
            )
        } finally {
            setLoading(false)
        }
    }

    const renderInsightsPanel = (performanceDoc) => {
        const insights = performanceDoc?.latestInsights || {}
        const stats = performanceDoc?.stats || {}
        const history = Array.isArray(performanceDoc?.history)
            ? [...performanceDoc.history].slice(-6).reverse()
            : []

        const safeSummary =
            String(insights.summary || "").trim() ===
            "Keep building consistency. Your preparation insights will improve as more quiz data accumulates."
                ? "Topic-wise insights generated from recent quiz performance trends."
                : insights.summary

        return (
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 p-6 text-white shadow-[0_16px_36px_rgba(15,23,42,0.2)]">
                    <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 text-blue-100">
                            <Brain className="h-5 w-5" />
                            <h2 className="text-lg font-bold">Latest Summary</h2>
                        </div>
                        <p className="mt-3 text-sm sm:text-base text-blue-50 leading-relaxed">
                            {safeSummary ||
                                "No summary generated yet. Complete more quizzes to build insights."}
                        </p>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Attempts"
                        value={stats.attemptsCount || 0}
                    />
                    <StatCard
                        label="Average %"
                        value={formatValue(stats.averagePercentage)}
                    />
                    <StatCard
                        label="Best %"
                        value={formatValue(stats.bestPercentage)}
                    />
                    <StatCard
                        label="Last %"
                        value={formatValue(stats.lastPercentage)}
                    />
                </section>

                <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <InsightList
                        title="Strong Areas"
                        items={insights.strongAreas}
                        tone="green"
                    />
                    <InsightList
                        title="Weak Areas"
                        items={insights.weakAreas}
                        tone="orange"
                    />
                    <InsightList
                        title="Improvement Roadmap"
                        items={insights.improvementRoadmap}
                        tone="indigo"
                    />
                    <InsightList
                        title="Practice Guide"
                        items={insights.practiceGuide}
                        tone="blue"
                    />
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                        <TrendingUp className="h-5 w-5 text-primary-600" />
                        Recent Insight History
                    </h3>

                    {history.length > 0 ? (
                        <div className="mt-4 space-y-3">
                            {history.map((entry, index) => (
                                <article
                                    key={`history-${index}`}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                        <p className="font-semibold text-slate-900">
                                            {entry?.quiz?.title || "Quiz"}
                                        </p>
                                        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                                            {formatValue(entry?.percentage)}%
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {entry?.insightsSnapshot?.summary ||
                                            "No summary for this attempt."}
                                    </p>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-slate-500">
                            No history available yet.
                        </p>
                    )}
                </section>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
                <div className="pointer-events-none absolute -right-10 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                        {role === "faculty"
                            ? "Faculty Analytics"
                            : "Student Analytics"}
                    </p>
                    <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-black tracking-tight">
                        <BarChart3 className="h-7 w-7 text-blue-200" />
                        Performance Insights
                    </h1>
                    <p className="text-sm sm:text-base text-blue-100/95 max-w-2xl">
                        Centralized learning insights generated from historical
                        attempts and recent performance trends.
                    </p>
                </div>
            </section>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            {role === "student" && (
                <div className="space-y-6">
                    {studentPerformances.length > 1 && (
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                                Select Class
                            </label>
                            <select
                                value={selectedPerformanceId}
                                onChange={(event) =>
                                    setSelectedPerformanceId(event.target.value)
                                }
                                className="w-full md:w-96 rounded-xl border border-slate-300 px-3 py-2"
                            >
                                {studentPerformances.map((item) => (
                                    <option key={item._id} value={item._id}>
                                        {item?.class?.subjectName || "Class"} -{" "}
                                        {item?.class?.subjectCode || ""}
                                    </option>
                                ))}
                            </select>
                        </section>
                    )}

                    {loading ? (
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                            Loading insights...
                        </section>
                    ) : selectedStudentPerformance ? (
                        renderInsightsPanel(selectedStudentPerformance)
                    ) : (
                        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                            <GraduationCap className="mx-auto h-8 w-8 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-600">
                                No insights found yet. Complete a quiz to
                                generate analytics.
                            </p>
                        </section>
                    )}
                </div>
            )}

            {role === "faculty" && (
                <div className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                                    Class
                                </label>
                                <select
                                    value={selectedClassId}
                                    onChange={(event) =>
                                        setSelectedClassId(event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                >
                                    {classes.map((classDoc) => (
                                        <option key={classDoc._id} value={classDoc._id}>
                                            {classDoc.subjectName} - {classDoc.subjectCode}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                                    Student
                                </label>
                                <select
                                    value={selectedStudentId}
                                    onChange={(event) =>
                                        setSelectedStudentId(event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                >
                                    {facultyStudents.map((student) => (
                                        <option key={student._id} value={student._id}>
                                            {student.fullName}
                                            {student.studentId
                                                ? ` (${student.studentId})`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            <Users className="h-3.5 w-3.5" />
                            {facultyStudents.length} active students in selected class
                        </div>
                    </section>

                    {loading ? (
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                            Loading insights...
                        </section>
                    ) : facultyPerformance ? (
                        renderInsightsPanel(facultyPerformance)
                    ) : (
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="flex items-center gap-2 text-sm text-slate-700">
                                <Target className="h-4 w-4 text-primary-600" />
                                Select a class and student to view centralized
                                insights.
                            </p>
                            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                <Lightbulb className="h-4 w-4 text-amber-500" />
                                Insights are generated cumulatively after every
                                quiz attempt.
                            </p>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}
