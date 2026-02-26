import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { api } from "../../services/api"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts"
import { Users, BookOpen, TrendingUp, Download } from "lucide-react"

export default function ClassAnalytics() {
    const { classId } = useParams()
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await api.get(`/analytics/class/${classId}`)
                setAnalytics(response.data.data)
            } catch (error) {
                console.error("Error fetching class analytics:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchAnalytics()
    }, [classId])

    const handleExport = async () => {
        try {
            const response = await api.get(`/analytics/export`, {
                params: {
                    type: "class-performance",
                    filters: { classId },
                    format: "csv",
                },
                responseType: "blob",
            })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `class-performance-${classId}.csv`)
            document.body.appendChild(link)
            link.click()
        } catch (error) {
            console.error("Error exporting data:", error)
        }
    }

    if (loading)
        return <div className="p-8 text-center">Loading analytics...</div>

    const COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#10B981"]

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {analytics?.class?.subjectName} Analytics
                    </h1>
                    <p className="text-gray-500">
                        Code: {analytics?.class?.subjectCode} •{" "}
                        {analytics?.class?.totalStudents} Students
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Quizzes"
                    value={analytics?.overview?.totalQuizzes}
                    icon={BookOpen}
                    color="blue"
                />
                <StatCard
                    title="Avg Score"
                    value={`${analytics?.overview?.averageScore}%`}
                    icon={TrendingUp}
                    color="green"
                />
                <StatCard
                    title="Attendance"
                    value={`${analytics?.overview?.attendanceRate}%`}
                    icon={Users}
                    color="purple"
                />
                <StatCard
                    title="Pass Rate"
                    value={`${analytics?.overview?.passRate}%`}
                    icon={TrendingUp}
                    color="orange"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Score Distribution Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">
                        Score Distribution
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={
                                        analytics?.performance
                                            ?.scoreDistribution
                                    }
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="range"
                                >
                                    {analytics?.performance?.scoreDistribution?.map(
                                        (entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    COLORS[
                                                        index % COLORS.length
                                                    ]
                                                }
                                            />
                                        )
                                    )}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Performers Table */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Top Performers</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Student
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Avg Score
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {analytics?.performance?.topPerformers?.map(
                                    (student) => (
                                        <tr key={student.studentId}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {student.studentName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.averageScore}%
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
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
