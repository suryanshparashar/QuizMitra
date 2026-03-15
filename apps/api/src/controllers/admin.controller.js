import { asyncHandler, ApiError, ApiResponse } from "../utils/index.js"
import { User } from "../models/user.model.js"
import { Admin } from "../models/admin.model.js"
import { Class } from "../models/class.model.js"
import { Quiz } from "../models/quiz.model.js"
import { QuizAttempt } from "../models/quizAttempt.model.js"

const ensureAdmin = (req) => {
    if (!["admin", "superadmin"].includes(req.user?.role)) {
        throw new ApiError(403, "Only admins can access this resource")
    }
}

const generateAdminAccessAndRefreshToken = async (adminId) => {
    const admin = await Admin.findById(adminId)
    if (!admin) {
        throw new ApiError(404, "Admin not found")
    }

    const accessToken = admin.generateAccessToken()
    const refreshToken = admin.generateRefreshToken()

    admin.refreshToken = refreshToken
    await admin.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
}

const loginAdmin = asyncHandler(async (req, res) => {
    const { identifier, email: emailField, password } = req.body
    const rawIdentifier = identifier || emailField

    if (!rawIdentifier || !password) {
        throw new ApiError(
            400,
            "Identifier (email / admin ID / superadmin ID) and password are required"
        )
    }

    const trimmed = String(rawIdentifier).trim()
    const upperTrimmed = trimmed.toUpperCase()

    // Match by email, adminId, or superAdminId
    const adminUser = await Admin.findOne({
        $or: [
            { email: trimmed.toLowerCase() },
            { adminId: upperTrimmed },
            { superAdminId: upperTrimmed },
        ],
    }).select("+password")

    if (!adminUser) {
        throw new ApiError(401, "Invalid admin credentials")
    }

    if (adminUser.accountStatus === "suspended") {
        throw new ApiError(401, "Account suspended. Contact administrator.")
    }

    if (adminUser.accountStatus === "deactivated") {
        throw new ApiError(401, "Account deactivated. Contact administrator.")
    }

    const isPasswordValid = await adminUser.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid admin credentials")
    }

    if (!adminUser.isEmailVerified) {
        throw new ApiError(401, "Please verify your email before logging in")
    }

    adminUser.lastLogin = new Date()
    await adminUser.save({ validateBeforeSave: false })

    const { accessToken, refreshToken } =
        await generateAdminAccessAndRefreshToken(adminUser._id)

    const loggedInAdmin = await Admin.findById(adminUser._id)

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInAdmin,
                    accessToken,
                    refreshToken,
                },
                "Admin login successful"
            )
        )
})

const getAdminDashboard = asyncHandler(async (req, res) => {
    ensureAdmin(req)

    const [
        totalUsers,
        totalFaculty,
        totalStudents,
        totalClasses,
        totalQuizzes,
        totalAttempts,
        classReps,
        facultyRows,
        studentRows,
    ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: "faculty" }),
        User.countDocuments({ role: "student" }),
        Class.countDocuments({}),
        Quiz.countDocuments({}),
        QuizAttempt.countDocuments({}),
        Class.distinct("classRepresentative", {
            classRepresentative: { $ne: null },
        }),
        User.aggregate([
            { $match: { role: "faculty" } },
            {
                $lookup: {
                    from: "classes",
                    localField: "_id",
                    foreignField: "faculty",
                    as: "classes",
                },
            },
            {
                $lookup: {
                    from: "quizzes",
                    localField: "_id",
                    foreignField: "userId",
                    as: "quizzes",
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    facultyId: 1,
                    classesCreated: { $size: "$classes" },
                    quizzesCreated: { $size: "$quizzes" },
                },
            },
            { $sort: { classesCreated: -1, quizzesCreated: -1, fullName: 1 } },
        ]),
        User.aggregate([
            { $match: { role: "student" } },
            {
                $lookup: {
                    from: "classes",
                    let: { studentId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $gt: [
                                        {
                                            $size: {
                                                $filter: {
                                                    input: "$students",
                                                    as: "enrolled",
                                                    cond: {
                                                        $and: [
                                                            {
                                                                $eq: [
                                                                    "$$enrolled.user",
                                                                    "$$studentId",
                                                                ],
                                                            },
                                                            {
                                                                $eq: [
                                                                    "$$enrolled.status",
                                                                    "active",
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                        0,
                                    ],
                                },
                            },
                        },
                    ],
                    as: "joinedClasses",
                },
            },
            {
                $lookup: {
                    from: "quizattempts",
                    localField: "_id",
                    foreignField: "student",
                    as: "quizAttempts",
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    studentId: 1,
                    classesJoined: { $size: "$joinedClasses" },
                    quizzesAttempted: { $size: "$quizAttempts" },
                },
            },
            { $sort: { quizzesAttempted: -1, classesJoined: -1, fullName: 1 } },
        ]),
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                overview: {
                    totalUsers,
                    totalFaculty,
                    totalStudents,
                    totalClassRepresentatives: classReps.length,
                    totalClasses,
                    totalQuizzes,
                    totalQuizAttempts: totalAttempts,
                },
                facultyStats: facultyRows,
                studentStats: studentRows,
            },
            "Admin dashboard data retrieved successfully"
        )
    )
})

