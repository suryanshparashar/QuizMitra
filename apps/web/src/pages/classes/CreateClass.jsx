import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
    BookOpen,
    Calendar,
    Clock,
    MapPin,
    Building,
    GraduationCap,
    ArrowLeft,
    Plus,
    AlertCircle,
    Loader2,
} from "lucide-react"
import { api } from "../../services/api.js"

export default function CreateClass() {
    const [formData, setFormData] = useState({
        subjectName: "",
        subjectCode: "",
        semester: "",
        classSlot: "",
        venue: "",
        department: "",
        academicYear: "",
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const response = await api.post("/classes/create", formData)
            navigate(`/classes/${response.data.data._id}`)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create class")
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (error) setError("") // Clear error when user starts typing
    }

    const formFields = [
        {
            key: "subjectName",
            label: "Subject Name",
            placeholder: "e.g., Introduction to Computer Science",
            icon: BookOpen,
            type: "text",
        },
        {
            key: "subjectCode",
            label: "Subject Code",
            placeholder: "e.g., CSE1001",
            icon: BookOpen,
            type: "text",
        },
        {
            key: "semester",
            label: "Semester",
            placeholder: "e.g., Winter 2025-26",
            icon: Calendar,
            type: "text",
        },
        {
            key: "classSlot",
            label: "Class Slot",
            placeholder: "e.g., A11 + A12 + A13",
            icon: Clock,
            type: "text",
        },
        {
            key: "venue",
            label: "Venue",
            placeholder: "e.g., AB02 019",
            icon: MapPin,
            type: "text",
        },
        {
            key: "department",
            label: "Department",
            placeholder: "e.g., Computer Science",
            icon: Building,
            type: "text",
        },
        {
            key: "academicYear",
            label: "Academic Year",
            placeholder: "e.g., 2025-2026",
            icon: GraduationCap,
            type: "text",
        },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm border-b border-blue-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/dashboard"
                                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors group"
                            >
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
                                <span className="font-medium">
                                    Back to Classes
                                </span>
                            </Link>
                        </div>
                        <div className="inline-flex items-center space-x-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">
                            <Plus className="w-4 h-4" />
                            <span className="text-xs font-semibold">NEW</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Page Title */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl hover:shadow-3xl transition-shadow duration-300">
                        <BookOpen className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                        Create New Class
                    </h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
                        Set up a new class with all the essential details. This
                        information will help organize and manage your class
                        effectively.
                    </p>
                </div>

                {/* Main Form Card */}
                <div className="bg-gradient-to-br from-white via-blue-50/30 to-white rounded-2xl shadow-2xl border border-blue-100/50 overflow-hidden backdrop-blur-sm">
                    <div className="p-8 sm:p-10">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-8 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 rounded-xl p-5 flex items-start space-x-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="text-red-800 font-semibold text-sm">
                                        Error Creating Class
                                    </h3>
                                    <p className="text-red-700 text-sm mt-1 leading-relaxed">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Form Section 1 */}
                            <div>
                                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-5 flex items-center space-x-2">
                                    <BookOpen className="w-4 h-4" />
                                    <span>Course Information</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {formFields.slice(0, 2).map((field) => {
                                        const Icon = field.icon
                                        return (
                                            <div
                                                key={field.key}
                                                className="group"
                                            >
                                                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                                                    {field.label}
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-600 transition-colors duration-200">
                                                        <Icon className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                                                    </div>
                                                    <input
                                                        type={field.type}
                                                        placeholder={
                                                            field.placeholder
                                                        }
                                                        value={
                                                            formData[field.key]
                                                        }
                                                        onChange={(e) =>
                                                            handleInputChange(
                                                                field.key,
                                                                e.target.value
                                                            )
                                                        }
                                                        required
                                                        className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white/50 hover:bg-white/80 focus:bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 shadow-sm hover:shadow-md focus:shadow-lg"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Form Section 2 */}
                            <div>
                                <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-5 flex items-center space-x-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>Schedule Details</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {formFields.slice(2, 4).map((field) => {
                                        const Icon = field.icon
                                        return (
                                            <div
                                                key={field.key}
                                                className="group"
                                            >
                                                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                                                    {field.label}
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-purple-600 transition-colors duration-200">
                                                        <Icon className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
                                                    </div>
                                                    <input
                                                        type={field.type}
                                                        placeholder={
                                                            field.placeholder
                                                        }
                                                        value={
                                                            formData[field.key]
                                                        }
                                                        onChange={(e) =>
                                                            handleInputChange(
                                                                field.key,
                                                                e.target.value
                                                            )
                                                        }
                                                        required
                                                        className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white/50 hover:bg-white/80 focus:bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:border-purple-500 shadow-sm hover:shadow-md focus:shadow-lg"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Form Section 3 */}
                            <div>
                                <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-5 flex items-center space-x-2">
                                    <Building className="w-4 h-4" />
                                    <span>Location & Organization</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {formFields.slice(4).map((field) => {
                                        const Icon = field.icon
                                        return (
                                            <div
                                                key={field.key}
                                                className="group"
                                            >
                                                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                                                    {field.label}
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-emerald-600 transition-colors duration-200">
                                                        <Icon className="w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                                                    </div>
                                                    <input
                                                        type={field.type}
                                                        placeholder={
                                                            field.placeholder
                                                        }
                                                        value={
                                                            formData[field.key]
                                                        }
                                                        onChange={(e) =>
                                                            handleInputChange(
                                                                field.key,
                                                                e.target.value
                                                            )
                                                        }
                                                        required
                                                        className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white/50 hover:bg-white/80 focus:bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:border-emerald-500 shadow-sm hover:shadow-md focus:shadow-lg"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex items-center justify-end space-x-4 pt-8 border-t border-blue-100">
                                <Link to="/dashboard">
                                    <button
                                        type="button"
                                        className="px-7 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200 hover:shadow-md"
                                    >
                                        Cancel
                                    </button>
                                </Link>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-10 py-3 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-2xl hover:scale-105 flex items-center space-x-2.5 active:scale-95"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Creating Class...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" />
                                            <span>Create Class</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Help Text */}
                <div className="mt-10 text-center">
                    <p className="text-gray-500 text-sm leading-relaxed max-w-2xl mx-auto">
                        <span className="font-medium text-gray-600">
                            Pro tip:
                        </span>{" "}
                        All fields are required. Make sure to provide accurate
                        information for your class setup. This will help
                        students find and join the correct classes.
                    </p>
                </div>
            </div>
        </div>
    )
}
