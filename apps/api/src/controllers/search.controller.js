// controllers/search.controller.js
import { User } from "../models/user.model.js"
import { Class } from "../models/class.model.js"
import { Quiz } from "../models/quiz.model.js"
import { ClassMessage } from "../models/classMessage.model.js"
import { QuizAttempt } from "../models/quizAttempt.model.js"
import { ApiResponse, ApiError, asyncHandler } from "../utils/index.js"
import mongoose from "mongoose"

// Global search across all entities
const searchGlobal = asyncHandler(async (req, res) => {
    const { query, page = 1, limit = 10 } = req.query

    if (!query || query.trim().length < 2) {
        throw new ApiError(400, "Search query must be at least 2 characters")
    }

    const searchTerm = query.trim()
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // ✅ Run parallel searches
    const [users, classes, quizzes, messages] = await Promise.all([
        searchUsersGlobal(searchTerm, req.user._id, 5),
        searchClassesGlobal(searchTerm, req.user, 5),
        searchQuizzesGlobal(searchTerm, req.user, 5),
        searchMessagesGlobal(searchTerm, req.user, 5),
    ])

    const results = {
        users: users.results,
        classes: classes.results,
        quizzes: quizzes.results,
        messages: messages.results,
        totalResults:
            users.total + classes.total + quizzes.total + messages.total,
        query: searchTerm,
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                results,
                "Global search completed successfully"
            )
        )
})

// Search classes
const searchClasses = asyncHandler(async (req, res) => {
    const {
        query,
        department,
        semester,
        year,
        status = "active",
        page = 1,
        limit = 20,
    } = req.query

    if (!query || query.trim().length < 2) {
        throw new ApiError(400, "Search query must be at least 2 characters")
    }

    const searchTerm = query.trim()
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // ✅ Build search filter
    const searchFilter = {
        $and: [
            {
                $or: [
                    { subjectName: { $regex: searchTerm, $options: "i" } },
                    { subjectCode: { $regex: searchTerm, $options: "i" } },
                    { classCode: { $regex: searchTerm, $options: "i" } },
                    { department: { $regex: searchTerm, $options: "i" } },
                ],
            },
            status === "active" ? { isArchived: false } : {},
        ],
    }

    // ✅ Add filters
    if (department) {
        searchFilter.$and.push({ department: department.toUpperCase() })
    }

    if (semester) {
        searchFilter.$and.push({
            semester: { $regex: semester, $options: "i" },
        })
    }

    if (year) {
        searchFilter.$and.push({ academicYear: { $regex: year } })
    }

    // ✅ Access control - show only classes user has access to
    if (req.user.role === "student") {
        searchFilter.$and.push({
            $or: [
                { "students.user": req.user._id, "students.status": "active" },
                { "settings.isPrivate": false },
            ],
        })
    }

    const [classes, totalCount] = await Promise.all([
        Class.find(searchFilter)
            .populate("faculty", "fullName email facultyId")
            .populate("students.user", "fullName studentId")
            .select(
                "subjectName subjectCode classCode semester department venue academicYear settings createdAt"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Class.countDocuments(searchFilter),
    ])

    // ✅ Enhance results with statistics
    const enhancedClasses = classes.map((cls) => ({
        ...cls,
        totalStudents: cls.students
            ? cls.students.filter((s) => s.status === "active").length
            : 0,
        canJoin: cls.settings?.allowStudentJoin && !cls.isArchived,
        isEnrolled:
            req.user.role === "student" &&
            cls.students?.some(
                (s) =>
                    s.user._id.toString() === req.user._id.toString() &&
                    s.status === "active"
            ),
    }))

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                classes: enhancedClasses,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalResults: totalCount,
                    hasNextPage:
                        parseInt(page) <
                        Math.ceil(totalCount / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                },
                filters: { department, semester, year, status },
            },
            "Class search completed successfully"
        )
    )
})

