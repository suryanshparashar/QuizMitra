import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
    FileText,
    Upload,
    Clock,
    Calendar,
    Settings,
    ArrowLeft,
    CheckCircle,
    Loader2,
    BookOpen,
    Target,
    Hash,
    Brain,
} from "lucide-react"
import { api } from "../../services/api.js"
import { toUtcIsoString } from "../../utils/datetime.js"
import { showToast } from "../../components/Toast.jsx"

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024
const DEFAULT_DURATION_MINUTES = 30
const MIN_DEADLINE_BUFFER_MINUTES = 10
const MAX_TOTAL_MARKS = 100

const formatFileSize = (sizeInBytes) => {
    if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
        return "0 MB"
    }

    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

const pad2 = (value) => String(value).padStart(2, "0")

const toDateTimeLocalInput = (date) => {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
        date.getDate()
    )}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

const getDefaultScheduleTimes = (
    durationMinutes = DEFAULT_DURATION_MINUTES
) => {
    const now = new Date()
    const scheduledAt = new Date(now.getTime() + 10 * 60 * 1000)
    const deadline = new Date(
        scheduledAt.getTime() +
            (durationMinutes + MIN_DEADLINE_BUFFER_MINUTES) * 60 * 1000
    )

    return {
        scheduledAt: toDateTimeLocalInput(scheduledAt),
        deadline: toDateTimeLocalInput(deadline),
    }
}

const getMinimumRequiredGapMinutes = (durationMinutes) => {
    const normalizedDuration = Number.isFinite(durationMinutes)
        ? durationMinutes
        : DEFAULT_DURATION_MINUTES
    return normalizedDuration + MIN_DEADLINE_BUFFER_MINUTES
}

const getMinimumDeadlineLocalValue = (scheduledAt, durationMinutes) => {
    const scheduledDate = new Date(scheduledAt)
    if (Number.isNaN(scheduledDate.getTime())) return ""

    const minimumDeadline = new Date(
        scheduledDate.getTime() +
            getMinimumRequiredGapMinutes(durationMinutes) * 60 * 1000
    )

    return toDateTimeLocalInput(minimumDeadline)
}

const calculateMarksPerQuestion = (totalMarks, numQuestions) => {
    const safeTotal = Number(totalMarks)
    const safeCount = Number(numQuestions)

    if (
        !Number.isFinite(safeTotal) ||
        !Number.isFinite(safeCount) ||
        safeCount <= 0
    ) {
        return 0
    }

    return Number((safeTotal / safeCount).toFixed(4))
}

