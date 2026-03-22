import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import {
    Trophy,
    Clock,
    CheckCircle,
    XCircle,
    Target,
    Award,
    ArrowLeft,
    BarChart3,
    Calendar,
} from "lucide-react"
import { api } from "../../services/api.js"

export default function QuizResults() {
    const { attemptId } = useParams()
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchResults()
    }, [attemptId])

    const fetchResults = async () => {
        try {
            const response = await api.get(
                `/quiz-attempts/${attemptId}/details`
            )
            setResults(response.data.data)
        } catch (error) {
            console.error("Error fetching results:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="text-gray-600 text-lg">Loading results...</p>
                </div>
            </div>
        )
    }

    const getGradeColor = (grade) => {
        switch (grade) {
            case "S":
                return "text-green-600 bg-green-100"
            case "A":
                return "text-blue-600 bg-blue-100"
            case "B":
                return "text-yellow-600 bg-yellow-100"
            case "C":
                return "text-orange-600 bg-orange-100"
            case "D":
                return "text-orange-700 bg-orange-200"
            case "E":
                return "text-rose-600 bg-rose-100"
            case "F":
                return "text-red-600 bg-red-100"
            case "N":
                return "text-red-800 bg-red-200"
            default:
                return "text-red-600 bg-red-100"
        }
    }

    const getStatusColor = (isPassed) => {
        return isPassed
            ? "text-green-600 bg-green-100 border-green-200"
            : "text-red-600 bg-red-100 border-red-200"
    }

    const isDebarred = results?.score?.grade === "N"
    const statusPillClass = isDebarred
        ? "text-rose-700 bg-rose-100 border-rose-300"
        : getStatusColor(results.score.isPassed)

    const questionWiseVisibility = results?.questionWiseVisibility || {}
    const canViewAnyQuestionWise =
        questionWiseVisibility?.canViewAnyQuestionWise === true

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/dashboard"
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
                            >
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                <span>Back to Dashboard</span>
                            </Link>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-600">
                            <Trophy className="w-5 h-5" />
                            <span className="font-medium">Quiz Results</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Quiz Title */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <Trophy className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Quiz Results
                    </h1>
                    <h2 className="text-2xl text-gray-600">
                        {results.quiz.title}
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Results */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Score Card */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-bold mb-2">
                                            Your Score
                                        </h3>
                                        <div className="text-4xl font-bold">
                                            {results.score.marksObtained}/
                                            {results.score.maxMarks}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold">
                                            {results.score.percentage}%
                                        </div>
                                        <div
                                            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mt-2 ${getGradeColor(results.score.grade)}`}
                                        >
                                            Grade: {results.score.grade}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-bold mt-6 border-2 ${statusPillClass}`}
                                >
                                    {isDebarred ? (
                                        <>
                                            <XCircle className="w-5 h-5 mr-2" />
                                            DEBARRED
                                        </>
                                    ) : results.score.isPassed ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 mr-2" />
                                            PASSED
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-5 h-5 mr-2" />
                                            FAILED
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Performance Summary */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
                                Performance Summary
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-green-50 rounded-2xl p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                                <CheckCircle className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-green-900 font-semibold">
                                                    Correct Answers
                                                </p>
                                                <p className="text-green-700 text-sm">
                                                    Well done!
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-3xl font-bold text-green-600">
                                            {results.performance.correctAnswers}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-red-50 rounded-2xl p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                                <XCircle className="w-6 h-6 text-red-600" />
                                            </div>
                                            <div>
                                                <p className="text-red-900 font-semibold">
                                                    Incorrect Answers
                                                </p>
                                                <p className="text-red-700 text-sm">
                                                    Room for improvement
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-3xl font-bold text-red-600">
                                            {
                                                results.performance
                                                    .incorrectAnswers
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-blue-50 rounded-2xl p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                                <Target className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-blue-900 font-semibold">
                                                    Accuracy
                                                </p>
                                                <p className="text-blue-700 text-sm">
                                                    Overall performance
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-3xl font-bold text-blue-600">
                                            {results.performance.accuracy}%
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-purple-50 rounded-2xl p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                                <Clock className="w-6 h-6 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-purple-900 font-semibold">
                                                    Time Spent
                                                </p>
                                                <p className="text-purple-700 text-sm">
                                                    Duration
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-3xl font-bold text-purple-600">
                                            {Math.floor(
                                                results.timing.timeSpent / 60
                                            )}
                                            m
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Answer Review */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                Your Responses
                            </h3>

                            {!canViewAnyQuestionWise ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                                    {questionWiseVisibility?.releaseAfterDeadline &&
                                    !questionWiseVisibility?.releaseGateOpen
                                        ? "Question-wise results are locked until the quiz deadline."
                                        : "Faculty has currently disabled question-wise result visibility for this quiz."}
                                </div>
                            ) : results.answers?.length > 0 ? (
                                <div className="space-y-4">
                                    {results.answers.map((answer, index) => (
                                        <div
                                            key={index}
                                            className="rounded-xl border border-gray-200 p-4"
                                        >
                                            <p className="font-semibold text-gray-900 mb-2">
                                                Q{answer.questionIndex + 1}:{" "}
                                                {answer.questionText}
                                            </p>
                                            <p className="text-sm text-gray-700">
                                                <span className="font-medium">
                                                    Your Response:
                                                </span>{" "}
                                                {answer.selectedAnswer ||
                                                    "Not answered"}
                                            </p>

                                            {questionWiseVisibility?.canViewCorrectAnswers && (
                                                <p className="text-sm text-green-700 mt-1">
                                                    <span className="font-medium">
                                                        Correct Answer:
                                                    </span>{" "}
                                                    {answer.correctAnswer ||
                                                        "Not available"}
                                                </p>
                                            )}

                                            {questionWiseVisibility?.canViewScores && (
                                                <p className="text-sm text-blue-700 mt-1">
                                                    <span className="font-medium">
                                                        Score:
                                                    </span>{" "}
                                                    {Number(
                                                        answer.marksAwarded || 0
                                                    ).toFixed(2)}{" "}
                                                    /{" "}
                                                    {Number(
                                                        answer.maxMarks || 0
                                                    ).toFixed(2)}
                                                </p>
                                            )}

                                            {questionWiseVisibility?.canViewFeedback &&
                                                answer.gradingNotes && (
                                                    <p className="text-sm text-indigo-700 mt-1">
                                                        <span className="font-medium">
                                                            Feedback:
                                                        </span>{" "}
                                                        {answer.gradingNotes}
                                                    </p>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">
                                    No question-wise responses available yet.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                <Award className="w-5 h-5 mr-2 text-blue-600" />
                                Quick Stats
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">
                                        Total Questions
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                        {results.answers.length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">
                                        Correct
                                    </span>
                                    <span className="font-semibold text-green-600">
                                        {results.performance.correctAnswers}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">
                                        Incorrect
                                    </span>
                                    <span className="font-semibold text-red-600">
                                        {results.performance.incorrectAnswers}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                    <span className="text-gray-600">
                                        Final Grade
                                    </span>
                                    <span
                                        className={`font-bold px-3 py-1 rounded-full text-sm ${getGradeColor(results.score.grade)}`}
                                    >
                                        {results.score.grade}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <Link to="/dashboard">
                                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 font-semibold">
                                    <ArrowLeft className="w-5 h-5" />
                                    <span>Back to Dashboard</span>
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
