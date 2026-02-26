import { useState } from "react"
import { Outlet, Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore.js"
import { useNotification } from "../context/NotificationContext.jsx"
import {
    Bell,
    LogOut,
    LayoutDashboard,
    UserCircle,
    PlusCircle,
    Users,
    BookOpen,
} from "lucide-react"
import JoinClassModal from "./JoinClassModal"

export default function Layout() {
    const { user, logout } = useAuthStore()
    const { unreadCount } = useNotification()
    const navigate = useNavigate()
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

    const handleLogout = () => {
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
                        to="/dashboard"
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
                                to="/dashboard"
                                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </Link>

                            <Link
                                to="/profile"
                                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
                            >
                                <UserCircle className="w-4 h-4" />
                                Profile
                            </Link>

                            {user.role === "faculty" && (
                                <>
                                    <Link
                                        to="/classes/create"
                                        className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        Create Class
                                    </Link>
                                    <Link
                                        to="/quizzes/create"
                                        className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-purple-700 shadow-sm hover:shadow-md transition"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        Create Quiz
                                    </Link>
                                </>
                            )}

                            {user.role === "student" && (
                                <button
                                    onClick={() => setIsJoinModalOpen(true)}
                                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition"
                                >
                                    <Users className="w-4 h-4" />
                                    Join Class
                                </button>
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

                            {/* ── Logout ── */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
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