const registerAdmin = asyncHandler(async (req, res) => {
    if (String(process.env.NODE_ENV || "development") !== "development") {
        throw new ApiError(
            403,
            "Admin registration is only allowed in development environment"
        )
    }

    const expectedRegistrationSecret =
        process.env.SUPERADMIN_REGISTRATION_SECRET ||
        process.env.ADMIN_REGISTRATION_KEY

    const adminKeyFromRequest =
        req.headers["x-superadmin-registration-secret"] ||
        req.headers["x-admin-registration-key"] ||
        req.body?.superadminRegistrationSecret ||
        req.body?.adminRegistrationKey

    if (!expectedRegistrationSecret) {
        throw new ApiError(
            500,
            "SUPERADMIN_REGISTRATION_SECRET is not configured on the server"
        )
    }

    if (
        !adminKeyFromRequest ||
        String(adminKeyFromRequest) !== String(expectedRegistrationSecret)
    ) {
        throw new ApiError(403, "Invalid admin registration key")
    }

    const {
        role = "admin",
        name,
        fullName,
        adminId,
        superAdminId,
        email,
        password,
        confirmPassword,
    } = req.body

    const normalizedRole = String(role || "admin")
        .toLowerCase()
        .trim()
    const normalizedName = String(name || fullName || "").trim()

    if (!["admin", "superadmin"].includes(normalizedRole)) {
        throw new ApiError(400, "Role must be admin or superadmin")
    }

    if (!normalizedName || !email || !password || !confirmPassword) {
        throw new ApiError(
            400,
            "name/fullName, email, password and confirmPassword are required"
        )
    }

    if (normalizedRole === "admin" && !adminId) {
        throw new ApiError(400, "adminId is required when role is admin")
    }

    if (normalizedRole === "superadmin" && !superAdminId) {
        throw new ApiError(
            400,
            "superAdminId is required when role is superadmin"
        )
    }

    if (password !== confirmPassword) {
        throw new ApiError(400, "Passwords do not match")
    }

    const [existingAdmin, existingUser] = await Promise.all([
        Admin.findOne({ email: email.toLowerCase() }),
        User.findOne({ email: email.toLowerCase() }),
    ])

    if (existingAdmin || existingUser) {
        throw new ApiError(409, "Account with this email already exists")
    }

    const normalizedAdminId = adminId
        ? String(adminId).toUpperCase().trim()
        : undefined
    const normalizedSuperAdminId = superAdminId
        ? String(superAdminId).toUpperCase().trim()
        : undefined

    if (normalizedAdminId || normalizedSuperAdminId) {
        const existingByIds = await Admin.findOne({
            $or: [
                ...(normalizedAdminId ? [{ adminId: normalizedAdminId }] : []),
                ...(normalizedSuperAdminId
                    ? [{ superAdminId: normalizedSuperAdminId }]
                    : []),
            ],
        })

        if (existingByIds) {
            throw new ApiError(409, "Admin ID or SuperAdmin ID already exists")
        }
    }

    const adminUser = await Admin.create({
        role: normalizedRole,
        name: normalizedName,
        ...(normalizedAdminId ? { adminId: normalizedAdminId } : {}),
        ...(normalizedSuperAdminId
            ? { superAdminId: normalizedSuperAdminId }
            : {}),
        email: email.toLowerCase().trim(),
        password,
        isEmailVerified: true,
        accountStatus: "active",
    })

    const createdAdmin = await Admin.findById(adminUser._id).select(
        "-password -refreshToken"
    )

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                createdAdmin,
                `${normalizedRole} registered successfully`
            )
        )
})

// ─── Superadmin guard ────────────────────────────────────────────────────────
const ensureSuperAdmin = (req) => {
    if (req.user?.role !== "superadmin") {
        throw new ApiError(403, "Only superadmins can access this resource")
    }
}

