import { useEffect, useRef, useState } from "react"
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom"
import { useAuthStore } from "../store/authStore.js"
import { useNotification } from "../context/NotificationContext.jsx"
import { getDashboardPath } from "../utils/getDashboardPath.js"
import {
    Bell,
    LogOut,
    LayoutDashboard,
    User,
    ChevronDown,
    PlusCircle,
    FileText,
    Users,
    BookOpen,
    Shield,
    BarChart3,
} from "lucide-react"

export default function Layout() {
    const { user, logout } = useAuthStore()
    const { unreadCount } = useNotification()
    const navigate = useNavigate()
    const location = useLocation()
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
    const profileMenuRef = useRef(null)
    const dashboardPath = getDashboardPath(user?.role)

    const userIdentifier =
        user?.facultyId || user?.studentId || user?.email || "User"
    const displayName = user?.fullName || "User"
    const initials = displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("")

    const navItemClass =
        "hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-white/80 hover:shadow-sm transition"
    const facultyActionClass =
        "hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-white/80 hover:shadow-sm transition"
    const createQuizClass =
        "hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow-md transition"
    const activeNavClass =
        "text-primary-700 bg-primary-50/80 border border-primary-100 shadow-sm"
    const activeCtaClass = "bg-primary-700 ring-2 ring-primary-200"
    const activeUtilityClass =
        "text-primary-700 bg-primary-50 border-primary-200"

    const isRouteActive = (path, exact = false) => {
        if (exact) {
            return location.pathname === path
        }
        return (
            location.pathname === path ||
            location.pathname.startsWith(`${path}/`)
        )
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                profileMenuRef.current &&
                !profileMenuRef.current.contains(event.target)
            ) {
                setIsProfileMenuOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const handleLogout = () => {
        setIsProfileMenuOpen(false)
        logout()
        navigate("/login")
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* ── Top Navigation Bar ── */}
            <header className="sticky top-0 z-50 border-b border-white/60 bg-gradient-to-r from-slate-50/90 via-white/90 to-blue-50/90 backdrop-blur-xl shadow-[0_6px_24px_rgba(15,23,42,0.05)]">
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-200/60 to-transparent" />
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
                    {/* Brand */}
                    <Link
                        to={dashboardPath}
                        className="group flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-white/70 flex items-center justify-center group-hover:shadow-md transition">
                            <img
                                src="/quizmitra.png"
                                alt="QuizMitra Logo"
                                className="w-8 h-8 rounded-lg"
                            />
                        </div>
                        <div className="leading-tight">
                            <p className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                                QuizMitra
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 font-semibold">
                                Smart Assessment Platform
                            </p>
                        </div>
                    </Link>

                    {/* Nav Links */}
                    {user && (
                        <div className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-white/55 border border-white/80 px-2 py-1.5 shadow-sm backdrop-blur">
                            <div className="flex items-center gap-1.5">
                                <Link
                                    to={dashboardPath}
                                    className={`${navItemClass} ${isRouteActive(dashboardPath, true) ? activeNavClass : ""}`}
                                >
                                    {["admin", "superadmin"].includes(
                                        user?.role
                                    ) ? (
                                        <Shield className="w-4 h-4" />
                                    ) : (
                                        <LayoutDashboard className="w-4 h-4" />
                                    )}
                                    {user?.role === "superadmin"
                                        ? "Superadmin Dashboard"
                                        : user?.role === "admin"
                                          ? "Admin Dashboard"
                                          : "Dashboard"}
                                </Link>

                                {user?.role === "superadmin" && (
                                    <Link
                                        to="/admin/dashboard"
                                        className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition ${isRouteActive("/admin/dashboard", true) ? "ring-1 ring-red-200" : ""}`}
                                    >
                                        <Shield className="w-4 h-4" />
                                        Admin Dashboard
                                    </Link>
                                )}

                                {user.role === "faculty" && (
                                    <>
                                        <Link
                                            to="/classes"
                                            className={`${facultyActionClass} ${isRouteActive("/classes") ? activeNavClass : ""}`}
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            Classes
                                        </Link>
                                        <Link
                                            to="/quizzes/materials"
                                            className={`${facultyActionClass} ${isRouteActive("/quizzes/materials") ? activeNavClass : ""}`}
                                        >
                                            <FileText className="w-4 h-4" />
                                            Uploaded Docs
                                        </Link>
                                        <Link
                                            to="/performance-insights"
                                            className={`${facultyActionClass} ${isRouteActive("/performance-insights") ? activeNavClass : ""}`}
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                            Insights
                                        </Link>
                                    </>
                                )}

                                {user.role === "student" && (
                                    <>
                                        <Link
                                            to="/classes"
                                            className={`${navItemClass} ${isRouteActive("/classes") ? activeNavClass : ""}`}
                                        >
                                            <Users className="w-4 h-4" />
                                            Classes
                                        </Link>
                                        <Link
                                            to="/performance-insights"
                                            className={`${navItemClass} ${isRouteActive("/performance-insights") ? activeNavClass : ""}`}
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                            Insights
                                        </Link>
                                    </>
                                )}
                            </div>

                            {user.role === "faculty" && (
                                <>
                                    <div className="hidden md:block h-6 w-px bg-gray-200" />
                                    <Link
                                        to="/quizzes/create"
                                        className={`${createQuizClass} ${isRouteActive("/quizzes/create") ? activeCtaClass : ""}`}
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        Create Quiz
                                    </Link>
                                </>
                            )}

                            {/* ── Notification Bell ── */}
                            <Link
                                to="/notifications"
                                className={`relative p-2.5 rounded-xl text-gray-600 bg-white/70 border border-gray-100 hover:text-primary-700 hover:bg-white transition shadow-sm ${isRouteActive("/notifications") ? activeUtilityClass : ""}`}
                                title="Notifications"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full px-1 shadow-sm animate-pulse">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </Link>

                            {/* ── Profile Dropdown ── */}
                            <div className="relative" ref={profileMenuRef}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsProfileMenuOpen((prev) => !prev)
                                    }
                                    className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white/90 px-2 py-1.5 hover:border-primary-200 hover:bg-white transition shadow-sm"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-xs font-semibold">
                                        {user?.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt="User avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            initials || (
                                                <User className="w-4 h-4" />
                                            )
                                        )}
                                    </div>
                                    <div className="hidden sm:flex flex-col items-start leading-tight pr-1">
                                        <span className="text-xs font-semibold text-gray-800 max-w-[140px] truncate">
                                            {displayName}
                                        </span>
                                        <span className="text-[11px] text-gray-500 max-w-[140px] truncate">
                                            {userIdentifier}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-gray-500 transition-transform ${
                                            isProfileMenuOpen
                                                ? "rotate-180"
                                                : "rotate-0"
                                        }`}
                                    />
                                </button>

                                {isProfileMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white shadow-xl p-1.5 z-50">
                                        <div className="px-3 py-2 mb-1 rounded-xl bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100">
                                            <p className="text-xs font-semibold text-gray-800 truncate">
                                                {displayName}
                                            </p>
                                            <p className="text-[11px] text-gray-500 truncate">
                                                {userIdentifier}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsProfileMenuOpen(false)
                                                navigate("/profile")
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition"
                                        >
                                            <User className="w-4 h-4" />
                                            Profile
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-700 transition"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </nav>
            </header>

            {/* ── Main Content ── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Outlet />
            </main>
        </div>
    )
}
