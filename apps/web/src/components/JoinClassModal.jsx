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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_60px_rgba(15,23,42,0.3)] animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-slate-50 to-indigo-50/80 border-b border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center text-xl font-black tracking-tight text-slate-900">
                            <UserPlus className="mr-2 h-5 w-5 text-primary-600" />
                            Join Classroom
                        </h2>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                        Enter your class code to join and access classwork.
                    </p>
                </div>

                <div className="p-6">
                    {success && (
                        <div className="mb-6 flex items-start space-x-3 rounded-xl border border-green-200 bg-green-50 p-4">
                            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                            <div>
                                <h3 className="text-sm font-semibold text-green-800">
                                    Joined successfully
                                </h3>
                                <p className="mt-0.5 text-sm text-green-700">
                                    {success}
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 flex items-start space-x-3 rounded-xl border border-red-200 bg-red-50 p-4">
                            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                            <div>
                                <h3 className="text-sm font-semibold text-red-800">
                                    Unable to join class
                                </h3>
                                <p className="mt-0.5 text-sm text-red-700">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Class Code
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Hash className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter class code (e.g., ABC123)"
                                    value={classCode}
                                    onChange={handleInputChange}
                                    required
                                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-base font-mono tracking-wide text-slate-900 placeholder-slate-400 transition-all focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                                    maxLength={10}
                                    style={{ textTransform: "uppercase" }}
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !classCode.trim()}
                                className="flex-1 rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    </span>
                                ) : (
                                    "Join"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
