// pages/quizzes/QuizDetails.jsx
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

export default function QuizDetails() {
    const { quizId } = useParams()
    const { user } = useAuthStore()
    const [quiz, setQuiz] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchQuiz()
    }, [quizId])

    const fetchQuiz = async () => {
        try {
            const response = await api.get(`/quizzes/${quizId}`)
            setQuiz(response.data.data)
        } catch (error) {
            console.error("Error fetching quiz:", error)
        } finally {
            setLoading(false)
        }
    }

    const handlePublish = async () => {
        try {
            await api.patch(`/quizzes/${quizId}/publish`)
            setQuiz({ ...quiz, status: "published", isPublished: true })
        } catch (error) {
            console.log(error)
            alert("Failed to publish quiz")
        }
    }

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "published":
                return "bg-green-100 text-green-800 border-green-200"
            case "draft":
                return "bg-yellow-100 text-yellow-800 border-yellow-200"
            case "completed":
                return "bg-blue-100 text-blue-800 border-blue-200"
            default:
                return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case "published":
                return <CheckCircle className="h-4 w-4" />
            case "draft":
                return <AlertCircle className="h-4 w-4" />
            case "completed":
                return <Award className="h-4 w-4" />
            default:
                return <Clock className="h-4 w-4" />
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 font-medium">Loading quiz...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4 transition-colors duration-200"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back
                    </button>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {quiz.title}
                            </h1>
                            <p className="text-gray-600 text-lg">
                                {quiz.description}
                            </p>
                        </div>

                        <div className="mt-4 sm:mt-0 sm:ml-6">
                            <div
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                                    quiz.status
                                )}`}
                            >
                                {getStatusIcon(quiz.status)}
                                <span className="ml-2 capitalize">
                                    {quiz.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Quiz Information */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                                Quiz Information
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Timer className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">
                                            Duration
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {quiz.duration} minutes
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">
                                            Questions
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {quiz.questions?.length || 0}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <Target className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">
                                            Total Marks
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {quiz.requirements?.totalMarks || 0}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <Calendar className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">
                                            Scheduled
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Date(
                                                quiz.scheduledAt
                                            ).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center">
                                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                                    <div>
                                        <p className="text-sm font-medium text-red-900">
                                            Deadline
                                        </p>
                                        <p className="text-sm text-red-700">
                                            {new Date(
                                                quiz.deadline
                                            ).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quiz Questions Preview (Faculty Only) */}
                        {user?.role === "faculty" && quiz.questions && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                                    Questions Preview
                                </h2>

                                <div className="space-y-6">
                                    {quiz.questions?.map((question, index) => (
                                        <div
                                            key={index}
                                            className="border border-gray-200 rounded-lg p-4"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Question {index + 1}
                                                </h3>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {question.marks || 1} mark
                                                    {(question.marks || 1) !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            </div>

                                            <p className="text-gray-700 mb-4 leading-relaxed">
                                                {question.questionText}
                                            </p>

                                            {question.options && (
                                                <div className="mb-4">
                                                    <p className="text-sm font-medium text-gray-600 mb-2">
                                                        Options:
                                                    </p>
                                                    <ul className="space-y-2">
                                                        {question.options?.map(
                                                            (
                                                                option,
                                                                optIndex
                                                            ) => (
                                                                <li
                                                                    key={
                                                                        optIndex
                                                                    }
                                                                    className="flex items-center space-x-2"
                                                                >
                                                                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                                                                        {String.fromCharCode(
                                                                            65 +
                                                                                optIndex
                                                                        )}
                                                                    </span>
                                                                    <span className="text-gray-700">
                                                                        {option}
                                                                    </span>
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                                <p className="text-sm">
                                                    <span className="font-medium text-green-900">
                                                        Correct Answer:
                                                    </span>{" "}
                                                    <span className="text-green-700">
                                                        {question.correctAnswer}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                                <Settings className="h-5 w-5 mr-2 text-blue-600" />
                                Actions
                            </h3>

                            <div className="space-y-4">
                                {/* Faculty Controls */}
                                {user?.role === "faculty" &&
                                    quiz.userId === user._id && (
                                        <>
                                            {quiz.status === "draft" && (
                                                <button
                                                    onClick={handlePublish}
                                                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                                >
                                                    <Play className="h-4 w-4 mr-2" />
                                                    Publish Quiz
                                                </button>
                                            )}

                                            <Link
                                                to={`/quiz-grading/${quizId}`}
                                                className="block"
                                            >
                                                <button className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Results
                                                </button>
                                            </Link>
                                        </>
                                    )}

                                {/* Student Controls */}
                                {user?.role === "student" &&
                                    quiz.canTakeQuiz && (
                                        <Link
                                            to={`/quizzes/${quizId}/take`}
                                            className="block"
                                        >
                                            <button className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                                <Play className="h-4 w-4 mr-2" />
                                                Take Quiz
                                            </button>
                                        </Link>
                                    )}
                            </div>

                            {/* Quiz Stats */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h4 className="text-sm font-medium text-gray-600 mb-4">
                                    Quiz Statistics
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            Attempts
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {quiz.totalAttempts || 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            Average Score
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {quiz.averageScore || 0}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            Pass Rate
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {quiz.passRate || 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
