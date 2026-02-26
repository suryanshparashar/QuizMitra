import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
    Hash,
    CheckCircle,
    AlertCircle,
    Loader2,
    UserPlus,
    X,
} from "lucide-react"
import { api } from "../services/api.js"

export default function JoinClassModal({ isOpen, onClose, initialCode = "" }) {
    const [classCode, setClassCode] = useState(initialCode)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const navigate = useNavigate()

    useEffect(() => {
        if (isOpen) {
            setClassCode(initialCode)
            setError("")
            setSuccess("")
        }
    }, [isOpen, initialCode])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess("")

        try {
            const response = await api.post(`/classes/${classCode}/join`)
            setSuccess("Successfully joined the class!")
            setTimeout(() => {
                onClose()
                navigate(`/classes/${response.data.data.class._id}`)
            }, 1000)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to join class")
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const value = e.target.value.toUpperCase()
        setClassCode(value)
        if (error) setError("")
        if (success) setSuccess("")
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <UserPlus className="w-5 h-5 mr-2 text-indigo-600" />
                        Join a Class
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div>
                                <h3 className="text-green-800 font-medium text-sm">
                                    Success!
                                </h3>
                                <p className="text-green-700 text-sm mt-0.5">
                                    {success}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <div>
                                <h3 className="text-red-800 font-medium text-sm">
                                    Error
                                </h3>
                                <p className="text-red-700 text-sm mt-0.5">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Class Code
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Hash className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter class code (e.g., ABC123)"
                                    value={classCode}
                                    onChange={handleInputChange}
                                    required
                                    className="block w-full pl-10 pr-3 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400 font-mono tracking-wide"
                                    maxLength={10}
                                    style={{ textTransform: "uppercase" }}
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !classCode.trim()}
                                className="flex-1 py-3 px-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Join Class"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
