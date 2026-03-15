import { useEffect, useState, useCallback } from "react"
import {
    Shield,
    Users,
    GraduationCap,
    BookOpen,
    FileText,
    ClipboardCheck,
    UserCheck,
    UserX,
    Search,
    ChevronLeft,
    ChevronRight,
    Trash2,
    RefreshCw,
} from "lucide-react"
import { api } from "../../services/api.js"
import { DashboardSkeleton } from "../../components/LoadingStates"
import { showToast } from "../../components/Toast.jsx"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
    active: "bg-emerald-100 text-emerald-800",
    suspended: "bg-amber-100 text-amber-800",
    deactivated: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-700",
}

const StatusBadge = ({ status }) => (
    <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] || "bg-gray-100 text-gray-700"}`}
    >
        {status}
    </span>
)

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                    {value ?? "—"}
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

const Pagination = ({ pagination, onPageChange }) => {
    if (!pagination || pagination.pages <= 1) return null
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
            <span>
                Page {pagination.page} of {pagination.pages} &nbsp;·&nbsp;{" "}
                {pagination.total} total
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get("/admin/superadmin/dashboard")
            .then((r) => setData(r.data?.data?.overview || null))
            .catch(() => showToast.error("Failed to load overview"))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <DashboardSkeleton />

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Admin Accounts
                </h2>
                <p className="text-sm text-gray-600 mb-3">
                    Includes both admin and superadmin accounts.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Admin Accounts"
                        value={data?.totalAdmins}
                        icon={Shield}
                        colorClass="bg-red-100 text-red-700"
                    />
                    <StatCard
                        title="Superadmins"
                        value={data?.totalSuperAdmins}
                        icon={Shield}
                        colorClass="bg-orange-100 text-orange-700"
                    />
                    <StatCard
                        title="Active Admin Accounts"
                        value={data?.activeAdmins}
                        icon={UserCheck}
                        colorClass="bg-emerald-100 text-emerald-700"
                    />
                    <StatCard
                        title="Suspended Admin Accounts"
                        value={data?.suspendedAdmins}
                        icon={UserX}
                        colorClass="bg-amber-100 text-amber-700"
                    />
                </div>
            </div>
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Platform Users
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        title="Total Users"
                        value={data?.totalUsers}
                        icon={Users}
                        colorClass="bg-blue-100 text-blue-700"
                    />
                    <StatCard
                        title="Faculty"
                        value={data?.totalFaculty}
                        icon={BookOpen}
                        colorClass="bg-indigo-100 text-indigo-700"
                    />
                    <StatCard
                        title="Students"
                        value={data?.totalStudents}
                        icon={GraduationCap}
                        colorClass="bg-purple-100 text-purple-700"
                    />
                    <StatCard
                        title="Classes"
                        value={data?.totalClasses}
                        icon={BookOpen}
                        colorClass="bg-cyan-100 text-cyan-700"
                    />
                    <StatCard
                        title="Quizzes"
                        value={data?.totalQuizzes}
                        icon={FileText}
                        colorClass="bg-teal-100 text-teal-700"
                    />
                    <StatCard
                        title="Quiz Attempts"
                        value={data?.totalAttempts}
                        icon={ClipboardCheck}
                        colorClass="bg-rose-100 text-rose-700"
                    />
                </div>
            </div>
        </div>
    )
}

// ─── Tab: Manage Admins ───────────────────────────────────────────────────────
function ManageAdminsTab() {
    const [admins, setAdmins] = useState([])
    const [pagination, setPagination] = useState(null)
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)

    const fetchAdmins = useCallback(() => {
        setLoading(true)
        const params = new URLSearchParams({ page, limit: 20 })
        if (search.trim()) params.set("search", search.trim())
        api.get(`/admin/superadmin/admins?${params}`)
            .then((r) => {
                setAdmins(r.data?.data?.admins || [])
                setPagination(r.data?.data?.pagination || null)
            })
            .catch(() => showToast.error("Failed to load admins"))
            .finally(() => setLoading(false))
    }, [page, search])

    useEffect(() => {
        fetchAdmins()
    }, [fetchAdmins])

    const handleStatusChange = async (id, status) => {
        setActionLoading(id + status)
        try {
            await api.patch(`/admin/superadmin/admins/${id}/status`, { status })
            showToast.success(`Admin ${status}`)
            fetchAdmins()
        } catch (err) {
            showToast.error(
                err.response?.data?.message || "Failed to update status"
            )
        } finally {
            setActionLoading(null)
        }
    }

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete admin "${name}"? This cannot be undone.`))
            return
        setActionLoading(id + "delete")
        try {
            await api.delete(`/admin/superadmin/admins/${id}`)
            showToast.success("Admin deleted")
            fetchAdmins()
        } catch (err) {
            showToast.error(
                err.response?.data?.message || "Failed to delete admin"
            )
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, admin/superadmin ID…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(1)
                        }}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50 focus:bg-white"
                    />
                </div>
                <button
                    onClick={fetchAdmins}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Name
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Email
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Role
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Admin/Superadmin ID
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Status
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Last Login
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-8 text-center text-gray-400"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            ) : admins.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-8 text-center text-gray-400"
                                    >
                                        No admins found
                                    </td>
                                </tr>
                            ) : (
                                admins.map((admin) => (
                                    <tr
                                        key={admin._id}
                                        className="border-t border-gray-100 hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {admin.name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {admin.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                                    admin.role === "superadmin"
                                                        ? "bg-orange-100 text-orange-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-700">
                                            {admin.adminId ||
                                                admin.superAdminId ||
                                                "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge
                                                status={admin.accountStatus}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {admin.lastLogin
                                                ? new Date(
                                                      admin.lastLogin
                                                  ).toLocaleDateString()
                                                : "Never"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {admin.role !== "superadmin" &&
                                                    admin.accountStatus !==
                                                        "active" && (
                                                        <button
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    admin._id,
                                                                    "active"
                                                                )
                                                            }
                                                            disabled={
                                                                !!actionLoading
                                                            }
                                                            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                                                        >
                                                            Activate
                                                        </button>
                                                    )}
                                                {admin.role !== "superadmin" &&
                                                    admin.accountStatus !==
                                                        "suspended" && (
                                                        <button
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    admin._id,
                                                                    "suspended"
                                                                )
                                                            }
                                                            disabled={
                                                                !!actionLoading
                                                            }
                                                            className="px-2.5 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                                        >
                                                            Suspend
                                                        </button>
                                                    )}
                                                {admin.role !== "superadmin" &&
                                                    admin.accountStatus !==
                                                        "deactivated" && (
                                                        <button
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    admin._id,
                                                                    "deactivated"
                                                                )
                                                            }
                                                            disabled={
                                                                !!actionLoading
                                                            }
                                                            className="px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                                        >
                                                            Deactivate
                                                        </button>
                                                    )}
                                                {admin.role !== "superadmin" ? (
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(
                                                                admin._id,
                                                                admin.name
                                                            )
                                                        }
                                                        disabled={
                                                            !!actionLoading
                                                        }
                                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                                        title="Delete admin"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">
                                                        Protected
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    pagination={pagination}
                    onPageChange={(p) => setPage(p)}
                />
            </div>
        </div>
    )
}

