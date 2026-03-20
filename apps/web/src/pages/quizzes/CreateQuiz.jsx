import { useState, useEffect, useRef } from "react"
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
const QUESTION_TYPE_OPTIONS = [
    { value: "multiple-choice", label: "MCQ" },
    { value: "true-false", label: "True / False" },
    { value: "short-answer", label: "Short Answer" },
    { value: "long-answer", label: "Long Answer" },
]

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
    const inputModeParam = searchParams.get("inputMode")
    const materialIdParam = searchParams.get("materialId")
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
    const [inputMode, setInputMode] = useState(
        inputModeParam === "material" ? "material" : "pdf"
    )
    const [pdfFile, setPdfFile] = useState(null)
    const [processedPdfId, setProcessedPdfId] = useState("")
    const [isProcessingPdf, setIsProcessingPdf] = useState(false)
    const [pdfProcessingProgress, setPdfProcessingProgress] = useState(0)
    const [pdfInlineMessage, setPdfInlineMessage] = useState("")
    const [materials, setMaterials] = useState([])
    const [materialsLoading, setMaterialsLoading] = useState(false)
    const [materialUploadInProgress, setMaterialUploadInProgress] =
        useState(false)
    const [materialUploadProgress, setMaterialUploadProgress] = useState(0)
    const [selectedMaterialId, setSelectedMaterialId] = useState(
        materialIdParam || ""
    )
    const [loading, setLoading] = useState(false)
    const [classes, setClasses] = useState([])
    const [loadingClasses, setLoadingClasses] = useState(true)
    const processingPollRef = useRef(null)
    const pdfInputRef = useRef(null)
    const pdfProcessingFinalizedRef = useRef(false)
    const materialInputRef = useRef(null)
    const materialProcessingPollRef = useRef(null)

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

    useEffect(() => {
        if (inputModeParam === "material") {
            setInputMode("material")
        }

        if (materialIdParam) {
            setSelectedMaterialId(materialIdParam)
        }
    }, [inputModeParam, materialIdParam])

    useEffect(() => {
        return () => {
            if (processingPollRef.current) {
                clearInterval(processingPollRef.current)
                processingPollRef.current = null
            }

            if (materialProcessingPollRef.current) {
                clearInterval(materialProcessingPollRef.current)
                materialProcessingPollRef.current = null
            }
        }
    }, [])

    const fetchMaterials = async () => {
        setMaterialsLoading(true)
        try {
            const response = await api.get("/quizzes/materials", {
                params: formData.classId ? { classId: formData.classId } : {},
            })
            setMaterials(response?.data?.data || [])
        } catch (error) {
            showToast.error("Failed to fetch uploaded materials")
        } finally {
            setMaterialsLoading(false)
        }
    }

    useEffect(() => {
        fetchMaterials()
    }, [formData.classId])

    const stopMaterialProcessingPoll = () => {
        if (materialProcessingPollRef.current) {
            clearInterval(materialProcessingPollRef.current)
            materialProcessingPollRef.current = null
        }
    }

    const startMaterialProcessingPoll = (materialId) => {
        stopMaterialProcessingPoll()

        materialProcessingPollRef.current = setInterval(async () => {
            try {
                const statusResponse = await api.get(
                    `/quizzes/materials/${materialId}/status`
                )
                const statusData = statusResponse?.data?.data || {}
                const nextProgress = Number(statusData.progress || 0)

                setMaterialUploadProgress((prev) =>
                    Math.max(prev, Math.min(100, nextProgress))
                )

                if (statusData.status === "completed") {
                    stopMaterialProcessingPoll()
                    setMaterialUploadInProgress(false)
                    setMaterialUploadProgress(100)
                    setSelectedMaterialId(materialId)
                    showToast.success("Material uploaded and ready to use")
                    fetchMaterials()
                }

                if (statusData.status === "failed") {
                    stopMaterialProcessingPoll()
                    setMaterialUploadInProgress(false)
                    setMaterialUploadProgress(0)
                    showToast.error(
                        statusData.errorMessage ||
                            "Material processing failed. Please try another file."
                    )
                    fetchMaterials()
                }
            } catch (error) {
                stopMaterialProcessingPoll()
                setMaterialUploadInProgress(false)
                setMaterialUploadProgress(0)
                showToast.error("Failed to fetch material processing status")
                fetchMaterials()
            }
        }, 1500)
    }

    const handleMaterialUpload = async (e) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        if (selectedFile.type !== "application/pdf") {
            showToast.error("Only PDF files can be uploaded as materials")
            e.target.value = ""
            return
        }

        if (selectedFile.size > MAX_PDF_SIZE_BYTES) {
            showToast.error("PDF file size cannot exceed 10MB")
            e.target.value = ""
            return
        }

        setMaterialUploadInProgress(true)
        setMaterialUploadProgress(0)
        stopMaterialProcessingPoll()

        const uploadData = new FormData()
        uploadData.append("pdf", selectedFile)
        uploadData.append("materialName", selectedFile.name)
        if (formData.classId) {
            uploadData.append("classId", formData.classId)
        }

        try {
            const response = await api.post(
                "/quizzes/materials/upload",
                uploadData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                    onUploadProgress: (progressEvent) => {
                        const total =
                            progressEvent.total || selectedFile.size || 1
                        const uploaded = progressEvent.loaded || 0
                        const percent = Math.min(
                            45,
                            Math.round((uploaded / total) * 45)
                        )
                        setMaterialUploadProgress((prev) =>
                            Math.max(prev, percent)
                        )
                    },
                }
            )

            const materialId = response?.data?.data?.materialId
            if (!materialId) {
                throw new Error("Missing material id")
            }

            setMaterialUploadProgress((prev) => Math.max(prev, 50))
            startMaterialProcessingPoll(materialId)
        } catch (error) {
            stopMaterialProcessingPoll()
            setMaterialUploadInProgress(false)
            setMaterialUploadProgress(0)
            showToast.error(
                error.response?.data?.message ||
                    "Failed to upload material. Please try again."
            )
            fetchMaterials()
        }
    }

    const stopProcessingPoll = () => {
        if (processingPollRef.current) {
            clearInterval(processingPollRef.current)
            processingPollRef.current = null
        }
    }

    const clearPdfSelection = () => {
        pdfProcessingFinalizedRef.current = false
        setPdfFile(null)
        setProcessedPdfId("")
        setIsProcessingPdf(false)
        setPdfProcessingProgress(0)
        if (pdfInputRef.current) {
            pdfInputRef.current.value = ""
        }
    }

    const startPdfProcessingPoll = (nextProcessedPdfId) => {
        stopProcessingPoll()
        pdfProcessingFinalizedRef.current = false

        processingPollRef.current = setInterval(async () => {
            try {
                const statusResponse = await api.get(
                    `/quizzes/processed-pdf/${nextProcessedPdfId}/status`
                )
                const statusData = statusResponse?.data?.data || {}
                const nextProgress = Number(statusData.progress || 0)

                setPdfProcessingProgress((prev) =>
                    Math.max(prev, Math.min(100, nextProgress))
                )

                if (statusData.status === "completed") {
                    if (pdfProcessingFinalizedRef.current) {
                        return
                    }
                    pdfProcessingFinalizedRef.current = true
                    stopProcessingPoll()
                    setIsProcessingPdf(false)
                    setPdfProcessingProgress(100)
                    showToast.success("PDF processed successfully")
                }

                if (statusData.status === "failed") {
                    if (pdfProcessingFinalizedRef.current) {
                        return
                    }
                    pdfProcessingFinalizedRef.current = true
                    stopProcessingPoll()
                    const failureMessage =
                        statusData.errorMessage ||
                        "Failed to process PDF. Please try another file."
                    if (
                        failureMessage
                            .toLowerCase()
                            .includes("handwritten notes are not supported")
                    ) {
                        setPdfInlineMessage(
                            "Handwritten notes are currently not supported. Please upload a typed or digital PDF."
                        )
                    }
                    clearPdfSelection()
                    showToast.error(failureMessage)
                }
            } catch (error) {
                if (pdfProcessingFinalizedRef.current) {
                    return
                }
                pdfProcessingFinalizedRef.current = true
                stopProcessingPoll()
                clearPdfSelection()
                showToast.error("Failed to fetch PDF processing status")
            }
        }, 1500)
    }

    const startPdfProcessing = async (selectedFile) => {
        stopProcessingPoll()
        pdfProcessingFinalizedRef.current = false
        setProcessedPdfId("")
        setPdfProcessingProgress(0)
        setIsProcessingPdf(true)

        const uploadData = new FormData()
        uploadData.append("pdf", selectedFile)

        try {
            const response = await api.post(
                "/quizzes/process-pdf",
                uploadData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                    onUploadProgress: (progressEvent) => {
                        const total =
                            progressEvent.total || selectedFile.size || 1
                        const uploaded = progressEvent.loaded || 0
                        const percent = Math.min(
                            45,
                            Math.round((uploaded / total) * 45)
                        )
                        setPdfProcessingProgress((prev) =>
                            Math.max(prev, percent)
                        )
                    },
                }
            )

            const nextProcessedPdfId = response?.data?.data?.processedPdfId
            if (!nextProcessedPdfId) {
                throw new Error("Missing processed PDF id")
            }

            setProcessedPdfId(nextProcessedPdfId)
            setPdfProcessingProgress((prev) => Math.max(prev, 50))
            startPdfProcessingPoll(nextProcessedPdfId)
        } catch (err) {
            pdfProcessingFinalizedRef.current = true
            const failureMessage =
                err.response?.data?.message || "Failed to process PDF"
            if (
                failureMessage
                    .toLowerCase()
                    .includes("handwritten notes are not supported")
            ) {
                setPdfInlineMessage(
                    "Handwritten notes are currently not supported. Please upload a typed or digital PDF."
                )
            }
            stopProcessingPoll()
            clearPdfSelection()
            showToast.error(failureMessage)
        }
    }

    const handlePdfChange = (e) => {
        const selectedFile = e.target.files?.[0]

        setPdfInlineMessage("")

        if (!selectedFile) {
            setPdfFile(null)
            setProcessedPdfId("")
            setIsProcessingPdf(false)
            setPdfProcessingProgress(0)
            stopProcessingPoll()
            return
        }

        if (selectedFile.type !== "application/pdf") {
            setPdfFile(null)
            setProcessedPdfId("")
            setIsProcessingPdf(false)
            setPdfProcessingProgress(0)
            stopProcessingPoll()
            showToast.error("Invalid file type. Only PDF files are allowed.")
            e.target.value = ""
            return
        }

        if (selectedFile.size > MAX_PDF_SIZE_BYTES) {
            setPdfFile(null)
            setProcessedPdfId("")
            setIsProcessingPdf(false)
            setPdfProcessingProgress(0)
            stopProcessingPoll()
            showToast.error("PDF file size cannot exceed 10MB")
            e.target.value = ""
            return
        }

        setPdfFile(selectedFile)
        startPdfProcessing(selectedFile)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (inputMode === "pdf" && !pdfFile) {
            showToast.error("Please upload a PDF file")
            return
        }

        if (inputMode === "pdf" && isProcessingPdf) {
            showToast.error("PDF is still being processed. Please wait.")
            return
        }

        if (inputMode === "pdf" && !processedPdfId) {
            showToast.error("Please upload and process the PDF first")
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

        if (inputMode === "material" && !selectedMaterialId) {
            showToast.error("Please select an uploaded material")
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

        if (
            !Array.isArray(formData.requirements.questionTypes) ||
            formData.requirements.questionTypes.length === 0
        ) {
            showToast.error("Please select at least one question type")
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
            formDataObj.append("processedPdfId", processedPdfId)
        }

        if (inputMode === "material") {
            formDataObj.append("materialId", selectedMaterialId)
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

    const toggleQuestionType = (typeValue) => {
        const selectedTypes = Array.isArray(formData.requirements.questionTypes)
            ? formData.requirements.questionTypes
            : []

        const isAlreadySelected = selectedTypes.includes(typeValue)
        const nextTypes = isAlreadySelected
            ? selectedTypes.filter((entry) => entry !== typeValue)
            : [...selectedTypes, typeValue]

        setFormData({
            ...formData,
            requirements: {
                ...formData.requirements,
                questionTypes: nextTypes,
            },
        })
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

                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Question Types
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {QUESTION_TYPE_OPTIONS.map((option) => {
                                    const selected =
                                        formData.requirements.questionTypes.includes(
                                            option.value
                                        )

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() =>
                                                toggleQuestionType(option.value)
                                            }
                                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 ${
                                                selected
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                                            }`}
                                            disabled={loading}
                                        >
                                            {option.label}
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                Select one or more types. The generator will
                                distribute questions across selected types.
                            </p>
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
                                {inputMode === "pdf" && (
                                    <Upload className="h-5 w-5 mr-2 text-orange-600" />
                                )}
                                {inputMode === "topic" && (
                                    <Brain className="h-5 w-5 mr-2 text-purple-600" />
                                )}
                                {inputMode === "material" && (
                                    <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                                )}
                                {inputMode === "pdf" && "Upload PDF Document"}
                                {inputMode === "topic" && "Enter Quiz Topic"}
                                {inputMode === "material" &&
                                    "Uploaded Materials"}
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
                                <button
                                    type="button"
                                    onClick={() => setInputMode("material")}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                        inputMode === "material"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-900"
                                    }`}
                                >
                                    Uploaded Materials
                                </button>
                            </div>
                        </div>

                        {inputMode === "pdf" ? (
                            <div>
                                <div className="group relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-md transition-all duration-200">
                                    <input
                                        ref={pdfInputRef}
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
                                                {formatFileSize(
                                                    MAX_PDF_SIZE_BYTES
                                                )}
                                            </p>
                                            <div className="w-full max-w-xs mb-3">
                                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                    <span>
                                                        {isProcessingPdf
                                                            ? "Processing OCR..."
                                                            : "OCR Ready"}
                                                    </span>
                                                    <span>
                                                        {Math.min(
                                                            100,
                                                            Math.max(
                                                                0,
                                                                Math.round(
                                                                    pdfProcessingProgress
                                                                )
                                                            )
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 transition-all duration-300"
                                                        style={{
                                                            width: `${Math.min(100, Math.max(0, pdfProcessingProgress))}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-green-600">
                                                Click to change file
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <BookOpen className="h-12 w-12 text-gray-400 group-hover:text-blue-500 mb-4 transition-colors duration-200" />
                                            <p className="text-lg font-medium text-gray-900 group-hover:text-blue-900 mb-2 transition-colors duration-200">
                                                Drop your PDF here, or click to
                                                browse
                                            </p>
                                            <p className="text-sm text-gray-500 group-hover:text-blue-700 mb-4 transition-colors duration-200">
                                                Support for PDF files up to 10MB
                                            </p>
                                            <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                                                <Upload className="h-4 w-4 mr-2" />
                                                Choose File
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    {pdfInlineMessage ||
                                        "Handwritten notes are currently not supported. Please upload a typed or digital PDF."}
                                </div>
                            </div>
                        ) : inputMode === "material" ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-blue-900">
                                                Upload to Material Library
                                            </p>
                                            <p className="text-xs text-blue-700">
                                                Upload once and reuse this
                                                material across multiple
                                                quizzes.
                                            </p>
                                        </div>
                                        <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors duration-200">
                                            <Upload className="h-4 w-4 mr-2" />
                                            Add PDF Material
                                            <input
                                                ref={materialInputRef}
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleMaterialUpload}
                                                className="hidden"
                                                disabled={
                                                    loading ||
                                                    materialUploadInProgress
                                                }
                                            />
                                        </label>
                                    </div>
                                    {materialUploadInProgress && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-blue-800 mb-1">
                                                <span>
                                                    Processing material...
                                                </span>
                                                <span>
                                                    {Math.round(
                                                        materialUploadProgress
                                                    )}
                                                    %
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-600 transition-all duration-300"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, materialUploadProgress))}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-white p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-semibold text-gray-900">
                                            Your Uploaded Materials
                                        </p>
                                        <button
                                            type="button"
                                            onClick={fetchMaterials}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                            disabled={materialsLoading}
                                        >
                                            Refresh
                                        </button>
                                    </div>

                                    {materialsLoading ? (
                                        <p className="text-sm text-gray-500">
                                            Loading materials...
                                        </p>
                                    ) : materials.length === 0 ? (
                                        <p className="text-sm text-gray-500">
                                            No materials uploaded yet. Upload a
                                            PDF to reuse it across quizzes.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {materials.map((material) => (
                                                <label
                                                    key={material._id}
                                                    className={`flex items-center justify-between rounded-md border p-3 cursor-pointer ${
                                                        selectedMaterialId ===
                                                        material._id
                                                            ? "border-blue-500 bg-blue-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name="selectedMaterial"
                                                            checked={
                                                                selectedMaterialId ===
                                                                material._id
                                                            }
                                                            onChange={() =>
                                                                setSelectedMaterialId(
                                                                    material._id
                                                                )
                                                            }
                                                            disabled={
                                                                material.status !==
                                                                "completed"
                                                            }
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {material.materialName ||
                                                                    material.fileName}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(
                                                                    material.createdAt
                                                                ).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                                            material.status ===
                                                            "completed"
                                                                ? "bg-green-100 text-green-700"
                                                                : material.status ===
                                                                    "failed"
                                                                  ? "bg-red-100 text-red-700"
                                                                  : "bg-amber-100 text-amber-700"
                                                        }`}
                                                    >
                                                        {material.status}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
