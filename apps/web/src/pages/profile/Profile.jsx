import { useState, useEffect } from "react"
import { useAuthStore } from "../../store/authStore.js"
import { api } from "../../services/api.js"
import {
    User,
    Mail,
    Phone,
    Camera,
    Save,
    Calendar,
    Hash,
    Building,
    Award,
    CheckCircle,
    AlertCircle,
    Loader2,
    Edit3,
    Lock,
} from "lucide-react"

export default function Profile() {
    const { user, updateUser } = useAuthStore()
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phoneNumber: "",
        department: "",
        designation: "",
        year: "",
        branch: "",
    })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [messageType, setMessageType] = useState("")

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    })
    const [loadingPassword, setLoadingPassword] = useState(false)
    const [messagePassword, setMessagePassword] = useState("")
    const [messagePasswordType, setMessagePasswordType] = useState("")

    const syncFormData = (profile) => {
        setFormData({
            fullName: profile?.fullName || "",
            email: profile?.email || "",
            phoneNumber: profile?.phoneNumber || "",
            department: profile?.department || "",
            designation: profile?.designation || "",
            year:
                profile?.year !== undefined && profile?.year !== null
                    ? String(profile.year)
                    : "",
            branch: profile?.branch || "",
        })
    }

    useEffect(() => {
        if (user) {
            syncFormData(user)
        }
    }, [user])

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await api.get("/users/profile")
                const profile = response?.data?.data
                if (profile) {
                    updateUser(profile)
                    syncFormData(profile)
                }
            } catch (error) {
                console.error("Failed to load profile:", error)
            }
        }

        loadProfile()
    }, [updateUser])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage("")

        try {
            const payload = {
                fullName: formData.fullName,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
            }

            if (user?.role === "faculty") {
                payload.department = formData.department
                payload.designation = formData.designation
            }

            if (user?.role === "student") {
                payload.year = formData.year
                payload.branch = formData.branch
            }

            const response = await api.patch("/users/update-details", payload)
            const updatedProfile = response?.data?.data
            if (updatedProfile) {
                updateUser(updatedProfile)
                syncFormData(updatedProfile)
            }
            setMessage("Profile updated successfully!")
            setMessageType("success")
        } catch (error) {
            console.error("Error updating profile:", error)
            setMessage("Failed to update profile")
            setMessageType("error")
        } finally {
            setLoading(false)
        }
    }

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append("avatar", file)

        try {
            const response = await api.patch("/users/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })
            const updatedProfile = response?.data?.data
            if (updatedProfile) {
                updateUser(updatedProfile)
            }
            setMessage("Avatar updated successfully!")
            setMessageType("success")
        } catch (error) {
            console.error("Error updating avatar:", error)
            setMessage("Failed to update avatar")
            setMessageType("error")
        }
    }

    const handlePasswordUpdate = async (e) => {
        e.preventDefault()
        setLoadingPassword(true)
        setMessagePassword("")

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessagePassword("New passwords do not match")
            setMessagePasswordType("error")
            setLoadingPassword(false)
            return
        }

        try {
            await api.post("/users/change-password", {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
                confirmPassword: passwordData.confirmPassword,
            })
            setMessagePassword("Password updated successfully!")
            setMessagePasswordType("success")
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            })
        } catch (error) {
            console.error("Error updating password:", error)
            setMessagePassword(
                error.response?.data?.message || "Failed to update password"
            )
            setMessagePasswordType("error")
        } finally {
            setLoadingPassword(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <User className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        My Profile
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Manage your account information and preferences
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Picture & Info */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                            <div className="text-center">
                                <div className="relative inline-block mb-6">
                                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                                        {user?.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-16 h-16 text-white" />
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                                        <Camera className="w-5 h-5 text-white" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    {user?.fullName}
                                </h2>
                                <p className="text-gray-600 mb-6">
                                    {user?.email}
                                </p>

                                {/* Account Info */}
                                <div className="space-y-4 text-left">
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <Hash className="w-5 h-5 mr-2 text-blue-600" />
                                            Account Information
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">
                                                    Role
                                                </span>
                                                <span className="font-medium text-gray-900 capitalize">
                                                    {user?.role}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">
                                                    ID
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {user?.displayId}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">
                                                    Joined
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {new Date(
                                                        user?.createdAt
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Edit Profile & Change Password */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                            <div className="flex items-center mb-8">
                                <Edit3 className="w-6 h-6 mr-3 text-blue-600" />
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Edit Profile
                                </h3>
                            </div>

                            {/* Message */}
                            {message && (
                                <div
                                    className={`mb-6 rounded-2xl p-4 flex items-start space-x-3 ${
                                        messageType === "success"
                                            ? "bg-green-50 border border-green-200"
                                            : "bg-red-50 border border-red-200"
                                    }`}
                                >
                                    {messageType === "success" ? (
                                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div>
                                        <h3
                                            className={`font-medium ${
                                                messageType === "success"
                                                    ? "text-green-800"
                                                    : "text-red-800"
                                            }`}
                                        >
                                            {messageType === "success"
                                                ? "Success!"
                                                : "Error"}
                                        </h3>
                                        <p
                                            className={`text-sm mt-1 ${
                                                messageType === "success"
                                                    ? "text-green-700"
                                                    : "text-red-700"
                                            }`}
                                        >
                                            {message}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Full Name */}
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
                                                    fullName: e.target.value,
                                                })
                                            }
                                            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
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
                                                    email: e.target.value,
                                                })
                                            }
                                            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                        />
                                    </div>
                                </div>

                                {/* Phone Number */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="tel"
                                            placeholder="Enter your phone number"
                                            value={formData.phoneNumber}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    phoneNumber: e.target.value,
                                                })
                                            }
                                            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                {user?.role === "faculty" && (
                                    <>
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
                                                    placeholder="Enter your department"
                                                    value={formData.department}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            department:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Designation
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Award className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Enter your designation"
                                                    value={formData.designation}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            designation:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {user?.role === "student" && (
                                    <>
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
                                                    min="1"
                                                    max="8"
                                                    placeholder="Enter your year"
                                                    value={formData.year}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            year: e.target
                                                                .value,
                                                        })
                                                    }
                                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
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
                                                    placeholder="Enter your branch"
                                                    value={formData.branch}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            branch: e.target
                                                                .value,
                                                        })
                                                    }
                                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                <span>Update Profile</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Change Password Card */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                            <div className="flex items-center mb-8">
                                <Lock className="w-6 h-6 mr-3 text-blue-600" />
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Change Password
                                </h3>
                            </div>

                            {/* Message */}
                            {messagePassword && (
                                <div
                                    className={`mb-6 rounded-2xl p-4 flex items-start space-x-3 ${
                                        messagePasswordType === "success"
                                            ? "bg-green-50 border border-green-200"
                                            : "bg-red-50 border border-red-200"
                                    }`}
                                >
                                    {messagePasswordType === "success" ? (
                                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div>
                                        <h3
                                            className={`font-medium ${
                                                messagePasswordType ===
                                                "success"
                                                    ? "text-green-800"
                                                    : "text-red-800"
                                            }`}
                                        >
                                            {messagePasswordType === "success"
                                                ? "Success!"
                                                : "Error"}
                                        </h3>
                                        <p
                                            className={`text-sm mt-1 ${
                                                messagePasswordType ===
                                                "success"
                                                    ? "text-green-700"
                                                    : "text-red-700"
                                            }`}
                                        >
                                            {messagePassword}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <form
                                onSubmit={handlePasswordUpdate}
                                className="space-y-6"
                            >
                                {/* Current Password */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="Enter current password"
                                        value={passwordData.currentPassword}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                currentPassword: e.target.value,
                                            })
                                        }
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                        required
                                    />
                                </div>

                                {/* New Password */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="Enter new password (min 8 chars)"
                                        value={passwordData.newPassword}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                newPassword: e.target.value,
                                            })
                                        }
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                        required
                                        minLength={8}
                                    />
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="Confirm new password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                confirmPassword: e.target.value,
                                            })
                                        }
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                                        required
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={loadingPassword}
                                        className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                                    >
                                        {loadingPassword ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>
                                                    Updating Password...
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4" />
                                                <span>Update Password</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