// ─── Tab: Manage Users ────────────────────────────────────────────────────────
function ManageUsersTab() {
    const [users, setUsers] = useState([])
    const [pagination, setPagination] = useState(null)
    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState("")
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)

    const fetchUsers = useCallback(() => {
        setLoading(true)
        const params = new URLSearchParams({ page, limit: 20 })
        if (search.trim()) params.set("search", search.trim())
        if (roleFilter) params.set("role", roleFilter)
        api.get(`/admin/superadmin/users?${params}`)
            .then((r) => {
                setUsers(r.data?.data?.users || [])
                setPagination(r.data?.data?.pagination || null)
            })
            .catch(() => showToast.error("Failed to load users"))
            .finally(() => setLoading(false))
    }, [page, search, roleFilter])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleStatusChange = async (id, status) => {
        setActionLoading(id + status)
        try {
            await api.patch(`/admin/superadmin/users/${id}/status`, { status })
            showToast.success(`User ${status}`)
            fetchUsers()
        } catch (err) {
            showToast.error(
                err.response?.data?.message || "Failed to update status"
            )
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(1)
                        }}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50 focus:bg-white"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => {
                        setRoleFilter(e.target.value)
                        setPage(1)
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50"
                >
                    <option value="">All Roles</option>
                    <option value="faculty">Faculty</option>
                    <option value="student">Student</option>
                </select>
                <button
                    onClick={fetchUsers}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Name
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Email
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Role
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    ID
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Status
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Email Verified
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-8 text-center text-gray-400"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-8 text-center text-gray-400"
                                    >
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr
                                        key={user._id}
                                        className="border-t border-gray-100 hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {user.fullName}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${user.role === "faculty" ? "bg-indigo-100 text-indigo-700" : "bg-purple-100 text-purple-700"}`}
                                            >
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-700">
                                            {user.facultyId ||
                                                user.studentId ||
                                                "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge
                                                status={user.accountStatus}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`text-xs font-medium ${user.isEmailVerified ? "text-emerald-600" : "text-gray-400"}`}
                                            >
                                                {user.isEmailVerified
                                                    ? "Verified"
                                                    : "Unverified"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {user.accountStatus !==
                                                    "active" && (
                                                    <button
                                                        onClick={() =>
                                                            handleStatusChange(
                                                                user._id,
                                                                "active"
                                                            )
                                                        }
                                                        disabled={
                                                            !!actionLoading
                                                        }
                                                        className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                                                    >
                                                        Activate
                                                    </button>
                                                )}
                                                {user.accountStatus !==
                                                    "suspended" && (
                                                    <button
                                                        onClick={() =>
                                                            handleStatusChange(
                                                                user._id,
                                                                "suspended"
                                                            )
                                                        }
                                                        disabled={
                                                            !!actionLoading
                                                        }
                                                        className="px-2.5 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                                    >
                                                        Suspend
                                                    </button>
                                                )}
                                                {user.accountStatus !==
                                                    "deactivated" && (
                                                    <button
                                                        onClick={() =>
                                                            handleStatusChange(
                                                                user._id,
                                                                "deactivated"
                                                            )
                                                        }
                                                        disabled={
                                                            !!actionLoading
                                                        }
                                                        className="px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                                    >
                                                        Deactivate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    pagination={pagination}
                    onPageChange={(p) => setPage(p)}
                />
            </div>
        </div>
    )
}

// ─── Root component ───────────────────────────────────────────────────────────
const TABS = [
    { id: "overview", label: "Overview" },
    { id: "admins", label: "Manage Admins" },
    { id: "users", label: "Manage Users" },
]

export default function SuperAdminDashboard() {
    const [activeTab, setActiveTab] = useState("overview")

    return (
        <div className="space-y-6">
            {/* Header */}
            <section>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Superadmin Dashboard
                        </h1>
                        <p className="text-gray-600">
                            Full platform control — manage admins and users
                        </p>
                    </div>
                </div>
            </section>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? "border-red-600 text-red-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content */}
            {activeTab === "overview" && <OverviewTab />}
            {activeTab === "admins" && <ManageAdminsTab />}
            {activeTab === "users" && <ManageUsersTab />}
        </div>
    )
}