// Search quizzes
const searchQuizzes = asyncHandler(async (req, res) => {
    const {
        query,
        classId,
        status,
        difficulty,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
    } = req.query

    if (!query || query.trim().length < 2) {
        throw new ApiError(400, "Search query must be at least 2 characters")
    }

    const searchTerm = query.trim()
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // ✅ Build base search filter
    let searchFilter = {
        $and: [
            {
                $or: [
                    { title: { $regex: searchTerm, $options: "i" } },
                    { description: { $regex: searchTerm, $options: "i" } },
                    { tags: { $in: [new RegExp(searchTerm, "i")] } },
                ],
            },
        ],
    }

    // ✅ Add filters
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
        searchFilter.$and.push({
            classId: new mongoose.Types.ObjectId(classId),
        })
    }

    if (status) {
        searchFilter.$and.push({ status })
    }

    if (difficulty) {
        searchFilter.$and.push({ "requirements.difficultyLevel": difficulty })
    }

    if (dateFrom || dateTo) {
        const dateFilter = {}
        if (dateFrom) dateFilter.$gte = new Date(dateFrom)
        if (dateTo) dateFilter.$lte = new Date(dateTo)
        searchFilter.$and.push({ createdAt: dateFilter })
    }

    // ✅ Access control based on role
    if (req.user.role === "student") {
        // Students can only see published quizzes from their classes
        const studentClasses = await Class.find({
            "students.user": req.user._id,
            "students.status": "active",
        }).select("_id")

        searchFilter.$and.push({
            classId: { $in: studentClasses.map((c) => c._id) },
            status: "published",
        })
    } else if (req.user.role === "faculty") {
        // Faculty can see all quizzes from their classes
        const facultyClasses = await Class.find({
            faculty: req.user._id,
        }).select("_id")

        searchFilter.$and.push({
            classId: { $in: facultyClasses.map((c) => c._id) },
        })
    }

    const [quizzes, totalCount] = await Promise.all([
        Quiz.find(searchFilter)
            .populate("userId", "fullName email facultyId")
            .populate("classId", "subjectName subjectCode classCode")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Quiz.countDocuments(searchFilter),
    ])

    // ✅ Enhance results with computed fields
    const now = new Date()
    const enhancedQuizzes = await Promise.all(
        quizzes.map(async (quiz) => {
            const attemptCount = await QuizAttempt.countDocuments({
                quiz: quiz._id,
            })

            return {
                ...quiz,
                computedStatus: getQuizStatus(quiz, now),
                canTakeQuiz:
                    req.user.role === "student" &&
                    quiz.status === "published" &&
                    now >= new Date(quiz.scheduledAt) &&
                    now <= new Date(quiz.deadline),
                attemptCount,
                hasAttempted:
                    req.user.role === "student"
                        ? await QuizAttempt.exists({
                              quiz: quiz._id,
                              student: req.user._id,
                          })
                        : false,
            }
        })
    )

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                quizzes: enhancedQuizzes,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalResults: totalCount,
                    hasNextPage:
                        parseInt(page) <
                        Math.ceil(totalCount / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                },
                filters: { classId, status, difficulty, dateFrom, dateTo },
            },
            "Quiz search completed successfully"
        )
    )
})

// Search users
const searchUsers = asyncHandler(async (req, res) => {
    const {
        query,
        role,
        department,
        year,
        branch,
        classId,
        page = 1,
        limit = 20,
    } = req.query

    if (!query || query.trim().length < 2) {
        throw new ApiError(400, "Search query must be at least 2 characters")
    }

    const searchTerm = query.trim()
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // ✅ Build search filter
    const searchFilter = {
        $and: [
            {
                $or: [
                    { fullName: { $regex: searchTerm, $options: "i" } },
                    { email: { $regex: searchTerm, $options: "i" } },
                    { facultyId: { $regex: searchTerm, $options: "i" } },
                    { studentId: { $regex: searchTerm, $options: "i" } },
                ],
            },
            { accountStatus: "active" },
            { isEmailVerified: true },
        ],
    }

    // ✅ Role filter
    if (role && ["faculty", "student", "class-representative"].includes(role)) {
        searchFilter.$and.push({ role })
    }

    // ✅ Department filter (for faculty)
    if (department && role === "faculty") {
        searchFilter.$and.push({
            "facultyDetails.department": department.toUpperCase(),
        })
    }

    // ✅ Year/Branch filter (for students)
    if ((year || branch) && role !== "faculty") {
        const studentFilters = {}
        if (year) studentFilters["studentDetails.year"] = parseInt(year)
        if (branch)
            studentFilters["studentDetails.branch"] = branch.toUpperCase()
        searchFilter.$and.push(studentFilters)
    }

    // ✅ Class-specific search
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
        // Verify user has access to this class
        const classDoc = await Class.findById(classId)
        if (
            !classDoc ||
            (!classDoc.isFaculty(req.user._id) &&
                !classDoc.isStudent(req.user._id))
        ) {
            throw new ApiError(403, "Access denied to this class")
        }

        searchFilter.$and.push({
            $or: [
                { _id: classDoc.faculty },
                { _id: { $in: classDoc.students.map((s) => s.user) } },
            ],
        })
    }

    // ✅ Privacy controls - limit what students can see
    let selectFields = "fullName role avatar"
    if (req.user.role === "faculty") {
        selectFields +=
            " email facultyId studentId facultyDetails.department facultyDetails.designation studentDetails.year studentDetails.branch"
    } else {
        selectFields +=
            " facultyDetails.department studentDetails.year studentDetails.branch"
    }

    const [users, totalCount] = await Promise.all([
        User.find(searchFilter)
            .select(selectFields)
            .sort({ fullName: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        User.countDocuments(searchFilter),
    ])

    // ✅ Enhance user data
    const enhancedUsers = users.map((user) => ({
        ...user,
        displayId: user.role === "faculty" ? user.facultyId : user.studentId,
        displayName: `${user.fullName} (${user.role === "faculty" ? user.facultyId : user.studentId})`,
    }))

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users: enhancedUsers,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalResults: totalCount,
                    hasNextPage:
                        parseInt(page) <
                        Math.ceil(totalCount / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                },
                filters: { role, department, year, branch, classId },
            },
            "User search completed successfully"
        )
    )
})

