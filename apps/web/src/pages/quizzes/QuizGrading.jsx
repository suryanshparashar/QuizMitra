import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../../services/api.js"
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    FileText,
    Users,
    CheckSquare,
} from "lucide-react"

export default function QuizGrading() {
    const { quizId } = useParams()
    const [attempts, setAttempts] = useState([])
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPendingAttempts()
    }, [quizId])

    const fetchPendingAttempts = async () => {
        try {
            const response = await api.get(
                `/quiz-grading/quiz/${quizId}/pending-attempts?status=all&limit=100`
            )
            // The backend groups stuff into { attempts, summary, pagination }
            setAttempts(response.data.data.attempts)
            setSummary(response.data.data.summary)
        } catch (error) {
            console.error("Error fetching attempts:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="text-gray-600 font-medium">
                        Loading attempts...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <button
                            onClick={() => window.history.back()}
                            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4 transition-colors duration-200"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Student Submissions
                        </h1>
                        <h2 className="text-lg text-gray-600">
                            {summary?.quizTitle || "Quiz"}
                        </h2>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-indigo-600" />
                            Student Submissions ({attempts.length})
                        </h3>
                    </div>

                    {attempts.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <CheckSquare className="w-12 h-12 text-green-500 mb-4" />
                            <p className="text-lg font-medium">
                                No attempts found.
                            </p>
                            <p className="text-sm">
                                There are no student submissions for this quiz
                                yet.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {attempts.map((attempt) => (
                                <div
                                    key={attempt._id}
                                    className="p-6 hover:bg-gray-50 transition flex flex-col md:flex-row md:items-center justify-between"
                                >
                                    <div className="mb-4 md:mb-0">
                                        <h4 className="text-lg font-semibold text-gray-900">
                                            {attempt.studentDetails?.fullName}
                                        </h4>
                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                            <FileText className="w-4 h-4 mr-1" />
                                            {attempt.studentDetails?.email}
                                        </p>
                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                            <Clock className="w-4 h-4 mr-1" />
                                            Submitted:{" "}
                                            {new Date(
                                                attempt.submittedAt
                                            ).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-6">
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-indigo-600">
                                                {attempt.percentage}%
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Score
                                            </p>
                                        </div>
                                        <Link
                                            to={`/quiz-grading/${quizId}/review/${attempt.studentDetails?._id}`}
                                        >
                                            <button className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition">
                                                Review
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
