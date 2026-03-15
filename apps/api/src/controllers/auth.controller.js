// controllers/auth.controller.js
import { asyncHandler, ApiResponse, ApiError } from "../utils/index.js"
import { User } from "../models/user.model.js"
import { Otp } from "../models/otp.model.js"
import {
    uploadOnCloudinary,
    sendVerificationEmail,
    sendOTPEmail,
} from "../utils/index.js"
import jwt from "jsonwebtoken"
import crypto from "crypto"

// ✅ Generate and Send OTP
const sendOtp = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body

    if (!email || !fullName) {
        throw new ApiError(400, "Email and full name are required to send OTP")
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
        throw new ApiError(409, "User with this email already exists")
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Save OTP to DB (upsert if exists)
    await Otp.findOneAndUpdate(
        { email: email.toLowerCase() },
        { otp: otpCode, createdAt: Date.now() },
        { upsert: true, new: true }
    )

    // Send Email
    await sendOTPEmail(email, fullName, otpCode)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "OTP sent successfully"))
})

// ✅ Verify OTP
const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body

    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required")
    }

    const otpRecord = await Otp.findOne({ email: email.toLowerCase() })

    if (!otpRecord) {
        throw new ApiError(
            400,
            "OTP expired or not found. Please request a new one."
        )
    }

    if (otpRecord.otp !== String(otp)) {
        throw new ApiError(400, "Invalid OTP")
    }

    // Generate a short-lived token to prove verification during registration
    const verificationToken = jwt.sign(
        { email: email.toLowerCase(), verified: true },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "30m" }
    )

    // Cleanup OTP
    await Otp.deleteOne({ email: email.toLowerCase() })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { verificationToken },
                "Email verified successfully"
            )
        )
})

// ✅ Fixed token generation
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found")
        }

        const accessToken = user.generateAccessToken() // ✅ Fixed method name
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        console.error("Token generation error:", error)
        throw new ApiError(500, "Token generation failed")
    }
}

// ✅ Enhanced registration with email verification
// // Simplified registration
const registerUser = asyncHandler(async (req, res) => {
    console.log("🔍 Registration request:", req.body)

    const {
        role,
        fullName,
        email,
        password,
        confirmPassword,
        verificationToken,
        // Student fields
        studentId,
        year,
        branch,
        // Faculty fields
        facultyId,
        department,
        designation,
    } = req.body

    // ✅ Basic validation
    if (!role || !fullName || !email || !password || !verificationToken) {
        throw new ApiError(
            400,
            "All required fields including verification token must be provided"
        )
    }

    if (password !== confirmPassword) {
        throw new ApiError(400, "Passwords do not match")
    }

    // ✅ Verify OTP Verification Token
    try {
        const decodedToken = jwt.verify(
            verificationToken,
            process.env.ACCESS_TOKEN_SECRET
        )
        if (
            decodedToken.email !== email.toLowerCase() ||
            !decodedToken.verified
        ) {
            throw new ApiError(
                400,
                "Email verification proof is invalid or mismatched"
            )
        }
    } catch (error) {
        throw new ApiError(
            400,
            "Invalid or expired email verification token. Please verify email again."
        )
    }

    // ✅ Role-specific validation
    if (role === "student" && (!studentId || !year || !branch)) {
        throw new ApiError(
            400,
            "Student ID, year, and branch are required for students"
        )
    }

    if (role === "faculty" && (!facultyId || !department || !designation)) {
        throw new ApiError(
            400,
            "Faculty ID, department, and designation are required for faculty"
        )
    }

    // ✅ Check if user exists
    const existingUser = await User.findOne({
        $or: [
            { email: email.toLowerCase() },
            ...(facultyId ? [{ facultyId: facultyId.toUpperCase() }] : []),
            ...(studentId ? [{ studentId: studentId.toUpperCase() }] : []),
        ],
    })

    if (existingUser) {
        throw new ApiError(409, "User with this email or ID already exists")
    }

    // ✅ Create user
    const userData = {
        role,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password,
        ...(role === "student" && {
            studentId: studentId.toUpperCase().trim(),
            year: parseInt(year),
            branch: branch.toUpperCase().trim(),
        }),
        ...(role === "faculty" && {
            facultyId: facultyId.toUpperCase().trim(),
            department: department.toUpperCase().trim(),
            designation: designation.trim(),
        }),
        isEmailVerified: true,
        accountStatus: "active",
    }

    const user = await User.create(userData)
    const createdUser = await User.findById(user._id)

    if (!createdUser) {
        throw new ApiError(500, "Failed to create user")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { user: createdUser },
                "User registered successfully"
            )
        )
})

// ✅ Email verification endpoint
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params

    if (!token) {
        throw new ApiError(400, "Verification token is required")
    }

    const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() },
    })

    if (!user) {
        throw new ApiError(400, "Invalid or expired verification token")
    }

    // ✅ Verify the user
    user.isEmailVerified = true
    user.accountStatus = "active"
    user.emailVerificationToken = undefined
    user.emailVerificationExpires = undefined

    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Email verified successfully! You can now log in."
            )
        )
})

