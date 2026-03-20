import { useEffect, useMemo, useState } from "react"
import { BarChart3, Brain, Target, TrendingUp, Lightbulb } from "lucide-react"
import { api } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

const InsightList = ({ title, items, tone = "blue" }) => {
    const toneClass =
        tone === "green"
            ? "text-green-800 bg-green-50 border-green-100"
            : tone === "orange"
              ? "text-orange-800 bg-orange-50 border-orange-100"
              : tone === "indigo"
                ? "text-indigo-800 bg-indigo-50 border-indigo-100"
                : "text-blue-800 bg-blue-50 border-blue-100"

    return (
        <div className={`rounded-xl border p-4 ${toneClass}`}>
            <h3 className="font-semibold mb-2">{title}</h3>
            <ul className="space-y-1 text-sm">
                {(items || []).length > 0 ? (
                    items.map((item, index) => <li key={index}>- {item}</li>)
                ) : (
                    <li>No insights available yet.</li>
                )}
            </ul>
        </div>
    )
}

export default function PerformanceInsights() {
    const { user } = useAuthStore()
    const role = user?.role

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Student view state
    const [studentPerformances, setStudentPerformances] = useState([])
    const [selectedPerformanceId, setSelectedPerformanceId] = useState("")

    // Faculty view state
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
            setSelectedStudentId((prev) => {
                if (students.some((student) => student._id === prev)) {
                    return prev
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
            ? [...performanceDoc.history].slice(-5).reverse()
            : []

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4">
                        <Brain className="w-5 h-5 mr-2 text-indigo-600" />
                        Latest Insights Summary
                    </h2>
                    <p className="text-gray-700">
                        {insights.summary ||
                            "No summary generated yet. Complete more quizzes to build insights."}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Attempts</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {stats.attemptsCount || 0}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Average %</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {Number(stats.averagePercentage || 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Best %</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {Number(stats.bestPercentage || 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Last %</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {Number(stats.lastPercentage || 0).toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                        Recent Insight History
                    </h2>
                    <div className="space-y-3">
                        {history.length > 0 ? (
                            history.map((entry, index) => (
                                <div
                                    key={index}
                                    className="rounded-lg border border-gray-100 p-3"
                                >
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                        <span>
                                            {entry?.quiz?.title || "Quiz"}
                                        </span>
                                        <span>
                                            {Number(
                                                entry?.percentage || 0
                                            ).toFixed(2)}
                                            %
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-800 mt-1">
                                        {entry?.insightsSnapshot?.summary ||
                                            "No summary for this attempt."}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">
                                No history available yet.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
                    Performance Insights
                </h1>
                <p className="text-gray-600 mt-2">
                    Centralized learning insights generated from historical and
                    latest quiz performance.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            {role === "student" && (
                <div className="space-y-6">
                    {studentPerformances.length > 1 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Class
                            </label>
                            <select
                                value={selectedPerformanceId}
                                onChange={(e) =>
                                    setSelectedPerformanceId(e.target.value)
                                }
                                className="w-full md:w-96 p-2 border border-gray-300 rounded-lg"
                            >
                                {studentPerformances.map((item) => (
                                    <option key={item._id} value={item._id}>
                                        {item?.class?.subjectName || "Class"} -{" "}
                                        {item?.class?.subjectCode || ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-gray-600">Loading insights...</div>
                    ) : selectedStudentPerformance ? (
                        renderInsightsPanel(selectedStudentPerformance)
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-600">
                            No insights found yet. Complete a quiz to generate
                            centralized insights.
                        </div>
                    )}
                </div>
            )}

            {role === "faculty" && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Class
                            </label>
                            <select
                                value={selectedClassId}
                                onChange={(e) =>
                                    setSelectedClassId(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                {classes.map((classDoc) => (
                                    <option
                                        key={classDoc._id}
                                        value={classDoc._id}
                                    >
                                        {classDoc.subjectName} -{" "}
                                        {classDoc.subjectCode}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Student
                            </label>
                            <select
                                value={selectedStudentId}
                                onChange={(e) =>
                                    setSelectedStudentId(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                {facultyStudents.map((student) => (
                                    <option
                                        key={student._id}
                                        value={student._id}
                                    >
                                        {student.fullName}
                                        {student.studentId
                                            ? ` (${student.studentId})`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-gray-600">Loading insights...</div>
                    ) : facultyPerformance ? (
                        renderInsightsPanel(facultyPerformance)
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-600">
                            <div className="flex items-center mb-2">
                                <Target className="w-4 h-4 mr-2" />
                                Select a class and student to view centralized
                                insights.
                            </div>
                            <div className="flex items-center">
                                <Lightbulb className="w-4 h-4 mr-2" />
                                Insights are generated cumulatively after every
                                quiz.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
