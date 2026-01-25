import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
    Users,
    ArrowLeft,
    Hash,
    CheckCircle,
    AlertCircle,
    Loader2,
    UserPlus,
    BookOpen,
} from "lucide-react"
import { api } from "../../services/api.js"

export default function JoinClass() {
    const [classCode, setClassCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess("")

        try {
            const response = await api.post(`/classes/join/${classCode}`)
            setSuccess("Successfully joined the class!")
            setTimeout(() => {
                navigate(`/classes/${response.data.data.class._id}`)
            }, 2000)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to join class")
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const value = e.target.value.toUpperCase()
        setClassCode(value)
        if (error) setError("") // Clear error when user starts typing
        if (success) setSuccess("") // Clear success when user starts typing again
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/classes"
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
                            >
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                <span>Back to Classes</span>
                            </Link>
                        </div>
                        <div className="flex items-center space-x-2 text-green-600">
                            <UserPlus className="w-5 h-5" />
                            <span className="font-medium">Join Class</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Page Title */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <Users className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Join a Class
                    </h1>
                    <p className="text-gray-600 text-xl leading-relaxed">
                        Enter the class code provided by your instructor to join
                        the class and access course materials.
                    </p>
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="p-8 sm:p-12">
                        {/* Success Message */}
                        {success && (
                            <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start space-x-4">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-green-800 font-semibold text-lg">
                                        Success!
                                    </h3>
                                    <p className="text-green-700 mt-1">
                                        {success}
                                    </p>
                                    <p className="text-green-600 text-sm mt-2">
                                        Redirecting you to the class...
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start space-x-4">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-red-800 font-semibold text-lg">
                                        Unable to Join Class
                                    </h3>
                                    <p className="text-red-700 mt-1">{error}</p>
                                    <p className="text-red-600 text-sm mt-2">
                                        Please check the class code and try
                                        again.
                                    </p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Class Code Input */}
                            <div className="space-y-3">
                                <label className="block text-lg font-semibold text-gray-800 mb-3">
                                    Class Code
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Hash className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Enter class code (e.g., ABC123)"
                                        value={classCode}
                                        onChange={handleInputChange}
                                        required
                                        className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500 font-mono tracking-wider"
                                        maxLength={10}
                                        style={{ textTransform: "uppercase" }}
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    The class code is usually provided by your
                                    instructor and consists of letters and
                                    numbers.
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !classCode.trim()}
                                className="w-full py-4 px-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-semibold rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-3"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Joining Class...</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-5 h-5" />
                                        <span>Join Class</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Help Section */}
                <div className="mt-12 text-center">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            Need Help?
                        </h3>
                        <p className="text-gray-600 mb-4">
                            If you don't have a class code, contact your
                            instructor or check your course materials.
                        </p>
                        <div className="text-sm text-gray-500 space-y-2">
                            <p>• Class codes are case-insensitive</p>
                            <p>• Make sure you're entering the correct code</p>
                            <p>
                                • Contact support if you continue having issues
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