// Search messages
const searchMessages = asyncHandler(async (req, res) => {
    const {
        query,
        classId,
        messageType,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
    } = req.query

    if (!query || query.trim().length < 2) {
        throw new ApiError(400, "Search query must be at least 2 characters")
    }

    const searchTerm = query.trim()
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // ✅ Build search filter
    let searchFilter = {
        $and: [
            {
                $or: [
                    { content: { $regex: searchTerm, $options: "i" } },
                    { tags: { $in: [new RegExp(searchTerm, "i")] } },
                ],
            },
            { isDeleted: false },
            { status: "active" },
        ],
    }

    // ✅ Class filter
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
        // Verify access to class
        const classDoc = await Class.findById(classId)
        if (
            !classDoc ||
            (!classDoc.isFaculty(req.user._id) &&
                !classDoc.isStudent(req.user._id))
        ) {
            throw new ApiError(403, "Access denied to this class")
        }
        searchFilter.$and.push({ class: new mongoose.Types.ObjectId(classId) })
    } else {
        // Search only in user's classes
        const userClasses = await getUserAccessibleClasses(req.user)
        searchFilter.$and.push({ class: { $in: userClasses } })
    }

    // ✅ Message type filter
    if (messageType) {
        searchFilter.$and.push({ messageType })
    }

    // ✅ Date range filter
    if (dateFrom || dateTo) {
        const dateFilter = {}
        if (dateFrom) dateFilter.$gte = new Date(dateFrom)
        if (dateTo) dateFilter.$lte = new Date(dateTo)
        searchFilter.$and.push({ createdAt: dateFilter })
    }

    const [messages, totalCount] = await Promise.all([
        ClassMessage.find(searchFilter)
            .populate("sender", "fullName email role studentId facultyId")
            .populate("class", "subjectName subjectCode classCode")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        ClassMessage.countDocuments(searchFilter),
    ])

    // ✅ Enhance message data
    const enhancedMessages = messages.map((message) => ({
        ...message,
        commentsCount: message.comments
            ? message.comments.filter((c) => !c.isDeleted).length
            : 0,
        reactionsCount: message.reactions ? message.reactions.length : 0,
        snippet:
            message.content.length > 100
                ? message.content.substring(0, 100) + "..."
                : message.content,
    }))

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                messages: enhancedMessages,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalResults: totalCount,
                    hasNextPage:
                        parseInt(page) <
                        Math.ceil(totalCount / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                },
                filters: { classId, messageType, dateFrom, dateTo },
            },
            "Message search completed successfully"
        )
    )
})

// Get search suggestions
const getSearchSuggestions = asyncHandler(async (req, res) => {
    const { query, type } = req.query

    if (!query || query.trim().length < 2) {
        return res.status(200).json(new ApiResponse(200, [], "No suggestions"))
    }

    const searchTerm = query.trim()
    let suggestions = []

    switch (type) {
        case "classes":
            suggestions = await getClassSuggestions(searchTerm, req.user)
            break
        case "users":
            suggestions = await getUserSuggestions(searchTerm, req.user)
            break
        case "quizzes":
            suggestions = await getQuizSuggestions(searchTerm, req.user)
            break
        default:
            suggestions = await getGlobalSuggestions(searchTerm, req.user)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                suggestions,
                "Search suggestions retrieved successfully"
            )
        )
})

