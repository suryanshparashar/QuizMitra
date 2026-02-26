import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../../store/authStore.js"
import {
    User,
    Mail,
    Lock,
    UserPlus,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle,
    Loader2,
    GraduationCap,
    Building,
    Hash,
    Calendar,
    Award,
    ChevronRight,
    ChevronLeft,
    KeyRound,
} from "lucide-react"

export default function Register() {
    const [formData, setFormData] = useState({
        role: "student",
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        facultyId: "",
        studentId: "",
        department: "",
        designation: "",
        year: "",
        branch: "",
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [step, setStep] = useState(1)

    // OTP Specific states
    const [otp, setOtp] = useState("")
    const [isOtpSent, setIsOtpSent] = useState(false)
    const [verificationToken, setVerificationToken] = useState(null)

    const { register, sendOtp, verifyOtp } = useAuthStore()

    const handleSendOTP = async () => {
        try {
            setLoading(true)
            setError("")
            await sendOtp(formData.email, formData.fullName)
            setIsOtpSent(true)
            setStep((prev) => prev + 1)
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    err.message ||
                    "Failed to send OTP"
            )
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOTP = async () => {
        try {
            setLoading(true)
            setError("")
            const response = await verifyOtp(formData.email, otp)
            if (response?.data?.verificationToken) {
                setVerificationToken(response.data.verificationToken)
                setStep((prev) => prev + 1)
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    err.message ||
                    "Failed to verify OTP"
            )
        } finally {
            setLoading(false)
        }
    }

    const handleNext = async () => {
        if (step === 2) {
            if (!formData.fullName || !formData.email) {
                setError("Please fill in all basic information fields")
                return
            }
            // Trigger OTP
            await handleSendOTP()
            return
        }
        if (step === 3) {
            if (!otp || otp.length !== 6) {
                setError("Please enter the 6-digit verification code")
                return
            }
            await handleVerifyOTP()
            return
        }
        if (step === 4) {
            if (formData.role === "student") {
                if (!formData.studentId || !formData.year || !formData.branch) {
                    setError("Please fill in all student details")
                    return
                }
            } else {
                if (
                    !formData.facultyId ||
                    !formData.department ||
                    !formData.designation
                ) {
                    setError("Please fill in all faculty details")
                    return
                }
            }
        }

        setError("")
        setStep((prev) => prev + 1)
    }

    const handlePrev = () => {
        setError("")
        setStep((prev) => prev - 1)
    }

    const isPasswordMatch =
        formData.password &&
        formData.confirmPassword &&
        formData.password === formData.confirmPassword
    const isPasswordMismatch =
        formData.confirmPassword &&
        formData.password !== formData.confirmPassword

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (!verificationToken) {
            setError(
                "Email verification token is missing. Please restart the process."
            )
            return
        }

        setLoading(true)
        setError("")

        try {
            await register({ ...formData, verificationToken })
            setSuccess(true)
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed")
            console.error("Registration error:", err.response?.data?.message)
            console.error("Registration error:", err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                                <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                Registration Successful!
                            </h1>
                            <p className="text-gray-600 text-lg mb-8">
                                Please check your email to verify your account
                                before signing in.
                            </p>
                            <Link to="/login">
                                <button className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                    Go to Login
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Join QuizMitra
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Create your account to get started
                    </p>
                </div>

                {/* Registration Form */}
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    {/* Progress Bar */}
                    <div className="bg-gray-50 border-b border-gray-100 px-8 py-4 flex items-center justify-between">
                        <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className={`w-3 h-3 rounded-full transition-colors ${
                                        step === i
                                            ? "bg-purple-600"
                                            : step > i
                                              ? "bg-purple-300"
                                              : "bg-gray-200"
                                    }`}
                                />
                            ))}
                        </div>
                        <span className="text-sm font-medium text-gray-500">
                            Step {step} of 5
                        </span>
                    </div>

                    <div className="p-8">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
                                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="text-red-800 font-medium">
                                        Registration Failed
                                    </h3>
                                    <p className="text-red-700 text-sm mt-1">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Step 1: Role Selection */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-semibold text-gray-900">
                                            Choose your role
                                        </h2>
                                        <p className="text-gray-500 mt-2">
                                            Select how you want to use QuizMitra
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            I am a
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <label
                                                className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                    formData.role === "student"
                                                        ? "border-purple-500 bg-purple-50"
                                                        : "border-gray-200 hover:border-gray-300"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value="student"
                                                    checked={
                                                        formData.role ===
                                                        "student"
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            role: e.target
                                                                .value,
                                                        })
                                                    }
                                                    className="sr-only"
                                                />
                                                <div className="flex items-center h-full">
                                                    <GraduationCap className="w-5 h-5 mr-3 text-purple-600 flex-shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900">
                                                            Student
                                                        </span>
                                                        <span className="text-xs text-gray-500 mt-1">
                                                            Join classes and
                                                            take quizzes
                                                        </span>
                                                    </div>
                                                </div>
                                            </label>
                                            <label
                                                className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                    formData.role === "faculty"
                                                        ? "border-purple-500 bg-purple-50"
                                                        : "border-gray-200 hover:border-gray-300"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value="faculty"
                                                    checked={
                                                        formData.role ===
                                                        "faculty"
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            role: e.target
                                                                .value,
                                                        })
                                                    }
                                                    className="sr-only"
                                                />
                                                <div className="flex items-center h-full">
                                                    <User className="w-5 h-5 mr-3 text-purple-600 flex-shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900">
                                                            Faculty
                                                        </span>
                                                        <span className="text-xs text-gray-500 mt-1">
                                                            Create classes and
                                                            grade quizzes
                                                        </span>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Basic Information */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-semibold text-gray-900">
                                            Basic Information
                                        </h2>
                                        <p className="text-gray-500 mt-2">
                                            Enter your personal details
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Full Name
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <User className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Enter your full name"
                                                    value={formData.fullName}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            fullName:
                                                                e.target.value,
                                                        })
                                                    }
                                                    required
                                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Mail className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="email"
                                                    placeholder="Enter your email"
                                                    value={formData.email}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            email: e.target
                                                                .value,
                                                        })
                                                    }
                                                    required
                                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: OTP Verification */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-semibold text-gray-900">
                                            Verify your email
                                        </h2>
                                        <p className="text-gray-500 mt-2">
                                            We've sent a 6-digit verification
                                            code to{" "}
                                            <span className="font-medium text-gray-900">
                                                {formData.email}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col items-center">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Verification Code
                                            </label>
                                            <div className="relative w-full max-w-[200px]">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <KeyRound className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="000000"
                                                    value={otp}
                                                    maxLength={6}
                                                    onChange={(e) =>
                                                        setOtp(
                                                            e.target.value.replace(
                                                                /\D/g,
                                                                ""
                                                            )
                                                        )
                                                    }
                                                    className="block w-full pl-10 pr-2 py-3 text-center text-xl tracking-[0.5em] font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-300"
                                                />
                                            </div>
                                        </div>
                                        <div className="text-center mt-6">
                                            <button
                                                type="button"
                                                onClick={handleSendOTP}
                                                className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                                            >
                                                Didn't receive the code? Resend
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Role-specific Fields */}
                            {step === 4 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-semibold text-gray-900">
                                            {formData.role === "faculty"
                                                ? "Faculty Details"
                                                : "Student Details"}
                                        </h2>
                                        <p className="text-gray-500 mt-2">
                                            Enter your academic information
                                        </p>
                                    </div>
                                    {/* Role-specific Fields */}
                                    {formData.role === "faculty" ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Faculty ID
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Hash className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter faculty ID"
                                                        value={
                                                            formData.facultyId
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                facultyId:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Department
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Building className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter department"
                                                        value={
                                                            formData.department
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                department:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Designation
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Award className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter designation"
                                                        value={
                                                            formData.designation
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                designation:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Student ID
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Hash className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Student ID"
                                                        value={
                                                            formData.studentId
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                studentId:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Year
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Calendar className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="number"
                                                        placeholder="Year"
                                                        value={formData.year}
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                year: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        required
                                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Branch
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Building className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Branch"
                                                        value={formData.branch}
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                branch: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        required
                                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 5: Password Fields */}
                            {step === 5 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-semibold text-gray-900">
                                            Secure your account
                                        </h2>
                                        <p className="text-gray-500 mt-2">
                                            Choose a strong password
                                        </p>
                                    </div>
                                    {/* Password Fields */}
                                    <div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Lock
                                                            className={`w-5 h-5 ${isPasswordMatch ? "text-green-500" : "text-gray-400"}`}
                                                        />
                                                    </div>
                                                    <input
                                                        type={
                                                            showPassword
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        placeholder="Create password"
                                                        value={
                                                            formData.password
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                password:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                        className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 transition-colors focus:bg-white text-gray-900 placeholder-gray-500 ${
                                                            isPasswordMatch
                                                                ? "border-green-500 focus:ring-green-500 focus:border-green-500 bg-green-50/30"
                                                                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                                                        }`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowPassword(
                                                                !showPassword
                                                            )
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

                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Confirm Password
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Lock
                                                            className={`w-5 h-5 ${isPasswordMatch ? "text-green-500" : isPasswordMismatch ? "text-red-500" : "text-gray-400"}`}
                                                        />
                                                    </div>
                                                    <input
                                                        type={
                                                            showConfirmPassword
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        placeholder="Confirm password"
                                                        value={
                                                            formData.confirmPassword
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                confirmPassword:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                        className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 transition-colors focus:bg-white text-gray-900 placeholder-gray-500 ${
                                                            isPasswordMatch
                                                                ? "border-green-500 focus:ring-green-500 focus:border-green-500 bg-green-50/30"
                                                                : isPasswordMismatch
                                                                  ? "border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50/30"
                                                                  : "border-gray-300 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                                                        }`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowConfirmPassword(
                                                                !showConfirmPassword
                                                            )
                                                        }
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        {showConfirmPassword ? (
                                                            <EyeOff className="w-5 h-5" />
                                                        ) : (
                                                            <Eye className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        {isPasswordMismatch && (
                                            <p className="text-red-500 text-sm mt-2 flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-1" />
                                                Passwords do not match
                                            </p>
                                        )}
                                        {isPasswordMatch && (
                                            <p className="text-green-600 text-sm mt-2 flex items-center">
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Passwords match
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex space-x-4 pt-6 mt-8 border-t border-gray-100">
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={handlePrev}
                                        className="w-1/3 py-3 px-4 bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        <span className="hidden sm:inline">
                                            Back
                                        </span>
                                    </button>
                                )}

                                {step < 5 ? (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        disabled={
                                            loading ||
                                            (step === 3 && otp.length !== 6)
                                        }
                                        className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>
                                                    {step === 3
                                                        ? "Verify Code"
                                                        : "Next Step"}
                                                </span>
                                                <ChevronRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading || isPasswordMismatch}
                                        className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Creating Account...</span>
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-5 h-5" />
                                                <span>Create Account</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Login Link */}
                <div className="mt-8 text-center">
                    <p className="text-gray-600">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                        >
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
