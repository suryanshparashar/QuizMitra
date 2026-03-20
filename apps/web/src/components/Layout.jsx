import { useEffect, useRef, useState } from "react"
import { Outlet, Link, useNavigate } from "react-router-dom"
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
import JoinClassModal from "./JoinClassModal"

export default function Layout() {
    const { user, logout } = useAuthStore()
    const { unreadCount } = useNotification()
    const navigate = useNavigate()
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
    const profileMenuRef = useRef(null)

    const userIdentifier =
        user?.facultyId || user?.studentId || user?.email || "User"
    const displayName = user?.fullName || "User"
    const initials = displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("")

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
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Brand */}
                    <Link
                        to={getDashboardPath(user?.role)}
                        className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent"
                    >
                        <img
                            src="/quizmitra.png"
                            alt="QuizMitra Logo"
                            className="w-8 h-8 rounded-lg"
                        />
                        QuizMitra
                    </Link>

                    {/* Nav Links */}
                    {user && (
                        <div className="flex items-center gap-1 sm:gap-3">
                            <Link
                                to={getDashboardPath(user?.role)}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
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
                                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
                                >
                                    <Shield className="w-4 h-4" />
                                    Admin Dashboard
                                </Link>
                            )}

                            {user.role === "faculty" && (
                                <>
                                    <Link
                                        to="/classes"
                                        className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        Classes
                                    </Link>
                                    <Link
                                        to="/quizzes/create"
                                        className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-purple-700 shadow-sm hover:shadow-md transition"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        Create Quiz
                                    </Link>
                                    <Link
                                        to="/quizzes/materials"
                                        className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Uploaded Docs
                                    </Link>
                                    <Link
                                        to="/performance-insights"
                                        className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        Insights
                                    </Link>
                                </>
                            )}

                            {user.role === "student" && (
                                <>
                                    <button
                                        onClick={() => setIsJoinModalOpen(true)}
                                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
                                    >
                                        <Users className="w-4 h-4" />
                                        Join Class
                                    </button>
                                    <Link
                                        to="/performance-insights"
                                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        Insights
                                    </Link>
                                </>
                            )}

                            {/* ── Notification Bell ── */}
                            <Link
                                to="/notifications"
                                className="relative p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition"
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
                                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 hover:border-primary-200 hover:bg-primary-50 transition"
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
                                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white shadow-lg p-1.5 z-50">
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

            <JoinClassModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
            />
        </div>
    )
}
