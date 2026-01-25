import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
    FileText,
    Upload,
    Clock,
    Calendar,
    Settings,
    ArrowLeft,
    AlertCircle,
    CheckCircle,
    Loader2,
    BookOpen,
    Target,
    Hash,
} from "lucide-react"
import { api } from "../../services/api.js"

export default function CreateQuiz() {
    const [searchParams] = useSearchParams()
    const classId = searchParams.get("classId")
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        classId: classId || "",
        title: "",
        description: "",
        duration: 60,
        scheduledAt: "",
        deadline: "",
        requirements: {
            numQuestions: 10,
            difficultyLevel: "medium",
            questionTypes: ["multiple-choice"],
            topics: [""],
            marksPerQuestion: 1,
            totalMarks: 10,
        },
    })
    const [pdfFile, setPdfFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!pdfFile) {
            setError("Please upload a PDF file")
            return
        }

        setLoading(true)
        setError("")

        const formDataObj = new FormData()
        formDataObj.append("pdf", pdfFile)

        Object.keys(formData).forEach((key) => {
            if (key === "requirements") {
                formDataObj.append(key, JSON.stringify(formData[key]))
            } else {
                formDataObj.append(key, formData[key])
            }
        })

        try {
            const response = await api.post(
                "/quizzes/generate-from-pdf",
                formDataObj,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            )
            navigate(`/quizzes/${response.data.data._id}`)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create quiz")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4 transition-colors duration-200"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Create Quiz from PDF
                    </h1>
                    <p className="text-gray-600">
                        Upload a PDF document and generate an interactive quiz
                        automatically
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Information */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                            <FileText className="h-5 w-5 mr-2 text-blue-600" />
                            Basic Information
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quiz Title *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Quiz Title"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            title: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    placeholder="Quiz Description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value,
                                        })
                                    }
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 resize-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Duration (minutes) *
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="number"
                                        placeholder="Duration (minutes)"
                                        value={formData.duration}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                duration: parseInt(
                                                    e.target.value
                                                ),
                                            })
                                        }
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                            <Calendar className="h-5 w-5 mr-2 text-green-600" />
                            Schedule
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduledAt}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            scheduledAt: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Deadline *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.deadline}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            deadline: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quiz Requirements */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                            <Settings className="h-5 w-5 mr-2 text-purple-600" />
                            Quiz Requirements
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Number of Questions
                                </label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="number"
                                        placeholder="Number of Questions"
                                        value={
                                            formData.requirements.numQuestions
                                        }
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                requirements: {
                                                    ...formData.requirements,
                                                    numQuestions: parseInt(
                                                        e.target.value
                                                    ),
                                                    totalMarks:
                                                        parseInt(
                                                            e.target.value
                                                        ) *
                                                        formData.requirements
                                                            .marksPerQuestion,
                                                },
                                            })
                                        }
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                        min="1"
                                        max="50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Difficulty Level
                                </label>
                                <div className="relative">
                                    <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <select
                                        value={
                                            formData.requirements
                                                .difficultyLevel
                                        }
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                requirements: {
                                                    ...formData.requirements,
                                                    difficultyLevel:
                                                        e.target.value,
                                                },
                                            })
                                        }
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 appearance-none bg-white"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center">
                                <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                                <span className="text-sm font-medium text-blue-900">
                                    Total Marks:{" "}
                                    {formData.requirements.totalMarks}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* PDF Upload */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                            <Upload className="h-5 w-5 mr-2 text-orange-600" />
                            Upload PDF Document
                        </h2>

                        <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors duration-200">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setPdfFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                required
                            />

                            {pdfFile ? (
                                <div className="flex flex-col items-center">
                                    <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                                    <p className="text-lg font-medium text-green-900 mb-2">
                                        File Selected
                                    </p>
                                    <p className="text-sm text-green-700 mb-4">
                                        {pdfFile.name}
                                    </p>
                                    <p className="text-xs text-green-600">
                                        Click to change file
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                                    <p className="text-lg font-medium text-gray-900 mb-2">
                                        Drop your PDF here, or click to browse
                                    </p>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Support for PDF files up to 10MB
                                    </p>
                                    <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Choose File
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                                <p className="text-sm font-medium text-red-900">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Generating Quiz...
                                </>
                            ) : (
                                <>
                                    <FileText className="h-5 w-5 mr-2" />
                                    Create Quiz
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