// ✅ Resend verification email
const resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body

    if (!email) {
        throw new ApiError(400, "Email is required")
    }

    const user = await User.findOne({
        email: email.toLowerCase(),
        isEmailVerified: false,
    })

    if (!user) {
        throw new ApiError(404, "User not found or email already verified")
    }

    // ✅ Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex")
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    user.emailVerificationToken = emailVerificationToken
    user.emailVerificationExpires = emailVerificationExpires

    await user.save({ validateBeforeSave: false })

    // ✅ Send new verification email
    try {
        await sendVerificationEmail(
            user.email,
            user.fullName,
            emailVerificationToken
        )

        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "Verification email sent successfully")
            )
    } catch (error) {
        console.error("Email sending failed:", error)
        throw new ApiError(500, "Failed to send verification email")
    }
})

// ✅ Enhanced login with email verification check
const loginUser = asyncHandler(async (req, res) => {
    const { identifier, email, password } = req.body
    const loginIdentifier = String(identifier || email || "").trim()

    console.log("🔍 Login attempt for:", loginIdentifier)

    // ✅ Validation
    if (!loginIdentifier) {
        throw new ApiError(400, "Email or faculty/student ID is required")
    }
    if (!password) throw new ApiError(400, "Password is required")

    console.log("🔍 Looking up user:", loginIdentifier)

    const normalizedIdentifier = loginIdentifier.toUpperCase()
    const loginQuery = loginIdentifier.includes("@")
        ? { email: loginIdentifier.toLowerCase() }
        : {
              $or: [
                  { facultyId: normalizedIdentifier },
                  { studentId: normalizedIdentifier },
                  { email: loginIdentifier.toLowerCase() },
              ],
          }

    // ✅ Find user
    const user = await User.findOne(loginQuery).select("+password") // Explicitly include password

    if (!user) {
        throw new ApiError(401, "Invalid credentials")
    }

    console.log("🔍 User found:", user.email)

    // ✅ Check account status
    if (user.accountStatus === "suspended") {
        throw new ApiError(401, "Account suspended. Contact administrator.")
    }

    if (user.accountStatus === "deactivated") {
        throw new ApiError(401, "Account deactivated. Contact administrator.")
    }

    console.log("🔍 Account status:", user.accountStatus)

    // ✅ Check if account is locked
    if (user.isLocked) {
        console.log("🔍 Account is locked due to multiple failed attempts")
        throw new ApiError(
            401,
            "Account temporarily locked due to too many failed login attempts"
        )
    }

    console.log("🔍 Verifying password for:", user.email)

    // ✅ Verify password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        // ✅ Increment login attempts
        // user.incLoginAttempts()
        // await user.save({ validateBeforeSave: false })

        console.log("🔍 Invalid password attempt for:", user.email)
        throw new ApiError(401, "Invalid credentials")
    }

    console.log("🔍 Password verified for:", user.email)

    // ✅ Check email verification
    if (!user.isEmailVerified) {
        throw new ApiError(401, "Please verify your email before logging in")
    }

    // ✅ Reset login attempts on successful login
    // user.unlockAccount()
    user.lastLogin = new Date()
    await user.save({ validateBeforeSave: false })

    console.log("🔍 Generating tokens for:", user.email)

    // ✅ Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    )

    console.log("🔍 Tokens generated for:", user.email)

    // ✅ Get user data without sensitive fields
    const loggedInUser = await User.findById(user._id)

    // ✅ Set secure cookies
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }

    console.log("🔍 Setting cookies for:", user.email)

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "Login successful"
            )
        )
})

// ✅ Enhanced logout
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    )

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "Logged out successfully"))
})

// ✅ Enhanced refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token required")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token expired or used")
        }

        // ✅ Check account status
        if (!user.isActive) {
            throw new ApiError(401, "Account not active")
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshToken(user._id)

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

// ✅ Enhanced password change
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body

    // ✅ Validation
    if (!currentPassword || !newPassword) {
        throw new ApiError(
            400,
            "Current password and new password are required"
        )
    }

    if (newPassword !== confirmPassword) {
        throw new ApiError(400, "New password and confirm password don't match")
    }

    if (newPassword.length < 8) {
        throw new ApiError(
            400,
            "New password must be at least 8 characters long"
        )
    }

    const user = await User.findById(req.user?._id).select("+password")

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const isCurrentPasswordCorrect =
        await user.isPasswordCorrect(currentPassword)

    if (!isCurrentPasswordCorrect) {
        throw new ApiError(401, "Current password is incorrect")
    }

    // ✅ Check if new password is same as current
    const isSamePassword = await user.isPasswordCorrect(newPassword)
    if (isSamePassword) {
        throw new ApiError(
            400,
            "New password must be different from current password"
        )
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: true })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

export {
    sendOtp,
    verifyOtp,
    generateAccessAndRefreshToken,
    registerUser,
    verifyEmail,
    resendVerificationEmail,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
}
