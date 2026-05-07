import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
    ArrowRight,
    CalendarDays,
    ClipboardPlus,
    GraduationCap,
    Hash,
    MapPin,
    PlusCircle,
    Users,
} from "lucide-react"
import { api } from "../../services/api.js"

const CLASS_CARD_THEMES = [
    "from-slate-950 via-indigo-900 to-blue-800",
    "from-zinc-900 via-emerald-900 to-teal-700",
    "from-gray-900 via-purple-900 to-fuchsia-800",
    "from-slate-900 via-sky-800 to-cyan-700",
]

export default function FacultyClasses() {
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

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
                console.error("Failed to fetch faculty classes:", err)
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
            <div className="pointer-events-none absolute -top-8 -left-10 h-48 w-48 rounded-full bg-indigo-300/20 blur-3xl" />
            <div className="pointer-events-none absolute top-0 right-0 h-56 w-56 rounded-full bg-cyan-200/20 blur-3xl" />

            <section className="relative overflow-hidden rounded-[28px] border border-white/60 dark:border-slate-500/50 bg-gradient-to-br from-slate-950 via-indigo-900 to-sky-900 p-7 text-white shadow-[0_24px_60px_rgba(15,23,42,0.35)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_45%)]" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-blue-100/90 font-semibold">
                            Faculty Classlist
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                            Your Teaching Hub
                        </h1>
                        <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
                            Track each class, publish quizzes, and keep your
                            classroom organized around milestones.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-md flex items-center gap-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-blue-100/80">
                                Active Classes
                            </p>
                            <p className="text-2xl font-bold leading-tight">
                                {classes.length}
                            </p>
                        </div>
                        <Link
                            to="/classes/create"
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-indigo-50"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Create Class
                        </Link>
                    </div>
                </div>
            </section>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                </div>
            ) : null}

            {!error && classes.length === 0 ? (
                <section className="rounded-[24px] border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
                        <GraduationCap className="h-7 w-7 text-slate-500 dark:text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        No classes created yet
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Launch your first class to invite students and publish
                        quizzes.
                    </p>
                    <Link
                        to="/classes/create"
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 cursor-pointer"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Create First Class
                    </Link>
                </section>
            ) : null}

            {classes.length > 0 ? (
                <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {classes.map((classItem, index) => {
                        const studentCount = Array.isArray(classItem?.students)
                            ? classItem.students.filter(
                                  (student) => student.status === "active"
                              ).length
                            : classItem?.totalStudents || 0

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
                                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                            <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                            {studentCount} students
                                        </div>
                                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                            <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                            Semester {classItem.semester || "-"}
                                        </div>
                                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                            <ClipboardPlus className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                            Slot {classItem.classSlot || "-"}
                                        </div>
                                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                            <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                            {classItem.venue || "Venue not set"}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                                        <Link
                                            to={`/classes/${classItem._id}`}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                        >
                                            Open Classroom
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                        <Link
                                            to={`/quizzes/create?classId=${classItem._id}`}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200 dark:bg-emerald-800 dark:text-emerald-100 dark:hover:bg-emerald-700"
                                        >
                                            New Quiz
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </section>
            ) : null}
        </div>
    )
}
