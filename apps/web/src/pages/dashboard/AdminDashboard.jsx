import { useEffect, useState } from "react"
import {
    Shield,
    Users,
    GraduationCap,
    BookOpen,
    FileText,
    ClipboardCheck,
} from "lucide-react"
import { api } from "../../services/api.js"
import { DashboardSkeleton } from "../../components/LoadingStates"

const StatCard = ({ title, value, icon: Icon, colorClass }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {value}
                    </p>
                </div>
                <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center ${colorClass}`}
                >
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    )
}

export default function AdminDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadAdminDashboard = async () => {
            try {
                const response = await api.get("/admin/dashboard")
                setData(response?.data?.data || null)
            } catch (error) {
                console.error("Failed to load admin dashboard:", error)
            } finally {
                setLoading(false)
            }
        }

        loadAdminDashboard()
    }, [])

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <div className="space-y-8">
            <section>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Admin Dashboard
                        </h1>
                        <p className="text-gray-600">
                            System-wide insights across users, classes, and
                            quizzes
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Users"
                    value={data?.overview?.totalUsers || 0}
                    icon={Users}
                    colorClass="bg-blue-100 text-blue-700"
                />
                <StatCard
                    title="Faculty"
                    value={data?.overview?.totalFaculty || 0}
                    icon={BookOpen}
                    colorClass="bg-emerald-100 text-emerald-700"
                />
                <StatCard
                    title="Students"
                    value={data?.overview?.totalStudents || 0}
                    icon={GraduationCap}
                    colorClass="bg-purple-100 text-purple-700"
                />
                <StatCard
                    title="Class Representatives"
                    value={data?.overview?.totalClassRepresentatives || 0}
                    icon={Shield}
                    colorClass="bg-amber-100 text-amber-700"
                />
                <StatCard
                    title="Classes"
                    value={data?.overview?.totalClasses || 0}
                    icon={BookOpen}
                    colorClass="bg-cyan-100 text-cyan-700"
                />
                <StatCard
                    title="Quizzes"
                    value={data?.overview?.totalQuizzes || 0}
                    icon={FileText}
                    colorClass="bg-indigo-100 text-indigo-700"
                />
                <StatCard
                    title="Quiz Attempts"
                    value={data?.overview?.totalQuizAttempts || 0}
                    icon={ClipboardCheck}
                    colorClass="bg-rose-100 text-rose-700"
                />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Faculty Activity
                        </h2>
                        <p className="text-sm text-gray-600">
                            Classes and quizzes created by each faculty member
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold">
                                        Faculty
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold">
                                        Faculty ID
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold">
                                        Classes
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold">
                                        Quizzes
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.facultyStats || []).map((row) => (
                                    <tr
                                        key={row._id}
                                        className="border-t border-gray-100"
                                    >
                                        <td className="px-4 py-3 text-gray-900">
                                            {row.fullName}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-700">
                                            {row.facultyId || "-"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.classesCreated}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.quizzesCreated}
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.facultyStats ||
                                    data.facultyStats.length === 0) && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-6 text-center text-gray-500"
                                        >
                                            No faculty data found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Student Activity
                        </h2>
                        <p className="text-sm text-gray-600">
                            Classes joined and quizzes attempted by each student
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold">
                                        Student
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold">
                                        Student ID
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold">
                                        Classes Joined
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold">
                                        Attempts
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.studentStats || []).map((row) => (
                                    <tr
                                        key={row._id}
                                        className="border-t border-gray-100"
                                    >
                                        <td className="px-4 py-3 text-gray-900">
                                            {row.fullName}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-700">
                                            {row.studentId || "-"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.classesJoined}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.quizzesAttempted}
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.studentStats ||
                                    data.studentStats.length === 0) && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-6 text-center text-gray-500"
                                        >
                                            No student data found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    )
}
