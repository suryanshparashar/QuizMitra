import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { api } from "../../services/api"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"
import { Award, TrendingUp, Clock, Book } from "lucide-react"

export default function StudentAnalytics() {
    const { studentId } = useParams()
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Determine ID (use logged-in user if not provided in params - e.g. student viewing own profile)
                // For now assuming route params or we fetch specialized 'my-analytics'
                const endpoint = studentId
                    ? `/analytics/student/${studentId}`
                    : `/analytics/overall?role=student`

                // Note: The controller `getStudentProgressAnalytics` expects studentId param
                // If viewing own, we might need to adjust or pass current user ID
                // For this example, let's assume we pass the specific student ID
                if (studentId) {
                    const response = await api.get(
                        `/analytics/student/${studentId}`
                    )
                    setAnalytics(response.data.data)
                }
            } catch (error) {
                console.error("Error fetching student analytics:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchAnalytics()
    }, [studentId])

    if (loading)
        return <div className="p-8 text-center">Loading analytics...</div>
    if (!analytics)
        return <div className="p-8 text-center">Analytics not found</div>

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    {analytics.student.fullName}'s Progress
                </h1>
                <p className="text-gray-500">
                    Student ID: {analytics.student.studentId}
                </p>
            </div>

            {/* Engagement Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Quizzes Attempted"
                    value={analytics.engagement.quizzesAttempted}
                    icon={Book}
                    color="blue"
                />
                <StatCard
                    title="Avg Score"
                    value={`${analytics.engagement.averageScore.toFixed(1)}%`}
                    icon={Award}
                    color="green"
                />
                <StatCard
                    title="Overall Improvement"
                    value={`${analytics.progress.overallImprovement}%`}
                    icon={TrendingUp}
                    color="purple"
                />
                {/* Placeholder for time spent */}
                <StatCard
                    title="Consistency"
                    value={analytics.progress.consistency}
                    icon={Clock}
                    color="orange"
                />
            </div>

            {/* Progress Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
                <h3 className="text-lg font-medium mb-4">
                    Performance History
                </h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.progress.trend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) =>
                                    new Date(date).toLocaleDateString(
                                        undefined,
                                        { month: "short", day: "numeric" }
                                    )
                                }
                            />
                            <YAxis domain={[0, 100]} />
                            <Tooltip
                                labelFormatter={(date) =>
                                    new Date(date).toLocaleDateString()
                                }
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#4F46E5"
                                strokeWidth={2}
                                activeDot={{ r: 8 }}
                                name="Score (%)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Subject/Topic Performance (Placeholder if data not yet granular) */}
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color }) {
    const colors = {
        blue: "bg-blue-100 text-blue-600",
        green: "bg-green-100 text-green-600",
        purple: "bg-purple-100 text-purple-600",
        orange: "bg-orange-100 text-orange-600",
    }
    return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 flex items-center">
            <div className={`p-3 rounded-full ${colors[color]} mr-4`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
        </div>
    )
}
