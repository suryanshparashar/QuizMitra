// controllers/user.controller.js
import { asyncHandler, ApiResponse, ApiError } from "../utils/index.js"
import { User } from "../models/user.model.js"
import { Class } from "../models/class.model.js"
import { uploadOnCloudinary } from "../utils/index.js"
import { createDevLogger } from "../utils/devLogger.js"
import mongoose from "mongoose"

const devLog = createDevLogger("controller.user.avatar")

// ✅ Get current user profile
const getCurrentUser = asyncHandler(async (req, res) => {
    // User is already available from verifyJWT middleware
    const user = await User.findById(req.user._id).select(
        "-password -refreshToken -emailVerificationToken -passwordResetToken"
    )

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    devLog.info("Profile fetched", {
        userId: String(user?._id || req.user?._id || ""),
        avatar: user?.avatar || null,
    })

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User profile retrieved successfully"))
})

// ✅ Get user by ID (public profile)
const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const user = await User.findById(userId).select(
        "fullName role facultyId studentId avatar department designation year branch"
    )

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    // ✅ Privacy check - only show public information
    const publicProfile = {
        _id: user._id,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        displayId: user.displayId,
    }

    // ✅ Add role-specific public information
    if (user.role === "faculty") {
        publicProfile.department = user.department
        publicProfile.designation = user.designation
    } else {
        publicProfile.year = user.year
        publicProfile.branch = user.branch
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                publicProfile,
                "User profile retrieved successfully"
            )
        )
})

// ✅ Update account details with proper schema fields
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email, phoneNumber, department, designation, year } =
        req.body

    const hasUpdates =
        fullName ||
        email ||
        phoneNumber ||
        department ||
        designation ||
        year ||
        branch

    if (!hasUpdates) {
        throw new ApiError(400, "At least one field is required for update")
    }

    // ✅ Get current user
    const currentUser = await User.findById(req.user._id)
    if (!currentUser) {
        throw new ApiError(404, "User not found")
    }

    // ✅ Validate email if provided
    if (email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailRegex.test(email)) {
            throw new ApiError(400, "Please enter a valid email address")
        }

        // Check for duplicate email
        if (email.toLowerCase() !== currentUser.email) {
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.user._id },
            })

            if (existingUser) {
                throw new ApiError(
                    409,
                    "Email already registered with another account"
                )
            }
        }
    }

    // ✅ Validate phone number if provided
    if (phoneNumber) {
        const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/
        if (!phoneRegex.test(phoneNumber)) {
            throw new ApiError(400, "Please enter a valid phone number")
        }
    }

    const updateData = {}

    if (fullName) updateData.fullName = fullName.trim()
    if (email) updateData.email = email.toLowerCase().trim()
    if (phoneNumber) updateData.phoneNumber = phoneNumber.trim()

    if (currentUser.role === "faculty") {
        if (department) updateData.department = department.toUpperCase().trim()
        if (designation) updateData.designation = designation.trim()
    } else if (currentUser.role === "student") {
        if (year !== undefined && year !== null && year !== "") {
            const parsedYear = parseInt(year, 10)
            if (Number.isNaN(parsedYear)) {
                throw new ApiError(400, "Year must be a valid number")
            }
            updateData.year = parsedYear
        }

        if (branch) {
            updateData.branch = branch.toUpperCase().trim()
        }
    }

    // ✅ Update user
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        {
            new: true,
            runValidators: true,
        }
    ).select(
        "-password -refreshToken -emailVerificationToken -passwordResetToken"
    )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "Account details updated successfully"
            )
        )
})

// ✅ Update user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Avatar file is required")
    }

    devLog.info("Avatar upload request received", {
        userId: String(req.user?._id || ""),
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
    })

    // ✅ Validate file type and size
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(req.file.mimetype)) {
        throw new ApiError(400, "Only JPEG, PNG, and WebP images are allowed")
    }

    if (req.file.size > 5 * 1024 * 1024) {
        throw new ApiError(400, "Avatar file size cannot exceed 5MB")
    }

    // ✅ Upload to cloud storage
    let uploadResult
    try {
        uploadResult = await uploadOnCloudinary(
            req.file.buffer,
            req.file.originalname
        )

        devLog.info("Cloudinary upload completed", {
            userId: String(req.user?._id || ""),
            secureUrl: uploadResult?.secure_url || null,
            fallbackUrl: uploadResult?.url || null,
            publicId: uploadResult?.public_id || null,
        })

        if (!uploadResult || !(uploadResult.secure_url || uploadResult.url)) {
            throw new Error("Upload failed")
        }
    } catch (error) {
        devLog.error("Avatar upload failed", {
            userId: String(req.user?._id || ""),
            message: error?.message,
            statusCode: error?.statusCode,
            httpCode: error?.http_code,
            name: error?.name,
        })
        console.error("Avatar upload error:", error)
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError(500, "Failed to upload avatar. Please try again.")
    }

    // ✅ Update user avatar
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: uploadResult.secure_url || uploadResult.url } },
        { new: true }
    ).select(
        "-password -refreshToken -emailVerificationToken -passwordResetToken"
    )

    devLog.info("Avatar persisted to MongoDB", {
        userId: String(updatedUser?._id || req.user?._id || ""),
        avatar: updatedUser?.avatar || null,
    })

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"))
})

