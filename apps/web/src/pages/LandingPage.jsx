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
    ClipboardCheck,
    Star,
    Target,
    School,
    BookMarked,
    LineChart,
    Layers,
    Lock,
} from "lucide-react"

// ─── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
    {
        icon: Brain,
        color: "bg-indigo-100 text-indigo-700",
        title: "Curriculum-Aware Quiz Generation",
        desc: "Generate assessments from uploaded course material or topic keywords with controlled question type distribution and difficulty.",
    },
    {
        icon: ClipboardCheck,
        color: "bg-emerald-100 text-emerald-700",
        title: "Blended Evaluation Pipeline",
        desc: "Objective questions are scored instantly, while subjective answers are evaluated with AI-assisted reasoning for faculty review.",
    },
    {
        icon: LineChart,
        color: "bg-blue-100 text-blue-700",
        title: "Outcome-Focused Analytics",
        desc: "Track class trends, learner progress, and quiz-level signals to identify weak areas early and improve instructional planning.",
    },
    {
        icon: School,
        color: "bg-cyan-100 text-cyan-700",
        title: "Academic Role Workflows",
        desc: "Dedicated experiences for faculty, students, administrators, and class representatives with institutional permission boundaries.",
    },
    {
        icon: BookMarked,
        color: "bg-violet-100 text-violet-700",
        title: "Material Reuse Library",
        desc: "Upload and maintain reusable academic materials for future quiz creation, improving consistency across sessions.",
    },
    {
        icon: Lock,
        color: "bg-slate-100 text-slate-700",
        title: "Integrity & Policy Controls",
        desc: "Server-managed timing, controlled result visibility, and anti-cheat policy enforcement support fair assessment delivery.",
    },
]

const FACULTY_STEPS = [
    {
        num: "01",
        title: "Set Up Course Context",
        desc: "Create class spaces, upload materials, and define quiz expectations aligned to your syllabus.",
    },
    {
        num: "02",
        title: "Generate and Refine Assessment",
        desc: "Produce AI-assisted questions, review quality, and tune marks, timing, and visibility controls before publishing.",
    },
    {
        num: "03",
        title: "Monitor Learning Outcomes",
        desc: "Track submissions, evaluate responses, and use analytics to plan the next teaching intervention.",
    },
]

const STUDENT_STEPS = [
    {
        num: "01",
        title: "Join a Class",
        desc: "Enroll quickly using the class code provided by faculty and access course assessments from one workspace.",
    },
    {
        num: "02",
        title: "Attempt with Clarity",
        desc: "Take scheduled quizzes with clear timing, status indicators, and a focused interface.",
    },
    {
        num: "03",
        desc: "Review grades, trends, and personalized guidance to improve continuously across attempts.",
    },
]

const STATS = [
    { value: "Role-Aware", label: "Academic Workflows" },
    { value: "Data-Driven", label: "Performance Insights" },
    { value: "Policy-First", label: "Assessment Integrity" },
    { value: "AI-Assisted", label: "Evaluation Pipeline" },
]

const ACADEMIC_PILLARS = [
    {
        icon: Target,
        title: "Outcome-Based Assessment",
        desc: "Structure quizzes around explicit learning outcomes with configurable marks and question types.",
    },
    {
        icon: Layers,
        title: "Continuous Evaluation",
        desc: "Move from one-off testing to iterative progress tracking with dashboard-ready evidence.",
    },
    {
        icon: Users,
        title: "Collaborative Classroom Ops",
        desc: "Enable faculty-led class governance with CR support and clear student participation workflows.",
    },
]