// ─── Superadmin dashboard overview ───────────────────────────────────────────
const getSuperAdminDashboard = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const [
        totalAdmins,
        totalSuperAdmins,
        activeAdmins,
        suspendedAdmins,
        totalUsers,
        totalFaculty,
        totalStudents,
        totalClasses,
        totalQuizzes,
        totalAttempts,
    ] = await Promise.all([
        Admin.countDocuments({ role: { $in: ["admin", "superadmin"] } }),
        Admin.countDocuments({ role: "superadmin" }),
        Admin.countDocuments({
            role: { $in: ["admin", "superadmin"] },
            accountStatus: "active",
        }),
        Admin.countDocuments({
            role: { $in: ["admin", "superadmin"] },
            accountStatus: "suspended",
        }),
        User.countDocuments({}),
        User.countDocuments({ role: "faculty" }),
        User.countDocuments({ role: "student" }),
        Class.countDocuments({}),
        Quiz.countDocuments({}),
        QuizAttempt.countDocuments({}),
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                overview: {
                    totalAdmins,
                    totalSuperAdmins,
                    activeAdmins,
                    suspendedAdmins,
                    totalUsers,
                    totalFaculty,
                    totalStudents,
                    totalClasses,
                    totalQuizzes,
                    totalAttempts,
                },
            },
            "Superadmin dashboard data retrieved successfully"
        )
    )
})

// ─── List admins (paginated + searchable) ────────────────────────────────────
const listAdmins = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
    const search = String(req.query.search || "").trim()

    const filter = { role: { $in: ["admin", "superadmin"] } }
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { adminId: { $regex: search, $options: "i" } },
            { superAdminId: { $regex: search, $options: "i" } },
        ]
    }

    const [admins, total] = await Promise.all([
        Admin.find(filter)
            .select(
                "name email role adminId superAdminId accountStatus lastLogin createdAt"
            )
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Admin.countDocuments(filter),
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                admins,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
            "Admins retrieved successfully"
        )
    )
})

// ─── Update admin account status ─────────────────────────────────────────────
const updateAdminStatus = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const { id } = req.params
    const { status } = req.body

    if (!["active", "suspended", "deactivated"].includes(status)) {
        throw new ApiError(
            400,
            "Status must be active, suspended, or deactivated"
        )
    }

    const target = await Admin.findById(id)
    if (!target) throw new ApiError(404, "Admin not found")
    if (target.role === "superadmin")
        throw new ApiError(403, "Cannot modify another superadmin's status")
    if (String(target._id) === String(req.user._id))
        throw new ApiError(400, "Cannot modify your own status")

    target.accountStatus = status
    await target.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { accountStatus: target.accountStatus },
                "Admin status updated"
            )
        )
})

// ─── Delete an admin account ──────────────────────────────────────────────────
const deleteAdmin = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const { id } = req.params
    const target = await Admin.findById(id)
    if (!target) throw new ApiError(404, "Admin not found")
    if (target.role === "superadmin")
        throw new ApiError(403, "Cannot delete another superadmin")
    if (String(target._id) === String(req.user._id))
        throw new ApiError(400, "Cannot delete your own account")

    await Admin.findByIdAndDelete(id)
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Admin deleted successfully"))
})

// ─── List users (paginated + searchable + filterable by role) ─────────────────
const listUsers = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
    const search = String(req.query.search || "").trim()
    const role = req.query.role

    const filter = {}
    if (role && ["faculty", "student"].includes(role)) filter.role = role
    if (search) {
        filter.$or = [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { facultyId: { $regex: search, $options: "i" } },
            { studentId: { $regex: search, $options: "i" } },
        ]
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .select(
                "fullName email role facultyId studentId accountStatus isEmailVerified createdAt"
            )
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        User.countDocuments(filter),
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
            "Users retrieved successfully"
        )
    )
})

// ─── Update user account status ───────────────────────────────────────────────
const updateUserStatus = asyncHandler(async (req, res) => {
    ensureSuperAdmin(req)

    const { id } = req.params
    const { status } = req.body

    if (!["active", "suspended", "deactivated"].includes(status)) {
        throw new ApiError(
            400,
            "Status must be active, suspended, or deactivated"
        )
    }

    const target = await User.findById(id)
    if (!target) throw new ApiError(404, "User not found")

    target.accountStatus = status
    await target.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { accountStatus: target.accountStatus },
                "User status updated"
            )
        )
})

export {
    getAdminDashboard,
    registerAdmin,
    loginAdmin,
    getSuperAdminDashboard,
    listAdmins,
    updateAdminStatus,
    deleteAdmin,
    listUsers,
    updateUserStatus,
}
