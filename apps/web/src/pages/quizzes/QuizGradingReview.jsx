import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../../services/api.js"
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Save,
    User,
    Award,
} from "lucide-react"

export default function QuizGradingReview() {
    const { quizId, studentId } = useParams()
    const [reviewData, setReviewData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [marksUpdate, setMarksUpdate] = useState({})
    const [feedbackUpdate, setFeedbackUpdate] = useState({})
    const [generalFeedback, setGeneralFeedback] = useState("")

    useEffect(() => {
        fetchStudentAttempt()
    }, [quizId, studentId])

    const fetchStudentAttempt = async () => {
        try {
            const response = await api.get(
                `/quiz-grading/quiz/${quizId}/student/${studentId}/review`
            )
            setReviewData(response.data.data)

            // Initialize local state for edits
            const initialMarks = {}
            const initialFeedback = {}
            response.data.data.questionReview.forEach((q) => {
                initialMarks[q.questionIndex] = q.currentMarks
                initialFeedback[q.questionIndex] = q.feedback || ""
            })
            setMarksUpdate(initialMarks)
            setFeedbackUpdate(initialFeedback)
            setGeneralFeedback(
                response.data.data.attempt?.facultyFeedback || ""
            )
        } catch (error) {
            console.error("Error fetching attempt review:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkChange = (qIndex, maxMarks, value) => {
        let val = parseInt(value)
        if (isNaN(val) || val < 0) val = 0
        if (val > maxMarks) val = maxMarks
        setMarksUpdate({ ...marksUpdate, [qIndex]: val })
    }

    const handleFeedbackChange = (qIndex, value) => {
        setFeedbackUpdate({ ...feedbackUpdate, [qIndex]: value })
    }

    const saveGrades = async () => {
        setSaving(true)
        try {
            // Build bulk update payload
            const questionUpdates = reviewData.questionReview.map((q) => ({
                questionIndex: q.questionIndex,
                marksAwarded: marksUpdate[q.questionIndex],
                isCorrect: marksUpdate[q.questionIndex] > 0,
                feedback: feedbackUpdate[q.questionIndex],
            }))

            await api.patch(
                `/quiz-grading/attempt/${reviewData._id}/bulk-update`,
                {
                    questionUpdates,
                    generalFeedback,
                }
            )

            alert("Grades saved successfully!")
            window.history.back()
        } catch (error) {
            console.error(error)
            alert(error.response?.data?.message || "Failed to save grades.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="text-gray-600 font-medium">
                        Loading review data...
                    </p>
                </div>
            </div>
        )
    }

    if (!reviewData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Attempt Not Found
                </h2>
                <p className="text-gray-600 mb-6">
                    The requested student attempt could not be loaded.
                </p>
                <button
                    onClick={() => window.history.back()}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
                >
                    Go Back
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4 transition-colors duration-200"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Attempts
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                Grade Submission
                            </h1>
                            <p className="text-gray-600">
                                {reviewData.quiz.title}
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-center space-x-3 bg-white px-4 py-2 border rounded-lg shadow-sm">
                            <User className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-bold text-gray-900">
                                    {reviewData.student.fullName}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {reviewData.student.email}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-indigo-50 p-4 rounded-xl">
                            <p className="text-sm text-indigo-800 font-medium mb-1 flex items-center">
                                <Award className="w-4 h-4 mr-1" /> Current Score
                            </p>
                            <p className="text-2xl font-bold text-indigo-900">
                                {reviewData.currentScoring.marksObtained} /{" "}
                                {reviewData.quiz.maxMarks}
                            </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl">
                            <p className="text-sm text-green-800 font-medium mb-1 flex items-center">
                                <CheckCircle className="w-4 h-4 mr-1" /> Correct
                            </p>
                            <p className="text-2xl font-bold text-green-900">
                                {reviewData.currentScoring.correctAnswers}
                            </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl">
                            <p className="text-sm text-red-800 font-medium mb-1 flex items-center">
                                <XCircle className="w-4 h-4 mr-1" /> Incorrect
                            </p>
                            <p className="text-2xl font-bold text-red-900">
                                {reviewData.currentScoring.incorrectAnswers}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-sm text-gray-800 font-medium mb-1 flex items-center">
                                <Clock className="w-4 h-4 mr-1" /> Time Spent
                            </p>
                            <p className="text-2xl font-bold text-gray-900 text-sm mt-2">
                                {Math.floor(reviewData.attempt.timeSpent / 60)}m{" "}
                                {reviewData.attempt.timeSpent % 60}s
                            </p>
                        </div>
                    </div>
                </div>

                {/* Questions Review */}
                <div className="space-y-6">
                    {reviewData.questionReview.map((q, i) => (
                        <div
                            key={i}
                            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <h4 className="text-lg font-semibold text-gray-900">
                                    Question {q.questionIndex + 1}
                                </h4>
                                <span className="text-sm text-gray-500 font-medium">
                                    Max Marks: {q.maxMarksForQuestion}
                                </span>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-gray-800 whitespace-pre-wrap">
                                    {q.questionText}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div
                                    className={`p-4 rounded-lg border ${q.isCurrentlyCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                                >
                                    <p className="text-sm font-semibold mb-1 flex items-center">
                                        Student Answer
                                    </p>
                                    <p
                                        className={`font-medium ${q.isCurrentlyCorrect ? "text-green-800" : "text-red-800"}`}
                                    >
                                        {q.studentAnswer || (
                                            <i className="text-gray-500">
                                                Not Answered
                                            </i>
                                        )}
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                                    <p className="text-sm font-semibold text-blue-900 mb-1">
                                        Correct Answer
                                    </p>
                                    <p className="text-blue-800 font-medium">
                                        {q.correctAnswer}
                                    </p>
                                </div>
                            </div>

                            {/* Grading Inputs */}
                            <div className="border-t border-gray-100 pt-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Marks Awarded
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max={q.maxMarksForQuestion}
                                            value={marksUpdate[q.questionIndex]}
                                            onChange={(e) =>
                                                handleMarkChange(
                                                    q.questionIndex,
                                                    q.maxMarksForQuestion,
                                                    e.target.value
                                                )
                                            }
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Feedback Note (Optional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={
                                            feedbackUpdate[q.questionIndex] ||
                                            ""
                                        }
                                        onChange={(e) =>
                                            handleFeedbackChange(
                                                q.questionIndex,
                                                e.target.value
                                            )
                                        }
                                        placeholder="Write a note about this specific answer..."
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Overall Feedback & Actions */}
                <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        Overall Attempt Feedback
                    </h3>
                    <div className="mb-6">
                        <textarea
                            rows={4}
                            value={generalFeedback}
                            onChange={(e) => setGeneralFeedback(e.target.value)}
                            placeholder="Write general feedback for the student's attempt..."
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={saveGrades}
                            disabled={saving}
                            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${saving ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5 mr-2" />
                                    Save Graded Submision
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
