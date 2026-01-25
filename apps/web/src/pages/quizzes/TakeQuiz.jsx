import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    Send,
    AlertTriangle,
    BookOpen,
    Timer,
    CheckCircle2,
} from "lucide-react"
import { api } from "../../services/api.js"

export default function TakeQuiz() {
    const { quizId } = useParams()
    const navigate = useNavigate()
    const [quiz, setQuiz] = useState(null)
    const [answers, setAnswers] = useState({})
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [startTime] = useState(new Date())

    useEffect(() => {
        fetchQuiz()
    }, [quizId])

    useEffect(() => {
        if (timeRemaining > 0) {
            const timer = setTimeout(
                () => setTimeRemaining(timeRemaining - 1),
                1000
            )
            return () => clearTimeout(timer)
        } else if (timeRemaining === 0 && quiz) {
            handleSubmit()
        }
    }, [timeRemaining])

    const fetchQuiz = async () => {
        try {
            const response = await api.get(`/quizzes/${quizId}`)
            const quizData = response.data.data
            setQuiz(quizData)
            setTimeRemaining(quizData.duration * 60)
        } catch (error) {
            console.error("Error fetching quiz:", error)
            navigate("/dashboard")
        } finally {
            setLoading(false)
        }
    }

    const handleAnswerChange = (questionIndex, answer) => {
        setAnswers({
            ...answers,
            [questionIndex]: answer,
        })
    }

    const handleSubmit = async () => {
        setSubmitting(true)

        const submissionData = {
            answers: Object.keys(answers).map((index) => ({
                questionIndex: parseInt(index),
                selectedAnswer: answers[index],
                timeSpent: 30, // You can track individual question time
            })),
            startedAt: startTime.toISOString(),
            timeSpent: quiz.duration * 60 - timeRemaining,
        }

        try {
            const response = await api.post(
                `/quiz-attempts/quiz/${quizId}/submit`,
                submissionData
            )
            navigate(`/quiz-results/${response.data.data.attemptId}`)
        } catch (error) {
            console.error("Error submitting quiz:", error)
            alert("Failed to submit quiz")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                    <p className="text-gray-600 text-lg">Loading quiz...</p>
                </div>
            </div>
        )
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const getTimeColor = () => {
        const totalTime = quiz.duration * 60
        const percentage = (timeRemaining / totalTime) * 100
        if (percentage > 50) return "text-green-600 bg-green-100"
        if (percentage > 25) return "text-yellow-600 bg-yellow-100"
        return "text-red-600 bg-red-100"
    }

    const getProgressPercentage = () => {
        return ((currentQuestion + 1) / quiz.questions.length) * 100
    }

    const getAnsweredCount = () => {
        return Object.keys(answers).length
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Header */}
            <div className="bg-white shadow-lg border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {quiz.title}
                                </h1>
                                <p className="text-gray-600">
                                    Question {currentQuestion + 1} of{" "}
                                    {quiz.questions.length}
                                </p>
                            </div>
                        </div>
                        <div
                            className={`flex items-center space-x-3 px-6 py-3 rounded-2xl font-bold text-lg ${getTimeColor()}`}
                        >
                            <Timer className="w-5 h-5" />
                            <span>{formatTime(timeRemaining)}</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Progress</span>
                            <span>
                                {getAnsweredCount()} of {quiz.questions.length}{" "}
                                answered
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${getProgressPercentage()}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {quiz.questions[currentQuestion] && (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                        {/* Question Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold">
                                    Question {currentQuestion + 1}
                                </h2>
                                {answers[currentQuestion] && (
                                    <div className="flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-sm">
                                            Answered
                                        </span>
                                    </div>
                                )}
                            </div>
                            <h3 className="text-2xl font-bold leading-relaxed">
                                {quiz.questions[currentQuestion].questionText}
                            </h3>
                        </div>

                        {/* Options */}
                        <div className="p-8">
                            <div className="space-y-4">
                                {quiz.questions[currentQuestion].options.map(
                                    (option, index) => (
                                        <label
                                            key={index}
                                            className={`flex items-center p-6 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                                                answers[currentQuestion] ===
                                                option
                                                    ? "border-indigo-500 bg-indigo-50 shadow-md"
                                                    : "border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100"
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`question-${currentQuestion}`}
                                                value={option}
                                                checked={
                                                    answers[currentQuestion] ===
                                                    option
                                                }
                                                onChange={() =>
                                                    handleAnswerChange(
                                                        currentQuestion,
                                                        option
                                                    )
                                                }
                                                className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 mr-4"
                                            />
                                            <span className="text-lg text-gray-800 font-medium">
                                                {option}
                                            </span>
                                        </label>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="mt-8 flex items-center justify-between">
                    <button
                        onClick={() =>
                            setCurrentQuestion(Math.max(0, currentQuestion - 1))
                        }
                        disabled={currentQuestion === 0}
                        className="flex items-center space-x-2 px-6 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span>Previous</span>
                    </button>

                    <div className="flex items-center space-x-4">
                        {currentQuestion < quiz.questions.length - 1 ? (
                            <button
                                onClick={() =>
                                    setCurrentQuestion(
                                        Math.min(
                                            quiz.questions.length - 1,
                                            currentQuestion + 1
                                        )
                                    )
                                }
                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <span>Next</span>
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        <span>Submit Quiz</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Warning for low time */}
                {timeRemaining <= 300 && timeRemaining > 0 && (
                    <div className="mt-6 bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 flex items-start space-x-4">
                        <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-yellow-800 font-semibold text-lg">
                                Time Warning
                            </h3>
                            <p className="text-yellow-700 mt-1">
                                You have less than 5 minutes remaining. Please
                                review your answers and submit soon.
                            </p>
                        </div>
                    </div>
                )}

                {/* Question Overview */}
                <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Question Overview
                    </h3>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {quiz.questions.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentQuestion(index)}
                                className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                                    index === currentQuestion
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : answers[index]
                                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