// Get recent searches
const getRecentSearches = asyncHandler(async (req, res) => {
    // In a real app, you'd store search history in database
    // For now, return empty array
    return res
        .status(200)
        .json(
            new ApiResponse(200, [], "Recent searches retrieved successfully")
        )
})

// Save search query
const saveSearch = asyncHandler(async (req, res) => {
    const { query, type, results } = req.body

    // In a real app, you'd save search history to database
    // For now, just return success
    return res
        .status(200)
        .json(
            new ApiResponse(200, { saved: true }, "Search saved successfully")
        )
})

// ✅ Helper Functions

const searchUsersGlobal = async (searchTerm, currentUserId, limit) => {
    const users = await User.find({
        $and: [
            {
                $or: [
                    { fullName: { $regex: searchTerm, $options: "i" } },
                    { facultyId: { $regex: searchTerm, $options: "i" } },
                    { studentId: { $regex: searchTerm, $options: "i" } },
                ],
            },
            { _id: { $ne: currentUserId } },
            { accountStatus: "active" },
        ],
    })
        .select("fullName role facultyId studentId avatar")
        .limit(limit)
        .lean()

    return {
        results: users.map((user) => ({
            ...user,
            type: "user",
            displayId:
                user.role === "faculty" ? user.facultyId : user.studentId,
        })),
        total: users.length,
    }
}

const searchClassesGlobal = async (searchTerm, currentUser, limit) => {
    let filter = {
        $or: [
            { subjectName: { $regex: searchTerm, $options: "i" } },
            { subjectCode: { $regex: searchTerm, $options: "i" } },
            { classCode: { $regex: searchTerm, $options: "i" } },
        ],
        isArchived: false,
    }

    if (currentUser.role === "student") {
        filter.$and = [
            {
                $or: [
                    { "students.user": currentUser._id },
                    { "settings.isPrivate": false },
                ],
            },
        ]
    }

    const classes = await Class.find(filter)
        .select("subjectName subjectCode classCode semester")
        .populate("faculty", "fullName")
        .limit(limit)
        .lean()

    return {
        results: classes.map((cls) => ({
            ...cls,
            type: "class",
        })),
        total: classes.length,
    }
}

const searchQuizzesGlobal = async (searchTerm, currentUser, limit) => {
    const userClasses = await getUserAccessibleClasses(currentUser)

    const quizzes = await Quiz.find({
        $and: [
            {
                $or: [
                    { title: { $regex: searchTerm, $options: "i" } },
                    { description: { $regex: searchTerm, $options: "i" } },
                ],
            },
            { classId: { $in: userClasses } },
            currentUser.role === "student" ? { status: "published" } : {},
        ],
    })
        .select("title description status scheduledAt deadline")
        .populate("classId", "subjectName subjectCode")
        .limit(limit)
        .lean()

    return {
        results: quizzes.map((quiz) => ({
            ...quiz,
            type: "quiz",
        })),
        total: quizzes.length,
    }
}

const searchMessagesGlobal = async (searchTerm, currentUser, limit) => {
    const userClasses = await getUserAccessibleClasses(currentUser)

    const messages = await ClassMessage.find({
        $and: [
            { content: { $regex: searchTerm, $options: "i" } },
            { class: { $in: userClasses } },
            { isDeleted: false },
        ],
    })
        .select("content messageType createdAt")
        .populate("class", "subjectName subjectCode")
        .populate("sender", "fullName")
        .limit(limit)
        .lean()

    return {
        results: messages.map((message) => ({
            ...message,
            type: "message",
            snippet: message.content.substring(0, 100) + "...",
        })),
        total: messages.length,
    }
}

const getUserAccessibleClasses = async (user) => {
    if (user.role === "faculty") {
        const classes = await Class.find({ faculty: user._id }).select("_id")
        return classes.map((c) => c._id)
    } else {
        const classes = await Class.find({
            "students.user": user._id,
            "students.status": "active",
        }).select("_id")
        return classes.map((c) => c._id)
    }
}

const getQuizStatus = (quiz, currentTime) => {
    if (quiz.status === "draft") return "draft"
    if (quiz.status === "archived") return "archived"
    if (currentTime < new Date(quiz.scheduledAt)) return "scheduled"
    if (
        currentTime >= new Date(quiz.scheduledAt) &&
        currentTime <= new Date(quiz.deadline)
    )
        return "active"
    if (currentTime > new Date(quiz.deadline)) return "expired"
    return "unknown"
}

export {
    searchGlobal,
    searchClasses,
    searchQuizzes,
    searchUsers,
    searchMessages,
    getSearchSuggestions,
    getRecentSearches,
    saveSearch,
}
