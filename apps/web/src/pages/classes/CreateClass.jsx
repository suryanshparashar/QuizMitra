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
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/dashboard"
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
                            >
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                <span>Back to Classes</span>
                            </Link>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-600">
                            <Plus className="w-5 h-5" />
                            <span className="font-medium">New Class</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Title */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Create New Class
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Set up a new class with all the essential details
                    </p>
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="text-red-800 font-medium">
                                        Error Creating Class
                                    </h3>
                                    <p className="text-red-700 text-sm mt-1">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {formFields.map((field) => {
                                    const Icon = field.icon
                                    return (
                                        <div
                                            key={field.key}
                                            className="space-y-2"
                                        >
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {field.label}
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Icon className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type={field.type}
                                                    placeholder={
                                                        field.placeholder
                                                    }
                                                    value={formData[field.key]}
                                                    onChange={(e) =>
                                                        handleInputChange(
                                                            field.key,
                                                            e.target.value
                                                        )
                                                    }
                                                    required
                                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Form Actions */}
                            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
                                <Link to="/dashboard">
                                    <button
                                        type="button"
                                        className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </Link>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Creating Class...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            <span>Create Class</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Help Text */}
                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        All fields are required. Make sure to provide accurate
                        information for your class setup.
                    </p>
                </div>
            </div>
        </div>
    )
}
