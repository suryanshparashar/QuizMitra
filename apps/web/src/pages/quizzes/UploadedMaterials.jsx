import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    ArrowLeft,
    BookOpen,
    FileText,
    Loader2,
    RefreshCcw,
    Trash2,
    Upload,
} from "lucide-react"
import { api } from "../../services/api.js"
import { showToast } from "../../components/Toast.jsx"

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024

const formatFileSize = (sizeInBytes) => {
    if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
        return "0 MB"
    }

    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadedMaterials() {
    const navigate = useNavigate()
    const materialInputRef = useRef(null)
    const processingPollRef = useRef(null)

    const [classes, setClasses] = useState([])
    const [classId, setClassId] = useState("")
    const [materials, setMaterials] = useState([])
    const [materialsLoading, setMaterialsLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [deletingId, setDeletingId] = useState("")

    const hasProcessingMaterial = useMemo(
        () => materials.some((item) => item.status === "processing"),
        [materials]
    )

    const fetchClasses = async () => {
        try {
            const response = await api.get("/classes/my-classes")
            const classItems = response?.data?.data || []
            setClasses(classItems)
        } catch (error) {
            showToast.error("Failed to fetch classes")
        }
    }

    const fetchMaterials = async ({ silent = false } = {}) => {
        if (!silent) {
            setMaterialsLoading(true)
        }

        try {
            const response = await api.get("/quizzes/materials", {
                params: classId ? { classId } : {},
            })
            setMaterials(response?.data?.data || [])
        } catch (error) {
            if (!silent) {
                showToast.error("Failed to fetch uploaded materials")
            }
        } finally {
            if (!silent) {
                setMaterialsLoading(false)
            }
        }
    }

    const stopProcessingPoll = () => {
        if (processingPollRef.current) {
            clearInterval(processingPollRef.current)
            processingPollRef.current = null
        }
    }

    const startMaterialStatusPolling = () => {
        stopProcessingPoll()

        processingPollRef.current = setInterval(() => {
            fetchMaterials({ silent: true })
        }, 1800)
    }

    const handleUploadMaterial = async (e) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        if (selectedFile.type !== "application/pdf") {
            showToast.error("Only PDF files can be uploaded")
            e.target.value = ""
            return
        }

        if (selectedFile.size > MAX_PDF_SIZE_BYTES) {
            showToast.error("PDF file size cannot exceed 10MB")
            e.target.value = ""
            return
        }

        const form = new FormData()
        form.append("pdf", selectedFile)
        form.append("materialName", selectedFile.name)
        if (classId) {
            form.append("classId", classId)
        }

        setUploading(true)
        setUploadProgress(0)

        try {
            const response = await api.post("/quizzes/materials/upload", form, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || selectedFile.size || 1
                    const uploaded = progressEvent.loaded || 0
                    const percent = Math.round((uploaded / total) * 60)
                    setUploadProgress(Math.min(60, Math.max(0, percent)))
                },
            })

            if (!response?.data?.data?.materialId) {
                throw new Error("Missing material id")
            }

            setUploadProgress(100)
            showToast.success("Material uploaded. Processing started")
            fetchMaterials()
            startMaterialStatusPolling()
        } catch (error) {
            showToast.error(
                error?.response?.data?.message ||
                    "Failed to upload material. Please try again."
            )
        } finally {
            setUploading(false)
            if (materialInputRef.current) {
                materialInputRef.current.value = ""
            }
        }
    }

    const handleDeleteMaterial = async (materialId) => {
        setDeletingId(materialId)
        try {
            await api.delete(`/quizzes/materials/${materialId}`)
            showToast.success("Material deleted successfully")
            setMaterials((prev) =>
                prev.filter((item) => item._id !== materialId)
            )
        } catch (error) {
            showToast.error(
                error?.response?.data?.message ||
                    "Failed to delete material. Please try again."
            )
        } finally {
            setDeletingId("")
        }
    }

    useEffect(() => {
        fetchClasses()

        return () => {
            stopProcessingPoll()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        fetchMaterials()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId])

    useEffect(() => {
        if (hasProcessingMaterial) {
            startMaterialStatusPolling()
        } else {
            stopProcessingPoll()
        }

        return () => {
            stopProcessingPoll()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasProcessingMaterial])

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            Uploaded Documents
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Upload once, reuse across multiple quizzes, or start
                            quiz creation directly.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fetchMaterials()}
                            className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                            disabled={materialsLoading}
                        >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Refresh
                        </button>
                        <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload PDF
                            <input
                                ref={materialInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleUploadMaterial}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Class Filter
                    </label>
                    <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">All Classes</option>
                        {classes.map((classItem) => (
                            <option key={classItem._id} value={classItem._id}>
                                {classItem.subjectName} ({classItem.subjectCode}
                                )
                            </option>
                        ))}
                    </select>

                    {uploading && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-blue-700 mb-1">
                                <span>Uploading and processing...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-blue-100 overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Your PDFs
                        </h2>
                        <span className="text-xs text-gray-500">
                            Max file size: {formatFileSize(MAX_PDF_SIZE_BYTES)}
                        </span>
                    </div>

                    <div className="p-4">
                        {materialsLoading ? (
                            <div className="flex items-center text-gray-500 text-sm">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading materials...
                            </div>
                        ) : materials.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                No documents found. Upload a PDF to get started.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {materials.map((material) => {
                                    const isCompleted =
                                        material.status === "completed"
                                    return (
                                        <div
                                            key={material._id}
                                            className="border border-gray-200 rounded-lg p-4"
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-gray-500" />
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                            {material.materialName ||
                                                                material.fileName}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {new Date(
                                                            material.createdAt
                                                        ).toLocaleString()}{" "}
                                                        |{" "}
                                                        {formatFileSize(
                                                            material.fileSize ||
                                                                0
                                                        )}
                                                    </p>
                                                    <p className="text-xs mt-1">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full font-semibold ${
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
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/quizzes/create?inputMode=material&materialId=${material._id}${material.classId ? `&classId=${material.classId}` : ""}`
                                                            )
                                                        }
                                                        disabled={!isCompleted}
                                                        className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                                                            isCompleted
                                                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                        }`}
                                                    >
                                                        <BookOpen className="h-4 w-4 mr-1" />
                                                        Use in Quiz
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeleteMaterial(
                                                                material._id
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId ===
                                                            material._id
                                                        }
                                                        className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                                                    >
                                                        {deletingId ===
                                                        material._id ? (
                                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                        )}
                                                        Delete PDF
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
