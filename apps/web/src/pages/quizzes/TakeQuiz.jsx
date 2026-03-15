import { useState, useEffect, useRef } from "react"
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
    Flag,
    AlertCircle,
    X,
} from "lucide-react"
import { api } from "../../services/api.js"

export default function TakeQuiz() {
    const { quizId } = useParams()
    const navigate = useNavigate()
    const [quiz, setQuiz] = useState(null)
    const [answers, setAnswers] = useState({})
    const [reviewList, setReviewList] = useState(new Set())
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [timeRemaining, setTimeRemaining] = useState(null) // Null initial state to show loading
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showSubmitModal, setShowSubmitModal] = useState(false)
    const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false)
    const [startTime, setStartTime] = useState(null)
    const submissionLockRef = useRef(false)

    useEffect(() => {
        fetchQuiz()
        // Load auto-saved answers
        const savedAnswers = localStorage.getItem(`quiz_answers_${quizId}`)
        if (savedAnswers) {
            setAnswers(JSON.parse(savedAnswers))
        }
        const savedReviewList = localStorage.getItem(`quiz_review_${quizId}`)
        if (savedReviewList) {
            setReviewList(new Set(JSON.parse(savedReviewList)))
        }

        // Restore start time or set new
        const savedStartTime = localStorage.getItem(`quiz_startTime_${quizId}`)
        if (savedStartTime) {
            setStartTime(new Date(savedStartTime))
        } else {
            // Will be set when quiz loads
        }
    }, [quizId])

    useEffect(() => {
        if (timeRemaining === null) return

        if (timeRemaining > 0) {
            const timer = setTimeout(
                () => setTimeRemaining(timeRemaining - 1),
                1000
            )
            return () => clearTimeout(timer)
        } else if (
            timeRemaining === 0 &&
            quiz &&
            !submitting &&
            !hasAutoSubmitted
        ) {
            setHasAutoSubmitted(true)
            handleFinalSubmit() // Auto-submit when time runs out
        }
    }, [timeRemaining, quiz, submitting, hasAutoSubmitted])

    // Auto-save effect
    useEffect(() => {
        if (Object.keys(answers).length > 0) {
            localStorage.setItem(
                `quiz_answers_${quizId}`,
                JSON.stringify(answers)
            )
        }
        if (reviewList.size > 0) {
            localStorage.setItem(
                `quiz_review_${quizId}`,
                JSON.stringify([...reviewList])
            )
        }
    }, [answers, reviewList, quizId])

    const fetchQuiz = async () => {
        try {
            const response = await api.get(`/quizzes/${quizId}`)
            const quizData = response.data.data
            setQuiz(quizData)

            // Timer Logic: Check for existing end time or create new
            const savedEndTime = localStorage.getItem(`quiz_endTime_${quizId}`)
            const savedStartTime = localStorage.getItem(
                `quiz_startTime_${quizId}`
            )

            if (savedEndTime && savedStartTime) {
                // Restore session
                const endTime = parseInt(savedEndTime, 10)
                const remaining = Math.max(
                    0,
                    Math.floor((endTime - Date.now()) / 1000)
                )
                setTimeRemaining(remaining)
                setStartTime(new Date(savedStartTime))
            } else {
                // New session
                const now = new Date()
                const durationSeconds = quizData.duration * 60
                const endTime = now.getTime() + durationSeconds * 1000

                localStorage.setItem(
                    `quiz_startTime_${quizId}`,
                    now.toISOString()
                )
                localStorage.setItem(
                    `quiz_endTime_${quizId}`,
                    endTime.toString()
                )

                setStartTime(now)
                setTimeRemaining(durationSeconds)
            }
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

    const toggleReview = (index) => {
        const newReviewList = new Set(reviewList)
        if (newReviewList.has(index)) {
            newReviewList.delete(index)
        } else {
            newReviewList.add(index)
        }
        setReviewList(newReviewList)
    }

    const handleSubmitClick = () => {
        setShowSubmitModal(true)
    }

    const handleFinalSubmit = async () => {
        if (submissionLockRef.current || submitting || !startTime) {
            return
        }

        submissionLockRef.current = true
        setSubmitting(true)
        setShowSubmitModal(false)

        const submissionData = {
            answers: Object.keys(answers).map((index) => ({
                questionIndex: parseInt(index),
                selectedAnswer: answers[index],
                timeSpent: 30, // Placeholder
            })),
            startedAt: startTime.toISOString(),
            timeSpent: quiz.duration * 60 - timeRemaining,
        }

        try {
            const response = await api.post(
                `/quiz-attempts/quiz/${quizId}/submit`,
                submissionData
            )
            // Clear local storage
            localStorage.removeItem(`quiz_answers_${quizId}`)
            localStorage.removeItem(`quiz_review_${quizId}`)

            navigate(`/quiz-results/${response.data.data.attemptId}`)
        } catch (error) {
            console.error("Error submitting quiz:", error)
            alert(
                error.response?.data?.message ||
                    "Failed to submit quiz. Please try again."
            )
            submissionLockRef.current = false
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
        return (Object.keys(answers).length / quiz.questions.length) * 100
    }

    const answeredCount = Object.keys(answers).length
    const totalQuestions = quiz.questions.length
    const reviewCount = reviewList.size

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pb-20">
            {/* Header */}
            <div className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 truncate max-w-xs sm:max-w-md">
                                    {quiz.title}
                                </h1>
                                <p className="text-sm text-gray-500 hidden sm:block">
                                    Question {currentQuestion + 1} of{" "}
                                    {totalQuestions}
                                </p>
                            </div>
                        </div>
                        <div
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-lg ${getTimeColor()}`}
                        >
                            <Timer className="w-5 h-5" />
                            <span className="tabular-nums">
                                {formatTime(timeRemaining)}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>
                                {answeredCount} / {totalQuestions} answered
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getProgressPercentage()}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
                {/* Main Question Area */}
                <div className="flex-1">
                    {quiz.questions[currentQuestion] && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Question Header */}
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-start justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Question {currentQuestion + 1}
                                    </h2>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() =>
                                                toggleReview(currentQuestion)
                                            }
                                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                reviewList.has(currentQuestion)
                                                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            <Flag
                                                className={`w-4 h-4 ${reviewList.has(currentQuestion) ? "fill-current" : ""}`}
                                            />
                                            <span>
                                                {reviewList.has(currentQuestion)
                                                    ? "Marked"
                                                    : "Mark for Review"}
                                            </span>
                                        </button>
                                        {answers[currentQuestion] && (
                                            <div className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Answered</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-lg text-gray-800 leading-relaxed font-medium">
                                    {
                                        quiz.questions[currentQuestion]
                                            .questionText
                                    }
                                </div>
                            </div>

                            {/* Options / Input Area */}
                            <div className="p-6 bg-white">
                                {quiz.questions[currentQuestion]
                                    .questionType === "short-answer" ||
                                quiz.questions[currentQuestion].questionType ===
                                    "long-answer" ? (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Your Answer
                                        </label>
                                        <textarea
                                            value={
                                                answers[currentQuestion] || ""
                                            }
                                            onChange={(e) =>
                                                handleAnswerChange(
                                                    currentQuestion,
                                                    e.target.value
                                                )
                                            }
                                            rows={
                                                quiz.questions[currentQuestion]
                                                    .questionType ===
                                                "long-answer"
                                                    ? 8
                                                    : 4
                                            }
                                            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                            placeholder="Type your answer here..."
                                        />
                                    </div>
                                ) : quiz.questions[currentQuestion]
                                      .questionType === "fill-in-blank" ? (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Your Answer
                                        </label>
                                        <input
                                            type="text"
                                            value={
                                                answers[currentQuestion] || ""
                                            }
                                            onChange={(e) =>
                                                handleAnswerChange(
                                                    currentQuestion,
                                                    e.target.value
                                                )
                                            }
                                            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="Type your answer here..."
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {quiz.questions[
                                            currentQuestion
                                        ].options.map((option, index) => (
                                            <label
                                                key={index}
                                                className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-sm ${
                                                    answers[currentQuestion] ===
                                                    option
                                                        ? "border-indigo-600 bg-indigo-50/50"
                                                        : "border-gray-200 hover:border-indigo-200 hover:bg-gray-50"
                                                }`}
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${
                                                        answers[
                                                            currentQuestion
                                                        ] === option
                                                            ? "border-indigo-600 bg-indigo-600"
                                                            : "border-gray-300 bg-white"
                                                    }`}
                                                >
                                                    {answers[
                                                        currentQuestion
                                                    ] === option && (
                                                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                                    )}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name={`question-${currentQuestion}`}
                                                    value={option}
                                                    checked={
                                                        answers[
                                                            currentQuestion
                                                        ] === option
                                                    }
                                                    onChange={() =>
                                                        handleAnswerChange(
                                                            currentQuestion,
                                                            option
                                                        )
                                                    }
                                                    className="hidden"
                                                />
                                                <span className="text-gray-700 font-medium">
                                                    {option}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Navigation Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <button
                                    onClick={() =>
                                        setCurrentQuestion(
                                            Math.max(0, currentQuestion - 1)
                                        )
                                    }
                                    disabled={currentQuestion === 0}
                                    className="flex items-center px-4 py-2 text-gray-600 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    <ChevronLeft className="w-5 h-5 mr-1" />
                                    Previous
                                </button>

                                {currentQuestion < totalQuestions - 1 ? (
                                    <button
                                        onClick={() =>
                                            setCurrentQuestion(
                                                Math.min(
                                                    totalQuestions - 1,
                                                    currentQuestion + 1
                                                )
                                            )
                                        }
                                        className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                                    >
                                        Next
                                        <ChevronRight className="w-5 h-5 ml-1" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmitClick}
                                        className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm cursor-pointer"
                                    >
                                        Finish Quiz
                                        <Send className="w-4 h-4 ml-2" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Question Palette Sidebar */}
                <div className="w-full lg:w-80 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                            Question Palette
                        </h3>
                        <div className="grid grid-cols-5 gap-2">
                            {quiz.questions.map((_, index) => {
                                let statusClass =
                                    "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                if (index === currentQuestion) {
                                    statusClass =
                                        "ring-2 ring-indigo-600 ring-offset-2 bg-white text-indigo-600 font-bold"
                                } else if (reviewList.has(index)) {
                                    statusClass =
                                        "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                } else if (answers[index]) {
                                    statusClass = "bg-green-100 text-green-800"
                                }

                                return (
                                    <button
                                        key={index}
                                        onClick={() =>
                                            setCurrentQuestion(index)
                                        }
                                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${statusClass}`}
                                    >
                                        {index + 1}
                                        {reviewList.has(index) &&
                                            index !== currentQuestion && (
                                                <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full -mr-1 -mt-1" />
                                            )}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-6 space-y-2 text-xs text-gray-500">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-2" />
                                <span>Answered</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded mr-2" />
                                <span>Marked for Review</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded mr-2" />
                                <span>Not Visited / Unanswered</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmitClick}
                            className="w-full mt-6 py-3 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 cursor-pointer"
                        >
                            Submit Quiz
                        </button>
                    </div>

                    {/* Time Warning */}
                    {timeRemaining <= 300 && timeRemaining > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start space-x-3 animate-pulse">
                            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                            <div>
                                <h4 className="text-orange-900 font-medium text-sm">
                                    Time is running out!
                                </h4>
                                <p className="text-orange-700 text-xs mt-1">
                                    Less than 5 minutes remaining.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Submit Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">
                                    Submit Quiz?
                                </h3>
                                <button
                                    onClick={() => setShowSubmitModal(false)}
                                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <p className="text-gray-600">
                                    You are about to submit your quiz. Please
                                    confirm your details:
                                </p>

                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">
                                            Total Questions
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            {totalQuestions}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">
                                            Answered
                                        </span>
                                        <span className="font-semibold text-green-600">
                                            {answeredCount}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">
                                            Marked for Review
                                        </span>
                                        <span
                                            className={`font-semibold ${reviewCount > 0 ? "text-yellow-600" : "text-gray-900"}`}
                                        >
                                            {reviewCount}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-2">
                                        <span className="text-gray-600">
                                            Unanswered
                                        </span>
                                        <span
                                            className={`font-semibold ${totalQuestions - answeredCount > 0 ? "text-red-600" : "text-gray-900"}`}
                                        >
                                            {totalQuestions - answeredCount}
                                        </span>
                                    </div>
                                </div>

                                {(totalQuestions - answeredCount > 0 ||
                                    reviewCount > 0) && (
                                    <div className="flex items-start space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <p>
                                            You have{" "}
                                            {totalQuestions - answeredCount}{" "}
                                            unanswered questions and{" "}
                                            {reviewCount} marked for review.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowSubmitModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    Review Quiz
                                </button>
                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 cursor-wait"></div>
                                            Submitting...
                                        </>
                                    ) : (
                                        "Confirm Submit"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
