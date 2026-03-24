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
    Upload,
    Image as ImageIcon,
    Video,
    Pencil,
    Eye,
    EyeOff,
    Save,
    X,
    DownloadCloud,
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

    const handleMediaPermissionChange = async (id, payload) => {
        setActionLoading(id + "media")
        try {
            await api.patch(
                `/admin/superadmin/admins/${id}/media-permissions`,
                payload
            )
            showToast.success("Media permissions updated")
            fetchAdmins()
        } catch (err) {
            showToast.error(
                err.response?.data?.message ||
                    "Failed to update media permissions"
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
                                    Media Permissions
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
                                        colSpan={8}
                                        className="px-4 py-8 text-center text-gray-400"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            ) : admins.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
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
                                            {admin.role !== "superadmin" ? (
                                                <div className="flex flex-col gap-2 min-w-[100px]">
                                                    <button
                                                        onClick={() =>
                                                            handleMediaPermissionChange(
                                                                admin._id,
                                                                {
                                                                    canView:
                                                                        !admin
                                                                            ?.mediaPermissions
                                                                            ?.canView,
                                                                }
                                                            )
                                                        }
                                                        disabled={
                                                            !!actionLoading
                                                        }
                                                        className={`w-25 inline-flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg border disabled:opacity-50 transition-colors ${
                                                            admin
                                                                ?.mediaPermissions
                                                                ?.canView
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        <span>
                                                            <Eye className="w-4 h-4 inline-block mr-1" />
                                                        </span>
                                                        <span
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                                admin
                                                                    ?.mediaPermissions
                                                                    ?.canView
                                                                    ? "bg-emerald-500"
                                                                    : "bg-gray-300"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                    admin
                                                                        ?.mediaPermissions
                                                                        ?.canView
                                                                        ? "translate-x-4"
                                                                        : "translate-x-0.5"
                                                                }`}
                                                            />
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleMediaPermissionChange(
                                                                admin._id,
                                                                {
                                                                    canDownload:
                                                                        !admin
                                                                            ?.mediaPermissions
                                                                            ?.canDownload,
                                                                }
                                                            )
                                                        }
                                                        disabled={
                                                            !!actionLoading ||
                                                            !admin
                                                                ?.mediaPermissions
                                                                ?.canView
                                                        }
                                                        className={`w-25 inline-flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg border disabled:opacity-50 transition-colors ${
                                                            admin
                                                                ?.mediaPermissions
                                                                ?.canDownload
                                                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                                                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        <span>
                                                            <DownloadCloud className="w-4 h-4 inline-block mr-1" />
                                                        </span>
                                                        <span
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                                admin
                                                                    ?.mediaPermissions
                                                                    ?.canDownload
                                                                    ? "bg-indigo-500"
                                                                    : "bg-gray-300"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                    admin
                                                                        ?.mediaPermissions
                                                                        ?.canDownload
                                                                        ? "translate-x-4"
                                                                        : "translate-x-0.5"
                                                                }`}
                                                            />
                                                        </span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    Protected
                                                </span>
                                            )}
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

// ─── Tab: Manage Media ───────────────────────────────────────────────────────
function ManageMediaTab() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [actionLoading, setActionLoading] = useState("")
    const [editingId, setEditingId] = useState("")

    const [uploadForm, setUploadForm] = useState({
        title: "",
        description: "",
        order: 0,
        isPublished: true,
        file: null,
    })

    const [editForm, setEditForm] = useState({
        title: "",
        description: "",
        order: 0,
        isPublished: true,
        file: null,
    })

    const fetchMedia = useCallback(() => {
        setLoading(true)
        api.get("/project-media/superadmin")
            .then((r) => setItems(r.data?.data || []))
            .catch((err) => {
                showToast.error(
                    err.response?.data?.message || "Failed to load media"
                )
            })
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        fetchMedia()
    }, [fetchMedia])

    const handleUpload = async (e) => {
        e.preventDefault()

        if (!uploadForm.file) {
            showToast.error("Please select a media file")
            return
        }

        setSubmitting(true)
        try {
            const formData = new FormData()
            formData.append("media", uploadForm.file)
            formData.append("title", uploadForm.title)
            formData.append("description", uploadForm.description)
            formData.append("order", String(uploadForm.order || 0))
            formData.append("isPublished", String(uploadForm.isPublished))

            await api.post("/project-media/superadmin/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })

            showToast.success("Media uploaded")
            setUploadForm({
                title: "",
                description: "",
                order: 0,
                isPublished: true,
                file: null,
            })
            fetchMedia()
        } catch (err) {
            showToast.error(err.response?.data?.message || "Upload failed")
        } finally {
            setSubmitting(false)
        }
    }

    const startEdit = (item) => {
        setEditingId(item._id)
        setEditForm({
            title: item.title || "",
            description: item.description || "",
            order: item.order || 0,
            isPublished: item.isPublished !== false,
            file: null,
        })
    }

    const cancelEdit = () => {
        setEditingId("")
        setEditForm({
            title: "",
            description: "",
            order: 0,
            isPublished: true,
            file: null,
        })
    }

    const saveEdit = async (itemId) => {
        setActionLoading(`save-${itemId}`)
        try {
            const formData = new FormData()
            formData.append("title", editForm.title)
            formData.append("description", editForm.description)
            formData.append("order", String(editForm.order || 0))
            formData.append("isPublished", String(editForm.isPublished))

            if (editForm.file) {
                formData.append("media", editForm.file)
            }

            await api.patch(`/project-media/superadmin/${itemId}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })

            showToast.success("Media updated")
            cancelEdit()
            fetchMedia()
        } catch (err) {
            showToast.error(err.response?.data?.message || "Update failed")
        } finally {
            setActionLoading("")
        }
    }

    const togglePublish = async (item) => {
        const action = item.isPublished ? "unpublish" : "publish"
        setActionLoading(`${action}-${item._id}`)
        try {
            await api.patch(`/project-media/superadmin/${item._id}/${action}`)
            showToast.success(
                item.isPublished ? "Media unpublished" : "Media published"
            )
            fetchMedia()
        } catch (err) {
            showToast.error(
                err.response?.data?.message || "Failed to update visibility"
            )
        } finally {
            setActionLoading("")
        }
    }

    const handleDelete = async (item) => {
        if (!window.confirm(`Delete media \"${item.title}\"?`)) return

        setActionLoading(`delete-${item._id}`)
        try {
            await api.delete(`/project-media/superadmin/${item._id}`)
            showToast.success("Media deleted")
            fetchMedia()
        } catch (err) {
            showToast.error(err.response?.data?.message || "Delete failed")
        } finally {
            setActionLoading("")
        }
    }

    return (
        <div className="space-y-5">
            <form
                onSubmit={handleUpload}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm"
            >
                <div className="flex items-center gap-2 mb-4">
                    <Upload className="w-4 h-4 text-red-600" />
                    <h3 className="font-semibold text-gray-900">
                        Upload Feature Media
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                        type="text"
                        placeholder="Title"
                        required
                        value={uploadForm.title}
                        onChange={(e) =>
                            setUploadForm((p) => ({
                                ...p,
                                title: e.target.value,
                            }))
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                        type="number"
                        placeholder="Display order"
                        value={uploadForm.order}
                        onChange={(e) =>
                            setUploadForm((p) => ({
                                ...p,
                                order: Number(e.target.value) || 0,
                            }))
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <textarea
                        placeholder="Description"
                        value={uploadForm.description}
                        onChange={(e) =>
                            setUploadForm((p) => ({
                                ...p,
                                description: e.target.value,
                            }))
                        }
                        className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]"
                    />
                    <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        required
                        onChange={(e) =>
                            setUploadForm((p) => ({
                                ...p,
                                file: e.target.files?.[0] || null,
                            }))
                        }
                        className="md:col-span-2 text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-gray-300 file:bg-gray-50"
                    />
                    <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={uploadForm.isPublished}
                            onChange={(e) =>
                                setUploadForm((p) => ({
                                    ...p,
                                    isPublished: e.target.checked,
                                }))
                            }
                        />
                        Publish immediately
                    </label>
                </div>

                <div className="mt-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                    >
                        <Upload className="w-4 h-4" />
                        {submitting ? "Uploading..." : "Upload Media"}
                    </button>
                </div>
            </form>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">
                        Uploaded Media
                    </h3>
                    <button
                        onClick={fetchMedia}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {loading ? (
                    <div className="px-4 py-10 text-sm text-center text-gray-400">
                        Loading media...
                    </div>
                ) : items.length === 0 ? (
                    <div className="px-4 py-10 text-sm text-center text-gray-400">
                        No media uploaded yet
                    </div>
                ) : (
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {items.map((item) => {
                            const isEditing = editingId === item._id
                            return (
                                <div
                                    key={item._id}
                                    className="rounded-xl border border-gray-200 overflow-hidden"
                                >
                                    <div className="aspect-video bg-gray-50 border-b border-gray-100">
                                        {item.mediaType === "video" ? (
                                            <video
                                                src={item.mediaUrl}
                                                controls
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <img
                                                src={item.mediaUrl}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>

                                    <div className="p-3 space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                {item.mediaType === "video" ? (
                                                    <Video className="w-4 h-4 text-indigo-600" />
                                                ) : (
                                                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                                                )}
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    {item.mediaType}
                                                </span>
                                            </div>
                                            <span
                                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                    item.isPublished
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}
                                            >
                                                {item.isPublished
                                                    ? "Published"
                                                    : "Unpublished"}
                                            </span>
                                        </div>

                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editForm.title}
                                                    onChange={(e) =>
                                                        setEditForm((p) => ({
                                                            ...p,
                                                            title: e.target
                                                                .value,
                                                        }))
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                                <textarea
                                                    value={editForm.description}
                                                    onChange={(e) =>
                                                        setEditForm((p) => ({
                                                            ...p,
                                                            description:
                                                                e.target.value,
                                                        }))
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[70px]"
                                                />
                                                <input
                                                    type="number"
                                                    value={editForm.order}
                                                    onChange={(e) =>
                                                        setEditForm((p) => ({
                                                            ...p,
                                                            order:
                                                                Number(
                                                                    e.target
                                                                        .value
                                                                ) || 0,
                                                        }))
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                                <input
                                                    type="file"
                                                    accept="image/*,video/mp4,video/webm,video/quicktime"
                                                    onChange={(e) =>
                                                        setEditForm((p) => ({
                                                            ...p,
                                                            file:
                                                                e.target
                                                                    .files?.[0] ||
                                                                null,
                                                        }))
                                                    }
                                                    className="text-sm"
                                                />
                                                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            editForm.isPublished
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm(
                                                                (p) => ({
                                                                    ...p,
                                                                    isPublished:
                                                                        e.target
                                                                            .checked,
                                                                })
                                                            )
                                                        }
                                                    />
                                                    Published
                                                </label>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            saveEdit(item._id)
                                                        }
                                                        disabled={
                                                            !!actionLoading
                                                        }
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                                                    >
                                                        <Save className="w-3.5 h-3.5" />
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                        {item.description ||
                                                            "No description"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Order: {item.order}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <button
                                                        onClick={() =>
                                                            startEdit(item)
                                                        }
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            togglePublish(item)
                                                        }
                                                        disabled={
                                                            !!actionLoading
                                                        }
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border disabled:opacity-60 ${
                                                            item.isPublished
                                                                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                        }`}
                                                    >
                                                        {item.isPublished ? (
                                                            <EyeOff className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Eye className="w-3.5 h-3.5" />
                                                        )}
                                                        {item.isPublished
                                                            ? "Unpublish"
                                                            : "Publish"}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(item)
                                                        }
                                                        disabled={
                                                            !!actionLoading
                                                        }
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Root component ───────────────────────────────────────────────────────────
const TABS = [
    { id: "overview", label: "Overview" },
    { id: "admins", label: "Manage Admins" },
    { id: "users", label: "Manage Users" },
    { id: "media", label: "Manage Media" },
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
            {activeTab === "media" && <ManageMediaTab />}
        </div>
    )
}
