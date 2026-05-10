import { useEffect, useMemo, useRef, useState } from "react"
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom"
import { useAuthStore } from "../store/authStore.js"
import { useNotification } from "../context/NotificationContext.jsx"
import { getDashboardPath } from "../utils/getDashboardPath.js"
import {
    BarChart3,
    Bell,
    BookOpen,
    Check,
    ChevronDown,
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
    Monitor,
    Moon,
    PlusCircle,
    Shield,
    Sun,
    User,
    Users,
    X,
} from "lucide-react"
import { motion } from "motion/react"

const THEME_STORAGE_KEY = "quizmitra-theme-mode"
const THEME_MODES = ["light", "dark", "system"]

const isValidThemeMode = (value) => THEME_MODES.includes(value)

export default function Layout() {
    const { user, logout } = useAuthStore()
    const { unreadCount } = useNotification()
    const navigate = useNavigate()
    const location = useLocation()

    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [resolvedTheme, setResolvedTheme] = useState("light")
    const [themeMode, setThemeMode] = useState(() => {
        if (typeof window === "undefined") {
            return "system"
        }

        const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
        return isValidThemeMode(stored) ? stored : "system"
    })

    const profileMenuRef = useRef(null)
    const themeMenuRef = useRef(null)
    const mobileMenuRef = useRef(null)
    const mobileMenuButtonRef = useRef(null)

    const dashboardPath = getDashboardPath(user?.role)
    const userRole = user?.role
    const isAdminRole = ["admin", "superadmin"].includes(userRole)
    const landingPageURL = "/"

    const userIdentifier =
        user?.facultyId || user?.studentId || user?.email || "User"
    const displayName = user?.fullName || "User"

    const initials = displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("")

    const primaryNavItems = useMemo(() => {
        const items = [
            {
                to: dashboardPath,
                label: isAdminRole
                    ? userRole === "superadmin"
                        ? "Superadmin Dashboard"
                        : "Admin Dashboard"
                    : "Dashboard",
                icon: isAdminRole ? Shield : LayoutDashboard,
                exact: true,
            },
        ]

        if (userRole === "student" || userRole === "faculty") {
            items.push({
                to: "/classes",
                label: "Classes",
                icon: Users,
            })
        }

        if (userRole === "faculty") {
            items.push(
                {
                    to: "/quizzes/materials",
                    label: "Uploaded Docs",
                    icon: FileText,
                },
                {
                    to: "/performance-insights",
                    label: "Insights",
                    icon: BarChart3,
                }
            )
        }

        if (userRole === "student") {
            items.push({
                to: "/performance-insights",
                label: "Insights",
                icon: BarChart3,
            })
        }

        if (userRole === "superadmin") {
            items.push({
                to: "/admin/dashboard",
                label: "Admin Dashboard",
                icon: Shield,
                exact: true,
            })
        }

        return items
    }, [dashboardPath, isAdminRole, userRole])

    const quickAction =
        userRole === "faculty"
            ? {
                  to: "/quizzes/create",
                  label: "Create Quiz",
                  icon: PlusCircle,
              }
            : null
    const QuickActionIcon = quickAction?.icon || null

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
        if (typeof window === "undefined") return

        const root = document.documentElement
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

        const applyTheme = () => {
            const nextResolvedTheme =
                themeMode === "system"
                    ? mediaQuery.matches
                        ? "dark"
                        : "light"
                    : themeMode

            setResolvedTheme(nextResolvedTheme)
            root.setAttribute("data-theme", nextResolvedTheme)
        }

        applyTheme()
        window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)

        const handleSystemThemeChange = () => {
            if (themeMode === "system") {
                applyTheme()
            }
        }

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", handleSystemThemeChange)
        } else {
            mediaQuery.addListener(handleSystemThemeChange)
        }

        return () => {
            if (typeof mediaQuery.removeEventListener === "function") {
                mediaQuery.removeEventListener(
                    "change",
                    handleSystemThemeChange
                )
            } else {
                mediaQuery.removeListener(handleSystemThemeChange)
            }
        }
    }, [themeMode])

    useEffect(() => {
        setIsMobileMenuOpen(false)
        setIsThemeMenuOpen(false)
        setIsProfileMenuOpen(false)
    }, [location.pathname, location.search])

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => {
            document.body.style.overflow = ""
        }
    }, [isMobileMenuOpen])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                profileMenuRef.current &&
                !profileMenuRef.current.contains(event.target)
            ) {
                setIsProfileMenuOpen(false)
            }

            if (
                themeMenuRef.current &&
                !themeMenuRef.current.contains(event.target)
            ) {
                setIsThemeMenuOpen(false)
            }

            if (
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target) &&
                mobileMenuButtonRef.current &&
                !mobileMenuButtonRef.current.contains(event.target)
            ) {
                setIsMobileMenuOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const handleThemeChange = (mode) => {
        setThemeMode(mode)
        setIsThemeMenuOpen(false)
    }

    const ThemeIcon =
        themeMode === "light"
            ? Sun
            : themeMode === "dark"
              ? Moon
              : Monitor

    const resolvedThemeLabel =
        resolvedTheme === "dark" ? "Dark" : "Light"

    const handleLogout = () => {
        setIsProfileMenuOpen(false)
        logout()
        navigate("/login")
    }

    return (
        <div className="qm-page qm-shell min-h-screen font-sans text-slate-900">
            <header className="qm-header sticky top-0 z-50 border-b backdrop-blur-xl">
                <nav className="max-w-7xl mx-auto h-[74px] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link
                            to={landingPageURL}
                            className="group flex min-w-0 items-center gap-3"
                        >
                            <div className="qm-brand-chip h-10 w-10 rounded-xl border flex items-center justify-center transition group-hover:shadow-md">
                                <img
                                    src="/logo.png"
                                    alt="QuizMitra Logo"
                                    className="h-8 w-8 rounded-lg"
                                />
                            </div>
                            <div className="min-w-0 leading-tight">
                                <p className="text-xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent truncate">
                                    QuizMitra
                                </p>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 truncate">
                                    Smart Assessment Platform
                                </p>
                            </div>
                        </Link>
                    </div>

                    {user && (
                        <div className="flex items-center gap-2">
                            <div className="hidden lg:flex items-center gap-1 rounded-2xl border px-1.5 py-1 qm-header-nav-surface">
                                {primaryNavItems.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <Link
                                            key={`${item.to}-${item.label}`}
                                            to={item.to}
                                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                                isRouteActive(
                                                    item.to,
                                                    item.exact
                                                )
                                                    ? "qm-nav-active"
                                                    : "qm-nav-item"
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    )
                                })}

                                {quickAction ? (
                                    <Link
                                        to={quickAction.to}
                                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                                            isRouteActive(quickAction.to, true)
                                                ? "qm-cta-active"
                                                : "qm-cta-button"
                                        }`}
                                    >
                                        {QuickActionIcon ? (
                                            <QuickActionIcon className="h-4 w-4" />
                                        ) : null}
                                        {quickAction.label}
                                    </Link>
                                ) : null}
                            </div>

                            <Link
                                to="/notifications"
                                className={`relative qm-header-icon-btn flex items-center justify-center ${
                                    isRouteActive("/notifications")
                                        ? "qm-nav-active"
                                        : ""
                                }`}
                                title="Notifications"
                            >
                                <Bell className="h-4 w-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full px-1 shadow-sm">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </Link>

                            <div className="relative" ref={profileMenuRef}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsProfileMenuOpen((prev) => !prev)
                                    }
                                    className="qm-header-avatar-btn"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-xs font-semibold">
                                        {user?.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt="User avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            initials || <User className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="hidden md:flex flex-col items-start leading-tight pr-1">
                                        <span className="text-xs font-semibold text-slate-800 max-w-[140px] truncate">
                                            {displayName}
                                        </span>
                                        <span className="text-[11px] text-slate-500 max-w-[140px] truncate">
                                            {userIdentifier}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-slate-500 transition-transform ${
                                            isProfileMenuOpen
                                                ? "rotate-180"
                                                : "rotate-0"
                                        }`}
                                    />
                                </button>

                                {isProfileMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border p-1.5 z-50 qm-profile-menu">
                                        <div className="px-3 py-2 mb-1 rounded-xl border qm-profile-menu-meta">
                                            <p className="text-xs font-semibold text-slate-800 truncate">
                                                {displayName}
                                            </p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {userIdentifier}
                                            </p>
                                        </div>
                                        <div className="px-3 py-2 mb-2 rounded-xl border border-slate-200/60 bg-white/70">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
                                                Theme
                                            </p>
                                            <div className="mt-2 grid grid-cols-3 gap-2">
                                                {THEME_MODES.map((mode) => {
                                                    const ModeIcon =
                                                        mode === "light"
                                                            ? Sun
                                                            : mode === "dark"
                                                              ? Moon
                                                              : Monitor
                                                    const isActiveTheme =
                                                        themeMode === mode

                                                    return (
                                                        <button
                                                            key={`profile-${mode}`}
                                                            type="button"
                                                            onClick={() =>
                                                                handleThemeChange(
                                                                    mode
                                                                )
                                                            }
                                                            className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                                                                isActiveTheme
                                                                    ? "qm-theme-option-active"
                                                                    : "qm-theme-option"
                                                            }`}
                                                        >
                                                            <ModeIcon className="h-3.5 w-3.5" />
                                                            {mode === "system"
                                                                ? "System"
                                                                : mode ===
                                                                    "dark"
                                                                  ? "Dark"
                                                                  : "Light"}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <Link
                                            to="/profile"
                                            className="qm-profile-link"
                                        >
                                            <User className="w-4 h-4" />
                                            Profile
                                        </Link>
                                        <Link
                                            to="/privacy"
                                            className="qm-profile-link"
                                        >
                                            <Shield className="w-4 h-4" />
                                            Privacy Policy
                                        </Link>
                                        <Link
                                            to="/terms"
                                            className="qm-profile-link"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            Terms of Service
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="qm-profile-link text-red-700 hover:bg-red-50"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                ref={mobileMenuButtonRef}
                                type="button"
                                onClick={() =>
                                    setIsMobileMenuOpen((prev) => !prev)
                                }
                                className="lg:hidden qm-header-icon-btn flex items-center justify-center"
                                title="Toggle menu"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="h-5 w-5" />
                                ) : (
                                    <Menu className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    )}
                </nav>

                {user && isMobileMenuOpen && (
                    <motion.div
                        ref={mobileMenuRef}
                        className="lg:hidden border-t qm-mobile-menu fixed inset-x-0 top-[74px]"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                    >
                        <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
                            {primaryNavItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={`mobile-${item.to}-${item.label}`}
                                        to={item.to}
                                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                            isRouteActive(item.to, item.exact)
                                                ? "qm-nav-active"
                                                : "qm-mobile-link"
                                        }`}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                        </span>
                                        <ChevronDown className="h-4 w-4 -rotate-90" />
                                    </Link>
                                )
                            })}

                            {quickAction ? (
                                <Link
                                    to={quickAction.to}
                                    className="flex items-center justify-between rounded-xl bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        {QuickActionIcon ? (
                                            <QuickActionIcon className="h-4 w-4" />
                                        ) : null}
                                        {quickAction.label}
                                    </span>
                                    <ChevronDown className="h-4 w-4 -rotate-90" />
                                </Link>
                            ) : null}

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </span>
                                <ChevronDown className="h-4 w-4 -rotate-90" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
                <Outlet />
            </main>
        </div>
    )
}
