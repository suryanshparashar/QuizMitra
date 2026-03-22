import { Link } from "react-router-dom"
import { useAuthStore } from "../store/authStore.js"
import { getDashboardPath } from "../utils/getDashboardPath.js"
import {
    GraduationCap,
    Brain,
    BarChart3,
    Users,
    BookOpen,
    CheckCircle,
    Sparkles,
    ArrowRight,
    Shield,
    ClipboardCheck,
    Star,
    Zap,
    Lock,
} from "lucide-react"

// ─── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
    {
        icon: Brain,
        color: "bg-violet-100 text-violet-700",
        title: "AI-Generated Quizzes",
        desc: "Upload lecture notes or paste a topic — our AI agent builds a fully-structured quiz in seconds, complete with distractors and explanations.",
    },
    {
        icon: BarChart3,
        color: "bg-blue-100 text-blue-700",
        title: "Real-Time Analytics",
        desc: "Dashboards for faculty show class-wide performance trends, per-student breakdowns, and question-level difficulty signals.",
    },
    {
        icon: Users,
        color: "bg-emerald-100 text-emerald-700",
        title: "Class Management",
        desc: "Create and manage virtual classrooms, assign class representatives, and keep students enrolled with a simple invite code.",
    },
    {
        icon: ClipboardCheck,
        color: "bg-amber-100 text-amber-700",
        title: "Automated & Manual Grading",
        desc: "Objective questions are graded instantly. Subjective answers are scored with AI assistance and reviewed by the faculty.",
    },
    {
        icon: Sparkles,
        color: "bg-pink-100 text-pink-700",
        title: "Adaptive Difficulty",
        desc: "Quiz generation respects difficulty levels — Easy, Medium, Hard — so assessments align with learning objectives at every stage.",
    },
    {
        icon: Lock,
        color: "bg-gray-100 text-gray-700",
        title: "Secure & Role-Based",
        desc: "Separate portals for students, faculty, admins, and superadmins, each with the exact permissions they need — nothing more.",
    },
]

const FACULTY_STEPS = [
    {
        num: "01",
        title: "Create a Class",
        desc: "Set up a virtual classroom and share the invite code with your students.",
    },
    {
        num: "02",
        title: "Generate a Quiz",
        desc: "Paste your topic or notes — the AI constructs questions, options, and an answer key.",
    },
    {
        num: "03",
        title: "Review & Publish",
        desc: "Edit any question, set the time window, and publish. Results update live as students submit.",
    },
]

const STUDENT_STEPS = [
    {
        num: "01",
        title: "Join a Class",
        desc: "Enter the invite code shared by your faculty to enroll instantly.",
    },
    {
        num: "02",
        title: "Attempt Quizzes",
        desc: "Active quizzes appear on your dashboard. Submit before the deadline.",
    },
    {
        num: "03",
        title: "Track Progress",
        desc: "See your scores, compare performance, and identify weak areas with detailed results.",
    },
]

const STATS = [
    { value: "AI-Powered", label: "Quiz Generation" },
    { value: "Multi-Role", label: "Access Control" },
    { value: "Real-Time", label: "Performance Analytics" },
    { value: "Instant", label: "Auto Grading" },
]

// ─── Components ───────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, color, title, desc }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}
            >
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

