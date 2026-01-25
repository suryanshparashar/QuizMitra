import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../../services/api.js"
import {
    Mail,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowRight,
    RefreshCw,
} from "lucide-react"

export default function VerifyEmail() {
    const { token } = useParams()
    const [status, setStatus] = useState("verifying") // verifying, success, error
    const [message, setMessage] = useState("")

    useEffect(() => {
        verifyEmail()
    }, [token])

    const verifyEmail = async () => {
        try {
            const response = await api.get(`/auth/verify-email/${token}`)
            setStatus("success")
            setMessage(response.data.message)
        } catch (error) {
            setStatus("error")
            setMessage(error.response?.data?.message || "Verification failed")
        }
    }

    const handleRetry = () => {
        setStatus("verifying")
        setMessage("")
        verifyEmail()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="p-8 text-center">
                        {/* Status Icon */}
                        <div className="mb-8">
                            {status === "verifying" && (
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                                </div>
                            )}

                            {status === "success" && (
                                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                                    <CheckCircle className="w-10 h-10 text-white" />
                                </div>
                            )}

                            {status === "error" && (
                                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                                    <XCircle className="w-10 h-10 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="mb-8">
                            {status === "verifying" && (
                                <>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                        Verifying Email
                                    </h1>
                                    <p className="text-gray-600 text-lg">
                                        Please wait while we verify your email
                                        address...
                                    </p>
                                    <div className="mt-6 flex items-center justify-center space-x-2 text-blue-600">
                                        <Mail className="w-5 h-5" />
                                        <span className="text-sm font-medium">
                                            Processing verification
                                        </span>
                                    </div>
                                </>
                            )}

                            {status === "success" && (
                                <>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                        Email Verified!
                                    </h1>
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
                                        <p className="text-green-800 font-medium mb-2">
                                            Success!
                                        </p>
                                        <p className="text-green-700">
                                            {message}
                                        </p>
                                    </div>
                                    <p className="text-gray-600">
                                        Your email has been successfully
                                        verified. You can now sign in to your
                                        account.
                                    </p>
                                </>
                            )}

                            {status === "error" && (
                                <>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                        Verification Failed
                                    </h1>
                                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                                        <p className="text-red-800 font-medium mb-2">
                                            Error
                                        </p>
                                        <p className="text-red-700">
                                            {message}
                                        </p>
                                    </div>
                                    <p className="text-gray-600 mb-6">
                                        The verification link may have expired
                                        or is invalid. Please try again or
                                        contact support.
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-4">
                            {status === "success" && (
                                <Link to="/login">
                                    <button className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2">
                                        <span>Go to Login</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </Link>
                            )}

                            {status === "error" && (
                                <div className="space-y-3">
                                    <button
                                        onClick={handleRetry}
                                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Try Again</span>
                                    </button>

                                    <Link to="/register">
                                        <button className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center space-x-2">
                                            <span>Back to Register</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Help Text */}
                        {status === "error" && (
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <p className="text-sm text-gray-500">
                                    Need help? Contact our support team for
                                    assistance with email verification.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
