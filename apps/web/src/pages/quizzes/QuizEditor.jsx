import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "../../services/api"
import {
    Save,
    ArrowLeft,
    Plus,
    Trash2,
    Sparkles,
    CheckCircle,
    AlertCircle,
    HelpCircle,
    AlignLeft,
    List,
    Calendar,
    Clock,
} from "lucide-react"
import { formatForDateTimeLocal, toUtcIsoString } from "../../utils/datetime.js"
import { showToast } from "../../components/Toast.jsx"

export default function QuizEditor() {
    const { quizId } = useParams()
    const navigate = useNavigate()
    const [quiz, setQuiz] = useState(null)
    const [questions, setQuestions] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [regeneratingIndex, setRegeneratingIndex] = useState(null)
    const [generatingNewQuestion, setGeneratingNewQuestion] = useState(false)

    const currentTotalMarks = questions.reduce(
        (sum, q) => sum + (Number(q.points) || 1),
        0
    )

    // Settings State
    const [scheduledAt, setScheduledAt] = useState("")
    const [deadline, setDeadline] = useState("")

    useEffect(() => {
        fetchQuiz()
    }, [quizId])

    const fetchQuiz = async () => {
        try {
            const response = await api.get(`/quizzes/${quizId}`)
            const data = response.data.data

            // Ensure data consistency for editing
            setQuiz(data)

            // Format dates for datetime-local input
            if (data.scheduledAt) {
                setScheduledAt(formatForDateTimeLocal(data.scheduledAt))
            }
            if (data.deadline) {
                setDeadline(formatForDateTimeLocal(data.deadline))
            }

            setQuestions(
                data.questions?.map((q) => ({
                    ...q,
                    // Ensure options is array
                    options: Array.isArray(q.options) ? q.options : [],
                    // Ensure points/marks exists
                    points: q.points || q.marks || 1,
                    // Default type if missing
                    questionType: q.questionType || "multiple-choice",
                })) || []
            )
        } catch (err) {
            setError("Failed to load quiz details")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = [...questions]
        updatedQuestions[index] = {
            ...updatedQuestions[index],
            [field]: value,
        }
        setQuestions(updatedQuestions)
    }

    const handleOptionChange = (qIndex, oIndex, value) => {
        const updatedQuestions = [...questions]
        const updatedOptions = [...updatedQuestions[qIndex].options]
        updatedOptions[oIndex] = value
        updatedQuestions[qIndex].options = updatedOptions
        setQuestions(updatedQuestions)
    }

    const addOption = (qIndex) => {
        const updatedQuestions = [...questions]
        updatedQuestions[qIndex].options.push(
            `Option ${updatedQuestions[qIndex].options.length + 1}`
        )
        setQuestions(updatedQuestions)
    }

    const removeOption = (qIndex, oIndex) => {
        const updatedQuestions = [...questions]
        updatedQuestions[qIndex].options.splice(oIndex, 1)
        setQuestions(updatedQuestions)
    }

    const removeQuestion = (index) => {
        if (window.confirm("Are you sure you want to delete this question?")) {
            const updatedQuestions = [...questions]
            updatedQuestions.splice(index, 1)
            setQuestions(updatedQuestions)
        }
    }

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                questionText: "New Question",
                options: ["Option A", "Option B", "Option C", "Option D"],
                correctAnswer: "Option A",
                points: 1,
                questionType: "multiple-choice",
            },
        ])
    }

    const handleSave = async () => {
        setSaving(true)
        setError("")

        try {
            // Validate before saving
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i]
                if (!q.questionText.trim()) {
                    throw new Error(`Question ${i + 1} text cannot be empty`)
                }

                if (
                    q.questionType === "multiple-choice" ||
                    q.questionType === "multiple-select"
                ) {
                    if (q.options.length < 2) {
                        throw new Error(
                            `Question ${i + 1} must have at least 2 options`
                        )
                    }
                }

                if (!q.correctAnswer) {
                    throw new Error(
                        `Question ${i + 1} must have a correct answer/rubric`
                    )
                }
            }

            await api.patch(`/quizzes/${quizId}`, {
                questions: questions,
                scheduledAt: scheduledAt
                    ? toUtcIsoString(scheduledAt)
                    : undefined,
                deadline: deadline ? toUtcIsoString(deadline) : undefined,
            })

            navigate(`/quizzes/${quizId}`)
        } catch (err) {
            setError(
                err.message ||
                    err.response?.data?.message ||
                    "Failed to save changes"
            )
        } finally {
            setSaving(false)
        }
    }

    const handleAiRegenerateQuestion = async (qIndex) => {
        setError("")
        setRegeneratingIndex(qIndex)

        try {
            const response = await api.post(
                `/quizzes/${quizId}/questions/${qIndex}/ai-regenerate`,
                {}
            )

            const regeneratedQuestion = response?.data?.data?.question
            if (!regeneratedQuestion) {
                throw new Error("No regenerated question returned by AI")
            }

            setQuestions((prev) => {
                const updated = [...prev]
                updated[qIndex] = {
                    ...updated[qIndex],
                    ...regeneratedQuestion,
                    points:
                        updated[qIndex]?.points ||
                        regeneratedQuestion.points ||
                        1,
                }
                return updated
            })

            showToast.success(`Question ${qIndex + 1} regenerated`)
        } catch (err) {
            const message =
                err.response?.data?.message ||
                err.message ||
                "Failed to regenerate question"
            setError(message)
            showToast.error(message)
        } finally {
            setRegeneratingIndex(null)
        }
    }

    const handleAiGenerateNewQuestion = async () => {
        setError("")
        setGeneratingNewQuestion(true)

        try {
            const instruction =
                window.prompt(
                    "Optional instruction for the new question (e.g., focus on application-based problem).",
                    ""
                ) || ""

            const response = await api.post(
                `/quizzes/${quizId}/questions/ai-generate`,
                {
                    instruction,
                }
            )

            const newQuestion = response?.data?.data?.question
            if (!newQuestion) {
                throw new Error("No question returned by AI")
            }

            setQuestions((prev) => [...prev, newQuestion])
            showToast.success("New question generated and added")
        } catch (err) {
            const message =
                err.response?.data?.message ||
                err.message ||
                "Failed to generate new question"
            setError(message)
            showToast.error(message)
        } finally {
            setGeneratingNewQuestion(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!quiz) return <div className="text-center py-10">Quiz not found</div>

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 truncate max-w-md">
                                Edit: {quiz.title}
                            </h1>
                            <p className="text-sm text-gray-500">
                                {questions.length} Questions •{" "}
                                {currentTotalMarks} Total Marks
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            {saving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Settings Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                        Quiz Schedule & Deadline
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Scheduled Start Time
                            </label>
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Deadline (End Time)
                            </label>
                            <input
                                type="datetime-local"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {questions.map((question, qIndex) => (
                    <div
                        key={qIndex}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                                        {qIndex + 1}
                                    </span>
                                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                                        Question {qIndex + 1}
                                    </div>

                                    {/* Type Selector */}
                                    <select
                                        value={question.questionType}
                                        onChange={(e) =>
                                            handleQuestionChange(
                                                qIndex,
                                                "questionType",
                                                e.target.value
                                            )
                                        }
                                        className="ml-2 text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="multiple-choice">
                                            Multiple Choice
                                        </option>
                                        <option value="true-false">
                                            True / False
                                        </option>
                                        <option value="fill-in-blank">
                                            Fill in Blank
                                        </option>
                                        <option value="short-answer">
                                            Short Answer (AI)
                                        </option>
                                        <option value="long-answer">
                                            Long Answer (AI)
                                        </option>
                                    </select>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleAiRegenerateQuestion(qIndex)
                                        }
                                        disabled={
                                            regeneratingIndex === qIndex ||
                                            saving
                                        }
                                        className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 disabled:opacity-50"
                                        title="Regenerate this question with AI"
                                    >
                                        {regeneratingIndex === qIndex ? (
                                            <span className="inline-flex items-center">
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-700 mr-1"></div>
                                                Regenerating...
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                AI Regenerate
                                            </span>
                                        )}
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={question.points}
                                        onChange={(e) =>
                                            handleQuestionChange(
                                                qIndex,
                                                "points",
                                                parseInt(e.target.value) || 1
                                            )
                                        }
                                        className="w-16 p-1 text-sm border border-gray-300 rounded text-center"
                                        title="Marks"
                                    />
                                    <span className="text-sm text-gray-500">
                                        marks
                                    </span>
                                    <button
                                        onClick={() => removeQuestion(qIndex)}
                                        className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                                        title="Delete Question"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Question Text
                                </label>
                                <textarea
                                    value={question.questionText}
                                    onChange={(e) =>
                                        handleQuestionChange(
                                            qIndex,
                                            "questionText",
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Enter question text..."
                                />
                            </div>

                            {/* Conditional Inputs based on Type */}
                            {question.questionType === "short-answer" ||
                            question.questionType === "long-answer" ? (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Model Answer / Grading Rubric
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        The AI will use this to evaluate student
                                        answers. Be specific about what key
                                        points are required.
                                    </p>
                                    <textarea
                                        value={question.correctAnswer}
                                        onChange={(e) =>
                                            handleQuestionChange(
                                                qIndex,
                                                "correctAnswer",
                                                e.target.value
                                            )
                                        }
                                        rows={4}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none bg-green-50/30"
                                        placeholder="Enter the ideal answer or key points required for full marks..."
                                    />
                                </div>
                            ) : question.questionType === "fill-in-blank" ? (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Correct Answer
                                    </label>
                                    <input
                                        type="text"
                                        value={question.correctAnswer}
                                        onChange={(e) =>
                                            handleQuestionChange(
                                                qIndex,
                                                "correctAnswer",
                                                e.target.value
                                            )
                                        }
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="Enter the exact word or phrase..."
                                    />
                                </div>
                            ) : (
                                /* Options for MCQ / True-False */
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Options & Correct Answer
                                    </label>
                                    {question.options.map((option, oIndex) => (
                                        <div
                                            key={oIndex}
                                            className="flex items-center space-x-3 group"
                                        >
                                            <input
                                                type="radio"
                                                name={`correct-answer-${qIndex}`}
                                                checked={
                                                    question.correctAnswer ===
                                                    option
                                                }
                                                onChange={() =>
                                                    handleQuestionChange(
                                                        qIndex,
                                                        "correctAnswer",
                                                        option
                                                    )
                                                }
                                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 cursor-pointer"
                                                title="Mark as correct answer"
                                            />
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) => {
                                                        handleOptionChange(
                                                            qIndex,
                                                            oIndex,
                                                            e.target.value
                                                        )
                                                        // Also update correct answer if this was the correct one
                                                        if (
                                                            question.correctAnswer ===
                                                            option
                                                        ) {
                                                            handleQuestionChange(
                                                                qIndex,
                                                                "correctAnswer",
                                                                e.target.value
                                                            )
                                                        }
                                                    }}
                                                    className={`w-full p-2 pl-3 pr-10 border rounded-lg focus:input-ring ${
                                                        question.correctAnswer ===
                                                        option
                                                            ? "border-green-300 bg-green-50"
                                                            : "border-gray-300"
                                                    }`}
                                                />
                                                {question.correctAnswer ===
                                                    option && (
                                                    <CheckCircle className="absolute right-3 top-2.5 h-4 w-4 text-green-600" />
                                                )}
                                            </div>
                                            <button
                                                onClick={() =>
                                                    removeOption(qIndex, oIndex)
                                                }
                                                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                disabled={
                                                    question.options.length <= 2
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addOption(qIndex)}
                                        className="ml-7 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center mt-2"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Option
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={addQuestion}
                        className="py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Question
                    </button>
                    <button
                        onClick={handleAiGenerateNewQuestion}
                        disabled={generatingNewQuestion || saving}
                        className="py-4 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-700 font-medium hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {generatingNewQuestion ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-700 mr-2"></div>
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5 mr-2" />
                                Generate New Question (AI)
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
                <div className="rounded-xl border border-blue-200 bg-white/95 backdrop-blur px-4 py-3 shadow-lg min-w-[180px]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Total Marks
                    </p>
                    <p className="text-2xl font-bold text-blue-900 leading-tight">
                        {currentTotalMarks}
                    </p>
                    <p className="text-xs text-gray-500">
                        Updates as you edit points
                    </p>
                </div>
            </div>
        </div>
    )
}