function StepCard({ num, title, desc }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">
                {num}
            </div>
            <div>
                <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
    const { isAuthenticated, user } = useAuthStore()

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* ── Navbar ─────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent"
                    >
                        <img
                            src="/logo.png"
                            alt="QuizMitra"
                            className="w-8 h-8 rounded-lg"
                        />
                        QuizMitra
                    </Link>

                    <div className="flex items-center gap-2">
                        {isAuthenticated ? (
                            <Link
                                to={getDashboardPath(user?.role)}
                                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-accent-600 rounded-xl hover:from-primary-700 hover:to-purple-700 shadow-sm hover:shadow-md transition-all"
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-accent-600 rounded-xl hover:from-primary-700 hover:to-purple-700 shadow-sm hover:shadow-md transition-all"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            {/* ── Hero ───────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-violet-50 py-24 sm:py-32">
                {/* decorative blobs */}
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 border border-primary-100 rounded-full text-primary-700 text-sm font-medium mb-8">
                        <Zap className="w-3.5 h-3.5" />
                        AI-Powered Academic Assessment Platform
                    </div>

                    <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-tight">
                        Smarter Quizzes.{" "}
                        <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                            Better Learning.
                        </span>
                    </h1>

                    <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                        QuizMitra helps faculty create AI-generated assessments
                        in seconds, manage classes effortlessly, and track
                        student performance with actionable insights — all in
                        one place.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl hover:from-primary-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                        >
                            Get Started Free
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Stats strip ────────────────────────────────────────────── */}
            <section className="border-y border-gray-100 bg-gray-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
                    {STATS.map(({ value, label }) => (
                        <div key={label} className="text-center">
                            <p className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                                {value}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {label}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ───────────────────────────────────────────────── */}
            <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Everything you need for modern assessment
                    </h2>
                    <p className="text-gray-500 max-w-xl mx-auto">
                        Purpose-built for academic environments, with the
                        intelligence of AI and the simplicity of a modern web
                        app.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((f) => (
                        <FeatureCard key={f.title} {...f} />
                    ))}
                </div>
            </section>

            {/* ── How it works ───────────────────────────────────────────── */}
            <section className="py-24 bg-gradient-to-br from-gray-50 to-primary-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            How it works
                        </h2>
                        <p className="text-gray-500">
                            A simple three-step flow for both faculty and
                            students.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Faculty */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    For Faculty
                                </h3>
                            </div>
                            <div className="flex flex-col gap-7">
                                {FACULTY_STEPS.map((s) => (
                                    <StepCard key={s.num} {...s} />
                                ))}
                            </div>
                        </div>

                        {/* Students */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    For Students
                                </h3>
                            </div>
                            <div className="flex flex-col gap-7">
                                {STUDENT_STEPS.map((s) => (
                                    <StepCard key={s.num} {...s} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Why QuizMitra ──────────────────────────────────────────── */}
            <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Built for academia, not just testing
                    </h2>
                    <p className="text-gray-500 max-w-xl mx-auto">
                        Unlike generic quiz tools, QuizMitra understands the
                        academic context — syllabi, roles, grading, and
                        collective learning.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        "Institutional role hierarchy: student, faculty, admin, superadmin",
                        "AI evaluates even subjective / descriptive answers",
                        "Class representatives for peer-based classroom management",
                        "Faculty can review and override AI-generated grades",
                        "Secure OTP-based registration for institutional emails",
                        "Admin portal completely separate from the academic portal",
                        "Topic or notes → quiz in under 10 seconds",
                        "Built-in notification system for class and quiz events",
                    ].map((point) => (
                        <div
                            key={point}
                            className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white shadow-sm"
                        >
                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700">{point}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ────────────────────────────────────────────────────── */}
            <section className="py-24 bg-gradient-to-br from-primary-600 to-accent-600">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Star className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Ready to transform how you assess?
                    </h2>
                    <p className="text-primary-100 text-lg mb-10 max-w-xl mx-auto">
                        Join QuizMitra today. It takes less than two minutes to
                        create your account and generate your first AI quiz.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-primary-700 bg-white rounded-2xl hover:bg-primary-50 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                        >
                            Create Account
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white border border-white/40 rounded-2xl hover:bg-white/10 transition-all"
                        >
                            Sign In
                        </Link>
                    </div>

                    {/* <div className="mt-8">
                        <Link
                            to="/admin/login"
                            className="inline-flex items-center gap-1.5 text-sm text-primary-200 hover:text-white transition-colors"
                        >
                            <Shield className="w-4 h-4" />
                            Admin / Superadmin Portal
                        </Link>
                    </div> */}
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <footer className="bg-gray-900 text-gray-400 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-white font-semibold">
                        <img
                            src="/logo.png"
                            alt="QuizMitra"
                            className="w-6 h-6 rounded"
                        />
                        QuizMitra
                    </div>
                    <p className="text-sm text-center">
                        Built for academic excellence ·{" "}
                        {new Date().getFullYear()}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                        <Link
                            to="/login"
                            className="hover:text-white transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/register"
                            className="hover:text-white transition-colors"
                        >
                            Register
                        </Link>
                        {/* <Link to="/admin/login" className="hover:text-white transition-colors">Admin</Link> */}
                    </div>
                </div>
            </footer>
        </div>
    )
}