// ✅ Remove avatar (set to default)
const removeUserAvatar = asyncHandler(async (req, res) => {
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user.fullName)}&background=4f46e5&color=ffffff&size=256`

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: defaultAvatar } },
        { new: true }
    ).select(
        "-password -refreshToken -emailVerificationToken -passwordResetToken"
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Avatar removed successfully"))
})

// ✅ Search users (for faculty to find students, etc.)
const searchUsers = asyncHandler(async (req, res) => {
    const {
        query,
        role,
        department,
        year,
        branch,
        page = 1,
        limit = 10,
    } = req.query

    if (!query || query.trim().length < 2) {
        throw new ApiError(400, "Search query must be at least 2 characters")
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10)

    // ✅ Build search filter
    const searchFilter = {
        $and: [
            // Text search
            {
                $or: [
                    { fullName: { $regex: query, $options: "i" } },
                    { email: { $regex: query, $options: "i" } },
                    { facultyId: { $regex: query, $options: "i" } },
                    { studentId: { $regex: query, $options: "i" } },
                ],
            },
            // Account status
            { accountStatus: "active" },
            { isEmailVerified: true },
        ],
    }

    // ✅ Add role filter
    if (role && ["faculty", "student"].includes(role)) {
        searchFilter.$and.push({ role })
    }

    // ✅ Add department filter (for faculty)
    if (department && role === "faculty") {
        searchFilter.$and.push({ department: department.toUpperCase() })
    }

    // ✅ Add year/branch filter (for students)
    if ((year || branch) && role !== "faculty") {
        const studentFilters = {}
        if (year) studentFilters.year = parseInt(year, 10)
        if (branch) studentFilters.branch = branch.toUpperCase()
        searchFilter.$and.push(studentFilters)
    }

    // ✅ Execute search
    const users = await User.find(searchFilter)
        .select(
            "fullName email role facultyId studentId avatar department designation year branch"
        )
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(parseInt(limit, 10))

    const totalUsers = await User.countDocuments(searchFilter)
    const totalPages = Math.ceil(totalUsers / parseInt(limit, 10))

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalUsers,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                },
            },
            "Users found successfully"
        )
    )
})

// ✅ Get user dashboard stats
const getUserDashboardStats = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const userRole = req.user.role

    let stats = {}

    if (userRole === "faculty") {
        // ✅ Faculty stats
        const [totalClasses, totalStudents] = await Promise.all([
            Class.countDocuments({ faculty: userId, isArchived: false }),
            Class.aggregate([
                { $match: { faculty: userId, isArchived: false } },
                { $project: { studentsCount: { $size: "$students" } } },
                { $group: { _id: null, total: { $sum: "$studentsCount" } } },
            ]),
        ])

        stats = {
            totalClasses,
            totalStudents: totalStudents[0]?.total || 0,
            userType: "faculty",
        }
    } else {
        // ✅ Student stats
        const [enrolledClasses] = await Promise.all([
            Class.countDocuments({
                "students.user": userId,
                "students.status": "active",
                isArchived: false,
            }),
        ])

        stats = {
            enrolledClasses,
            userType: userRole,
        }
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                stats,
                "User dashboard stats retrieved successfully"
            )
        )
})

// ✅ Update password (separate from auth controller for user management)
const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
        throw new ApiError(400, "All password fields are required")
    }

    if (newPassword !== confirmPassword) {
        throw new ApiError(400, "New password and confirm password don't match")
    }

    if (newPassword.length < 8) {
        throw new ApiError(400, "New password must be at least 8 characters")
    }

    const user = await User.findById(req.user._id).select("+password")

    const isCurrentPasswordValid = await user.isPasswordCorrect(currentPassword)
    if (!isCurrentPasswordValid) {
        throw new ApiError(400, "Current password is incorrect")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: true })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password updated successfully"))
})

// ✅ Deactivate account
const deactivateAccount = asyncHandler(async (req, res) => {
    const { password, reason } = req.body

    if (!password) {
        throw new ApiError(400, "Password is required to deactivate account")
    }

    const user = await User.findById(req.user._id).select("+password")

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(400, "Incorrect password")
    }

    // ✅ Check if user has active responsibilities
    if (user.role === "faculty") {
        const activeClasses = await Class.countDocuments({
            faculty: user._id,
            isArchived: false,
        })

        if (activeClasses > 0) {
            throw new ApiError(
                400,
                `Cannot deactivate account with ${activeClasses} active classes. Please archive them first.`
            )
        }
    }

    user.accountStatus = "deactivated"
    user.refreshToken = undefined
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Account deactivated successfully"))
})

export {
    getCurrentUser,
    getUserById,
    updateAccountDetails,
    updateUserAvatar,
    removeUserAvatar,
    searchUsers,
    getUserDashboardStats,
    updatePassword,
    deactivateAccount,
}