export default function CreateQuiz() {
    const [searchParams] = useSearchParams()
    const classId = searchParams.get("classId")
    const navigate = useNavigate()
    const defaultScheduleTimes = getDefaultScheduleTimes()

    const [formData, setFormData] = useState({
        classId: classId || "",
        title: "",
        description: "",
        duration: DEFAULT_DURATION_MINUTES,
        scheduledAt: defaultScheduleTimes.scheduledAt,
        deadline: defaultScheduleTimes.deadline,
        requirements: {
            numQuestions: 10,
            difficultyLevel: "medium",
            questionTypes: ["multiple-choice"],
            topics: [""],
            marksPerQuestion: 1,
            totalMarks: 10,
        },
        topic: "",
    })
    const [inputMode, setInputMode] = useState("pdf") // "pdf" or "topic"
    const [pdfFile, setPdfFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [classes, setClasses] = useState([])
    const [loadingClasses, setLoadingClasses] = useState(true)

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const response = await api.get("/classes/my-classes")
                setClasses(response.data.data)

                // If there's no classId in URL but user has classes, default to the first one
                if (
                    !classId &&
                    response.data.data.length > 0 &&
                    !formData.classId
                ) {
                    setFormData((prev) => ({
                        ...prev,
                        classId: response.data.data[0]._id,
                    }))
                }
            } catch (err) {
                console.error("Failed to fetch classes:", err)
            } finally {
                setLoadingClasses(false)
            }
        }

        fetchClasses()
    }, [classId])

    const handlePdfChange = (e) => {
        const selectedFile = e.target.files?.[0]

        if (!selectedFile) {
            setPdfFile(null)
            return
        }

        if (selectedFile.type !== "application/pdf") {
            setPdfFile(null)
            showToast.error("Invalid file type. Only PDF files are allowed.")
            e.target.value = ""
            return
        }

        if (selectedFile.size > MAX_PDF_SIZE_BYTES) {
            setPdfFile(null)
            showToast.error("PDF file size cannot exceed 10MB")
            e.target.value = ""
            return
        }

        setPdfFile(selectedFile)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (inputMode === "pdf" && !pdfFile) {
            showToast.error("Please upload a PDF file")
            return
        }

        if (inputMode === "pdf" && pdfFile?.size > MAX_PDF_SIZE_BYTES) {
            showToast.error("PDF file size cannot exceed 10MB")
            return
        }

        if (inputMode === "topic" && !formData.topic.trim()) {
            showToast.error("Please enter a topic")
            return
        }

        const parsedDuration = parseInt(formData.duration, 10)
        const scheduledDate = new Date(formData.scheduledAt)
        const deadlineDate = new Date(formData.deadline)

        if (
            Number.isNaN(parsedDuration) ||
            Number.isNaN(scheduledDate.getTime()) ||
            Number.isNaN(deadlineDate.getTime())
        ) {
            showToast.error("Please provide valid duration and schedule")
            return
        }

        const minimumGapMinutes = getMinimumRequiredGapMinutes(parsedDuration)
        const actualGapMinutes =
            (deadlineDate.getTime() - scheduledDate.getTime()) / (60 * 1000)

        if (actualGapMinutes < minimumGapMinutes) {
            showToast.error(
                `Deadline must be at least ${minimumGapMinutes} minutes after start (duration + 10 min buffer)`
            )
            return
        }

        const questionCount = parseInt(formData.requirements.numQuestions, 10)
        const totalMarks = parseFloat(formData.requirements.totalMarks)

        if (
            Number.isNaN(questionCount) ||
            questionCount < 1 ||
            Number.isNaN(totalMarks) ||
            totalMarks <= 0
        ) {
            showToast.error(
                "Please provide valid question count and total marks"
            )
            return
        }

        if (totalMarks > MAX_TOTAL_MARKS) {
            showToast.error(`Total marks cannot exceed ${MAX_TOTAL_MARKS}`)
            return
        }

        const computedMarksPerQuestion = calculateMarksPerQuestion(
            totalMarks,
            questionCount
        )

        setLoading(true)

        const formDataObj = new FormData()

        if (inputMode === "pdf") {
            formDataObj.append("pdf", pdfFile)
        }

        Object.keys(formData).forEach((key) => {
            if (key === "requirements") {
                const normalizedRequirements = {
                    ...formData[key],
                    numQuestions: questionCount,
                    totalMarks,
                    marksPerQuestion: computedMarksPerQuestion,
                }
                formDataObj.append(key, JSON.stringify(normalizedRequirements))
            } else if (key === "scheduledAt" || key === "deadline") {
                formDataObj.append(key, toUtcIsoString(formData[key]) || "")
            } else {
                formDataObj.append(key, formData[key])
            }
        })

        try {
            const response = await api.post("/quizzes/generate", formDataObj, {
                headers: { "Content-Type": "multipart/form-data" },
            })
            navigate(`/quizzes/${response.data.data._id}`)
        } catch (err) {
            console.error("Quiz creation error:", err)
            showToast.error(
                err.response?.data?.message || "Failed to create quiz"
            )
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
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Target Class *
                                </label>
                                {loadingClasses ? (
                                    <div className="flex items-center text-sm text-gray-500 py-3">
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Loading classes...
                                    </div>
                                ) : classes.length === 0 ? (
                                    <div className="text-sm text-red-500 py-3">
                                        You must create a class first before
                                        creating a quiz.
                                    </div>
                                ) : (
                                    <select
                                        value={formData.classId}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                classId: e.target.value,
                                            })
                                        }
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 appearance-none bg-white"
                                        required
                                        disabled={loading}
                                    >
                                        <option value="" disabled>
                                            Select a class
                                        </option>
                                        {classes.map((cls) => (
                                            <option
                                                key={cls._id}
                                                value={cls._id}
                                            >
                                                {cls.subjectName} (
                                                {cls.subjectCode})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
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
                                    disabled={loading}
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
                                        disabled={loading}
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
                                    disabled={loading}
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
                                    min={getMinimumDeadlineLocalValue(
                                        formData.scheduledAt,
                                        parseInt(formData.duration, 10)
                                    )}
                                    required
                                    disabled={loading}
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
                                        onChange={(e) => {
                                            const nextQuestionCount = parseInt(
                                                e.target.value,
                                                10
                                            )
                                            const safeQuestionCount =
                                                Number.isNaN(nextQuestionCount)
                                                    ? 1
                                                    : nextQuestionCount

                                            setFormData({
                                                ...formData,
                                                requirements: {
                                                    ...formData.requirements,
                                                    numQuestions:
                                                        safeQuestionCount,
                                                    marksPerQuestion:
                                                        calculateMarksPerQuestion(
                                                            formData
                                                                .requirements
                                                                .totalMarks,
                                                            safeQuestionCount
                                                        ),
                                                },
                                            })
                                        }}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                        min="1"
                                        max="50"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Total Marks
                                </label>
                                <div className="relative">
                                    <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="number"
                                        placeholder="Total Marks"
                                        value={formData.requirements.totalMarks}
                                        onChange={(e) => {
                                            const nextTotalMarks = parseFloat(
                                                e.target.value
                                            )
                                            const safeTotalMarks = Number.isNaN(
                                                nextTotalMarks
                                            )
                                                ? 0
                                                : Math.min(
                                                      MAX_TOTAL_MARKS,
                                                      nextTotalMarks
                                                  )

                                            setFormData({
                                                ...formData,
                                                requirements: {
                                                    ...formData.requirements,
                                                    totalMarks: safeTotalMarks,
                                                    marksPerQuestion:
                                                        calculateMarksPerQuestion(
                                                            safeTotalMarks,
                                                            formData
                                                                .requirements
                                                                .numQuestions
                                                        ),
                                                },
                                            })
                                        }}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                        min="1"
                                        max={MAX_TOTAL_MARKS}
                                        step="0.5"
                                        disabled={loading}
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
                                        disabled={loading}
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
                                    Equal Distribution:{" "}
                                    {formData.requirements.totalMarks} marks /{" "}
                                    {formData.requirements.numQuestions}{" "}
                                    questions ={" "}
                                    {formData.requirements.marksPerQuestion}{" "}
                                    marks per question
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Input Method Selection */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
                                {inputMode === "pdf" ? (
                                    <Upload className="h-5 w-5 mr-2 text-orange-600" />
                                ) : (
                                    <Brain className="h-5 w-5 mr-2 text-purple-600" />
                                )}
                                {inputMode === "pdf"
                                    ? "Upload PDF Document"
                                    : "Enter Quiz Topic"}
                            </h2>

                            {/* Mode Toggle */}
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setInputMode("pdf")}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                        inputMode === "pdf"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-900"
                                    }`}
                                >
                                    Upload PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMode("topic")}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                        inputMode === "topic"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-900"
                                    }`}
                                >
                                    Topic / Keyword
                                </button>
                            </div>
                        </div>

                        {inputMode === "pdf" ? (
                            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors duration-200">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handlePdfChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    required={inputMode === "pdf"}
                                    disabled={loading}
                                />

                                {pdfFile ? (
                                    <div className="flex flex-col items-center">
                                        <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                                        <p className="text-lg font-medium text-green-900 mb-2">
                                            File Selected
                                        </p>
                                        <p className="text-sm text-green-700 mb-2">
                                            {pdfFile.name}
                                        </p>
                                        <p className="text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-full px-3 py-1 mb-4">
                                            {formatFileSize(pdfFile.size)} /{" "}
                                            {formatFileSize(MAX_PDF_SIZE_BYTES)}
                                        </p>
                                        <p className="text-xs text-green-600">
                                            Click to change file
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                                        <p className="text-lg font-medium text-gray-900 mb-2">
                                            Drop your PDF here, or click to
                                            browse
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
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Topic or Keyword *
                                </label>
                                <div className="relative">
                                    <Brain className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <textarea
                                        placeholder="Enter a topic needed for the quiz (e.g., 'Photosynthesis process', 'Newton's Laws of Motion')..."
                                        value={formData.topic}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                topic: e.target.value,
                                            })
                                        }
                                        rows={4}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        required={inputMode === "topic"}
                                        disabled={loading}
                                    />
                                </div>
                                <p className="mt-2 text-sm text-gray-500">
                                    The AI will generate questions based purely
                                    on this topic. Be specific for better
                                    results.
                                </p>
                            </div>
                        )}
                    </div>

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