// ─── Components ───────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, color, title, desc }) {
    return (
        <div className="group bg-white/5 backdrop-blur rounded-2xl border border-white/15 shadow-sm p-6 flex flex-col gap-4 hover:bg-white/10 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}
            >
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h3 className="font-semibold text-slate-100 mb-1">{title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

function StepCard({ num, title, desc }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                {num}
            </div>
            <div>
                <h4 className="font-semibold text-slate-100 mb-1">{title}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
    const { isAuthenticated, user } = useAuthStore()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 font-sans text-slate-100">
            {/* ── Navbar ─────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur border-b border-white/10 shadow-sm">
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
                                    className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-cyan-200 transition-colors"
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
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 py-24 sm:py-28">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.28),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.22),transparent_32%),radial-gradient(circle_at_65%_90%,rgba(129,140,248,0.2),transparent_35%)]" />
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.25)_1px,transparent_1px)] [background-size:38px_38px]" />

                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-blue-100 text-sm font-medium mb-8 backdrop-blur">
                        <GraduationCap className="w-3.5 h-3.5" />
                        Academic Assessment Intelligence Platform
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
                        Designed for classrooms.
                        <span className="block bg-gradient-to-r from-cyan-200 via-blue-200 to-indigo-200 bg-clip-text text-transparent">
                            Built for measurable learning.
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-blue-100/90 max-w-3xl mx-auto mb-10 leading-relaxed">
                        QuizMitra helps institutions manage the full assessment
                        lifecycle, from quiz creation to evaluation and
                        performance analytics, through role-aware workflows and
                        AI-assisted academic operations.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-slate-900 bg-white rounded-2xl hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                        >
                            Start Your Academic Workspace
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-white/10 border border-white/30 rounded-2xl hover:bg-white/20 transition-all"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Stats strip ────────────────────────────────────────────── */}
            <section className="border-y border-white/10 bg-slate-900/40 backdrop-blur">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
                    {STATS.map(({ value, label }) => (
                        <div key={label} className="text-center">
                            <p className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                                {value}
                            </p>
                            <p className="text-sm text-slate-300 mt-1">
                                {label}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ───────────────────────────────────────────────── */}
            <section className="relative py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
                        Core capabilities for modern academic assessment
                    </h2>
                    <p className="text-slate-300 max-w-2xl mx-auto">
                        Built from PRD-backed requirements and a classroom-first
                        design approach, QuizMitra supports assessment quality,
                        faculty productivity, and student growth.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((f) => (
                        <FeatureCard key={f.title} {...f} />
                    ))}
                </div>
            </section>

            {/* ── Academic Pillars ──────────────────────────────────────── */}
            <section className="py-20 bg-slate-900/40 border-y border-white/10 backdrop-blur">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-100 mb-3">
                            Built Around Academic Priorities
                        </h2>
                        <p className="text-slate-300 max-w-2xl mx-auto">
                            Every workflow is aligned to instructional planning,
                            fair evaluation, and continuous improvement in
                            learner outcomes.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {ACADEMIC_PILLARS.map(({ icon: Icon, title, desc }) => (
                            <div
                                key={title}
                                className="rounded-2xl border border-white/15 bg-gradient-to-b from-white/8 to-white/5 p-6"
                            >
                                <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                                    {title}
                                </h3>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ───────────────────────────────────────────── */}
            <section className="py-24 bg-gradient-to-br from-slate-900/40 to-indigo-900/35">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
                            Workflow by Role
                        </h2>
                        <p className="text-slate-300">
                            Structured journeys for faculty and students to
                            maintain operational clarity.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Faculty */}
                        <div className="bg-white/6 backdrop-blur rounded-3xl border border-white/15 shadow-sm p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-100">
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
                        <div className="bg-white/6 backdrop-blur rounded-3xl border border-white/15 shadow-sm p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-100">
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
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
                        Why institutions choose QuizMitra
                    </h2>
                    <p className="text-slate-300 max-w-2xl mx-auto">
                        The platform is engineered for institutional assessment
                        operations, not generic survey-style testing.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        "Role hierarchy with focused interfaces for faculty, students, admins, and superadmins",
                        "Support for objective and subjective question evaluation workflows",
                        "Class-level governance with representative and permission controls",
                        "Configurable post-submission visibility and feedback policies",
                        "OTP-enabled registration and secure auth lifecycle",
                        "Dashboard analytics for course-level and learner-level insights",
                        "PDF and topic-driven generation modes for flexible academic use",
                        "Integrated notifications for class and quiz lifecycle events",
                    ].map((point) => (
                        <div
                            key={point}
                            className="flex items-start gap-3 p-4 rounded-xl border border-white/15 bg-white/6 backdrop-blur shadow-sm"
                        >
                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-200">{point}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ────────────────────────────────────────────────────── */}
            <section className="py-24 bg-gradient-to-br from-primary-700 via-indigo-700 to-accent-700">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Star className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Ready to modernize your assessment workflow?
                    </h2>
                    <p className="text-primary-100 text-lg mb-10 max-w-xl mx-auto">
                        Start with role-based dashboards, AI-assisted quiz
                        operations, and student-centric learning feedback in one
                        platform.
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
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <footer className="bg-slate-950/80 border-t border-white/10 text-slate-400 py-10">
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
                    </div>
                </div>
            </footer>
        </div>
    )
}
