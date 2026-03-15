import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../../store/authStore.js"
import { getDashboardPath } from "../../utils/getDashboardPath.js"
import {
    Lock,
    LogIn,
    Eye,
    EyeOff,
    AlertCircle,
    Loader2,
    Shield,
} from "lucide-react"
import { showToast } from "../../components/Toast.jsx"

export default function AdminLogin() {
    const [formData, setFormData] = useState({ identifier: "", password: "" })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()
    const { loginAdmin } = useAuthStore()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (loading) return

        setLoading(true)
        setError("")

        try {
            await loginAdmin(formData.identifier, formData.password)
            showToast.success("Admin login successful")
            const role = useAuthStore.getState().user?.role
            navigate(getDashboardPath(role))
        } catch (err) {
            const msg = err.response?.data?.message || "Admin login failed"
            setError(msg)
            showToast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Admin Portal
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Sign in with your admin/superadmin ID or email
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="p-8">
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
                                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="text-red-800 font-medium">
                                        Login Failed
                                    </h3>
                                    <p className="text-red-700 text-sm mt-1">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Admin/Superadmin ID or Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Shield className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        autoComplete="username"
                                        placeholder="Enter admin ID, superadmin ID, or email"
                                        value={formData.identifier}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                identifier: e.target.value,
                                            })
                                        }
                                        required
                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                password: e.target.value,
                                            })
                                        }
                                        required
                                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-medium rounded-xl hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Signing In...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4" />
                                        <span>Admin Sign In</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link
                        to="/login"
                        className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                        Back to standard login
                    </Link>
                </div>
            </div>
        </div>
    )
}
