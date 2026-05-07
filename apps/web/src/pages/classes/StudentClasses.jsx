import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
    ArrowRight,
    CalendarDays,
    GraduationCap,
    Hash,
    MapPin,
    PlusCircle,
    UserRound,
} from "lucide-react"
import { api } from "../../services/api.js"
import JoinClassModal from "../../components/JoinClassModal"

const CLASS_CARD_THEMES = [
    "from-slate-900 via-blue-900 to-cyan-800",
    "from-emerald-900 via-teal-800 to-sky-700",
    "from-indigo-950 via-violet-900 to-fuchsia-800",
    "from-zinc-900 via-slate-800 to-blue-800",
]

export default function StudentClasses() {
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const response = await api.get("/classes/my-classes")
                setClasses(
                    Array.isArray(response?.data?.data)
                        ? response.data.data
                        : []
                )
            } catch (err) {
                console.error("Failed to fetch student classes:", err)
                setError(
                    err?.response?.data?.message ||
                        "Failed to load classes. Please try again."
                )
            } finally {
                setLoading(false)
            }
        }

        fetchClasses()
    }, [])

    if (loading) {
        return (
            <div className="min-h-[58vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-11 w-11 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
                    <p className="text-sm font-medium text-slate-600">
                        Loading your classes...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative space-y-8">
            <div className="pointer-events-none absolute -top-8 -left-10 h-48 w-48 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="pointer-events-none absolute top-0 right-0 h-56 w-56 rounded-full bg-cyan-200/20 blur-3xl" />

            <section className="relative overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-900 p-7 text-white shadow-[0_24px_60px_rgba(15,23,42,0.35)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_45%)]" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-blue-100/90 font-semibold">
                            Student Classlist
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                            Your Learning Studio
                        </h1>
                        <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
                            Access your classrooms, quizzes, and announcements
                            in one place. Open any class card to continue where
                            you left off.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-md flex items-center gap-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-blue-100/80">
                                Enrolled
                            </p>
                            <p className="text-2xl font-bold leading-tight">
                                {classes.length}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsJoinModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-50"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Join Class
                        </button>
                    </div>
                </div>
            </section>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                </div>
            ) : null}

            {!error && classes.length === 0 ? (
                <section className="rounded-[24px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <GraduationCap className="h-7 w-7 text-slate-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                        No classes yet
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Join your first class with a class code to unlock
                        quizzes and classroom updates.
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsJoinModalOpen(true)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Join Your First Class
                    </button>
                </section>
            ) : null}

            {classes.length > 0 ? (
                <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {classes.map((classItem, index) => {
                        const theme =
                            CLASS_CARD_THEMES[index % CLASS_CARD_THEMES.length]

                        return (
                            <article
                                key={classItem._id}
                                className="group overflow-hidden rounded-[24px] border border-slate-200/70 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div
                                    className={`relative overflow-hidden bg-gradient-to-br ${theme} p-6 text-white`}
                                >
                                    <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-xl" />
                                    <p className="text-xs uppercase tracking-[0.14em] text-blue-100/80">
                                        {classItem.subjectCode}
                                    </p>
                                    <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight">
                                        {classItem.subjectName}
                                    </h2>
                                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
                                        <Hash className="h-3.5 w-3.5" />
                                        {classItem.classCode}
                                    </div>
                                </div>

                                <div className="space-y-4 p-6">
                                    <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                            <CalendarDays className="h-4 w-4 text-slate-500" />
                                            Semester {classItem.semester || "-"}
                                        </div>
                                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                            <MapPin className="h-4 w-4 text-slate-500" />
                                            {classItem.venue || "Venue not set"}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm text-blue-900">
                                        <UserRound className="h-4 w-4" />
                                        Faculty:{" "}
                                        {classItem?.faculty?.fullName || "-"}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            Enter Classroom
                                        </span>
                                        <Link
                                            to={`/classes/${classItem._id}`}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                        >
                                            Open
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </section>
            ) : null}

            <JoinClassModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
            />
        </div>
    )
}
