// controllers/quiz.controller.js
import { Class } from "../models/class.model.js"
import { Quiz } from "../models/quiz.model.js"
import { QuizAttempt } from "../models/quizAttempt.model.js"
import { User } from "../models/user.model.js"
import { asyncHandler, ApiError, ApiResponse } from "../utils/index.js"
import { generateQuestionsFromPDF } from "../services/ai.service.js"
import mongoose from "mongoose"

// ✅ Enhanced PDF quiz generation
const generateQuizFromPDF = asyncHandler(async (req, res) => {
    // ✅ Validate faculty role
    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty members can generate quizzes")
    }

    // ✅ Get data from request body (not params)
    const {
        classId,
        title,
        description,
        requirements,
        duration,
        scheduledAt,
        deadline,
        tags = [],
        settings = {},
    } = req.body

    // ✅ Enhanced validation
    if (!classId) {
        throw new ApiError(400, "Class ID is required")
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(400, "Invalid class ID format")
    }

    if (
        !title ||
        !description ||
        !requirements ||
        !duration ||
        !scheduledAt ||
        !deadline
    ) {
        throw new ApiError(400, "All required fields must be provided")
    }

    if (!req.file) {
        throw new ApiError(400, "PDF file is required")
    }

    // ✅ Validate file type and size
    if (req.file.mimetype !== "application/pdf") {
        throw new ApiError(400, "Only PDF files are allowed")
    }

    if (req.file.size > 10 * 1024 * 1024) {
        // 10MB
        throw new ApiError(400, "PDF file size cannot exceed 10MB")
    }

    // ✅ Verify class exists and user has permission
    const classDoc = await Class.findById(classId)
    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    if (!classDoc.isFaculty(req.user._id)) {
        throw new ApiError(
            403,
            "You can only create quizzes for your own classes"
        )
    }

    if (classDoc.isArchived) {
        throw new ApiError(400, "Cannot create quizzes in archived classes")
    }

    // ✅ Parse and validate requirements
    let parsedRequirements
    try {
        parsedRequirements =
            typeof requirements === "string"
                ? JSON.parse(requirements)
                : requirements
    } catch (error) {
        throw new ApiError(400, "Invalid requirements format")
    }

    // ✅ Validate requirements structure
    const requiredFields = [
        "numQuestions",
        "difficultyLevel",
        "questionTypes",
        "topics",
        "marksPerQuestion",
        "totalMarks",
    ]
    for (const field of requiredFields) {
        if (!parsedRequirements[field]) {
            throw new ApiError(400, `Requirements must include ${field}`)
        }
    }

    // ✅ Validate dates
    const scheduledDate = new Date(scheduledAt)
    const deadlineDate = new Date(deadline)
    const now = new Date()

    if (isNaN(scheduledDate.getTime()) || isNaN(deadlineDate.getTime())) {
        throw new ApiError(400, "Invalid date format")
    }

    if (scheduledDate <= now) {
        throw new ApiError(400, "Scheduled time must be in the future")
    }

    if (deadlineDate <= scheduledDate) {
        throw new ApiError(400, "Deadline must be after scheduled time")
    }

    // ✅ Validate duration
    const durationNum = parseInt(duration, 10)
    if (isNaN(durationNum) || durationNum < 5 || durationNum > 480) {
        throw new ApiError(400, "Duration must be between 5 and 480 minutes")
    }

    // ✅ Check for duplicate quiz title in same class
    const existingQuiz = await Quiz.findOne({
        classId: classId,
        title: title.trim(),
        userId: req.user._id,
    })

    if (existingQuiz) {
        throw new ApiError(
            409,
            "A quiz with this title already exists in this class"
        )
    }

    // ✅ Generate questions from PDF
    let generatedQuestions
    try {
        console.log(
            `Generating ${parsedRequirements.numQuestions} questions from PDF...`
        )
        generatedQuestions = await generateQuestionsFromPDF(
            req.file.buffer,
            parsedRequirements
        )

        if (!generatedQuestions || generatedQuestions.length === 0) {
            throw new ApiError(
                500,
                "No questions could be generated from the PDF"
            )
        }

        if (generatedQuestions.length !== parsedRequirements.numQuestions) {
            console.warn(
                `Expected ${parsedRequirements.numQuestions} questions, got ${generatedQuestions.length}`
            )
        }
    } catch (error) {
        console.error("AI generation error:", error)

        if (error.message?.includes("timeout")) {
            throw new ApiError(
                408,
                "AI processing timed out. Please try with a smaller PDF."
            )
        }

        if (error.message?.includes("quota")) {
            throw new ApiError(
                429,
                "AI service quota exceeded. Please try again later."
            )
        }

        if (error instanceof ApiError) {
            throw error
        }

        throw new ApiError(
            500,
            "Failed to generate questions from PDF. Please try again."
        )
    }

    // ✅ Create quiz with all required fields
    const quiz = new Quiz({
        userId: req.user._id,
        classId: classId,
        title: title.trim(),
        description: description.trim(),
        input: req.file.originalname, // ✅ Required field
        inputType: "pdf", // ✅ Add input type
        requirements: {
            numQuestions: parsedRequirements.numQuestions,
            difficultyLevel: parsedRequirements.difficultyLevel,
            questionTypes: parsedRequirements.questionTypes,
            topics: parsedRequirements.topics,
            marksPerQuestion: parsedRequirements.marksPerQuestion,
            totalMarks: parsedRequirements.totalMarks,
        },
        questions: generatedQuestions,
        duration: durationNum,
        scheduledAt: scheduledDate,
        deadline: deadlineDate,
        tags: Array.isArray(tags) ? tags : [],
        settings: {
            attemptsAllowed: settings.attemptsAllowed || 1,
            shuffleQuestions: settings.shuffleQuestions || false,
            shuffleOptions: settings.shuffleOptions || false,
            showCorrectAnswers: settings.showCorrectAnswers !== false, // default true
            showScoreImmediately: settings.showScoreImmediately !== false, // default true
            allowBackNavigation: settings.allowBackNavigation !== false, // default true
            passingScore: settings.passingScore || 60,
            autoSubmit: settings.autoSubmit !== false, // default true
            ...settings,
        },
        status: "draft",
        category: parsedRequirements.category || "quiz",
    })

    await quiz.save()

    // ✅ Populate with correct field names
    await quiz.populate([
        {
            path: "userId",
            select: "fullName email facultyId",
        },
        {
            path: "classId",
            select: "subjectName subjectCode classSlot semester classCode", // ✅ Fixed field name
        },
    ])

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                quiz,
                `Quiz "${quiz.title}" generated successfully with ${quiz.questions.length} questions`
            )
        )
})

// ✅ Enhanced get quiz
const getQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params

    // ✅ Validate quiz ID
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    // ✅ Find quiz with proper population
    const quiz = await Quiz.findById(quizId)
        .populate("userId", "fullName email facultyId")
        .populate("classId", "subjectName subjectCode classSlot faculty")

    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    // ✅ Get class document for access control
    const classDoc = await Class.findById(quiz.classId._id)
    if (!classDoc) {
        throw new ApiError(404, "Associated class not found")
    }

    // ✅ Enhanced access control
    let hasAccess = false
    let canViewAnswers = false

    if (req.user.role === "faculty") {
        hasAccess = classDoc.isFaculty(req.user._id)
        canViewAnswers = hasAccess // Faculty can see answers
    } else {
        // Students can only access published quizzes in their classes
        hasAccess =
            classDoc.isStudent(req.user._id) && quiz.status === "published"
        canViewAnswers = false // Students never see correct answers in getQuiz
    }

    if (!hasAccess) {
        throw new ApiError(403, "You don't have access to this quiz")
    }

    // ✅ Create safe response object
    const responseQuiz = quiz.toObject()

    // ✅ Filter questions based on user role and quiz timing
    if (!canViewAnswers) {
        responseQuiz.questions = responseQuiz.questions.map((question) => {
            const { correctAnswer, correctOptions, ...safeQuestion } = question
            return safeQuestion
        })
    }

    // ✅ Add computed fields for frontend
    const now = new Date()
    responseQuiz.computedStatus = getQuizStatus(quiz, now)
    responseQuiz.canTakeQuiz = canUserTakeQuiz(quiz, req.user, now)
    responseQuiz.timeUntilStart = quiz.scheduledAt > now ? quiz.scheduledAt - now : 0
    responseQuiz.timeRemaining = quiz.deadline > now ? quiz.deadline - now : 0

    return res
        .status(200)
        .json(new ApiResponse(200, responseQuiz, "Quiz retrieved successfully"))
})

// ✅ Enhanced publish quiz
const publishQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params

    // ✅ Validate quiz ID
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    const quiz = await Quiz.findById(quizId).populate(
        "classId",
        "faculty isArchived subjectName"
    )

    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    // ✅ Verify quiz creator
    if (quiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only the quiz creator can publish the quiz")
    }

    // ✅ Check if already published
    if (quiz.status === "published") {
        throw new ApiError(400, "Quiz is already published")
    }

    // ✅ Check if class is archived
    if (quiz.classId.isArchived) {
        throw new ApiError(400, "Cannot publish quiz in archived class")
    }

    // ✅ Comprehensive quiz validation
    const validationErrors = []

    // Check questions
    if (!quiz.questions || quiz.questions.length === 0) {
        validationErrors.push("Quiz must have at least one question")
    }

    // Check if questions match requirements
    if (quiz.questions.length !== quiz.requirements.numQuestions) {
        validationErrors.push(
            `Expected ${quiz.requirements.numQuestions} questions, found ${quiz.questions.length}`
        )
    }

    // Check each question for correctness
    quiz.questions.forEach((question, index) => {
        if (
            !question.questionText ||
            question.questionText.trim().length === 0
        ) {
            validationErrors.push(
                `Question ${index + 1} is missing question text`
            )
        }

        if (!question.options || question.options.length < 2) {
            validationErrors.push(
                `Question ${index + 1} must have at least 2 options`
            )
        }

        const hasCorrectAnswer =
            question.correctAnswer ||
            (question.correctOptions && question.correctOptions.length > 0)

        if (!hasCorrectAnswer) {
            validationErrors.push(
                `Question ${index + 1} is missing correct answer`
            )
        }
    })

    // ✅ Validate quiz timing
    const now = new Date()
    if (quiz.scheduledAt <= now) {
        validationErrors.push("Quiz scheduled time must be in the future")
    }

    if (quiz.deadline <= quiz.scheduledAt) {
        validationErrors.push("Quiz deadline must be after scheduled time")
    }

    if (validationErrors.length > 0) {
        throw new ApiError(
            400,
            `Cannot publish quiz: ${validationErrors.join(", ")}`
        )
    }

    // ✅ Update quiz status
    quiz.status = "published"
    quiz.isPublished = true
    quiz.publishedAt = new Date()

    await quiz.save()

    // ✅ Populate response data
    await quiz.populate([
        { path: "userId", select: "fullName email" },
        { path: "classId", select: "subjectName subjectCode classSlot" },
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, quiz, "Quiz published successfully"))
})

// ✅ Get user's quizzes
const getUserQuizzes = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, classId } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const query = { userId: req.user._id }

    if (status) {
        query.status = status
    }

    if (classId) {
        if (!mongoose.Types.ObjectId.isValid(classId)) {
            throw new ApiError(400, "Invalid class ID")
        }
        query.classId = classId
    }

    const quizzes = await Quiz.find(query)
        .populate("classId", "subjectName subjectCode classSlot")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))

    const totalQuizzes = await Quiz.countDocuments(query)
    const totalPages = Math.ceil(totalQuizzes / parseInt(limit))

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                quizzes,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalQuizzes,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                },
            },
            "User quizzes retrieved successfully"
        )
    )
})

// ✅ Delete quiz (draft only)
const deleteQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (quiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only the quiz creator can delete the quiz")
    }

    if (quiz.status !== "draft") {
        throw new ApiError(400, "Only draft quizzes can be deleted")
    }

    await Quiz.findByIdAndDelete(quizId)

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Quiz deleted successfully"))
})

// ✅ Helper functions
const getQuizStatus = (quiz, currentTime) => {
    if (quiz.status === "draft") return "draft"
    if (quiz.status === "archived") return "archived"

    if (currentTime < quiz.scheduledAt) return "scheduled"
    if (currentTime >= quiz.scheduledAt && currentTime <= quiz.deadline)
        return "active"
    if (currentTime > quiz.deadline) return "expired"

    return "unknown"
}

const canUserTakeQuiz = (quiz, user, currentTime) => {
    if (quiz.status !== "published") return false
    if (user.role === "faculty") return false // Faculty don't take quizzes
    if (currentTime < quiz.scheduledAt || currentTime > quiz.deadline)
        return false

    return true
}

// ✅ Create quiz manually (without PDF)
const createQuizManual = asyncHandler(async (req, res) => {
    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty members can create quizzes")
    }

    const {
        classId,
        title,
        description,
        questions,
        duration,
        scheduledAt,
        deadline,
        settings = {},
    } = req.body

    // ✅ Validation
    if (
        !classId ||
        !title ||
        !description ||
        !questions ||
        !duration ||
        !scheduledAt ||
        !deadline
    ) {
        throw new ApiError(400, "All required fields must be provided")
    }

    if (!Array.isArray(questions) || questions.length === 0) {
        throw new ApiError(400, "At least one question is required")
    }

    // ✅ Verify class access
    const classDoc = await Class.findById(classId)
    if (!classDoc || !classDoc.isFaculty(req.user._id)) {
        throw new ApiError(
            403,
            "You can only create quizzes for your own classes"
        )
    }

    // ✅ Calculate requirements
    const totalMarks = questions.reduce((sum, q) => sum + (q.points || 1), 0)

    const quiz = new Quiz({
        userId: req.user._id,
        classId,
        title: title.trim(),
        description: description.trim(),
        input: "manual",
        inputType: "manual",
        questions,
        duration: parseInt(duration),
        scheduledAt: new Date(scheduledAt),
        deadline: new Date(deadline),
        requirements: {
            numQuestions: questions.length,
            difficultyLevel: "mixed",
            questionTypes: [
                ...new Set(
                    questions.map((q) => q.questionType || "multiple-choice")
                ),
            ],
            topics: [],
            marksPerQuestion: Math.round(totalMarks / questions.length),
            totalMarks,
        },
        settings: {
            attemptsAllowed: settings.attemptsAllowed || 1,
            shuffleQuestions: settings.shuffleQuestions || false,
            showCorrectAnswers: settings.showCorrectAnswers !== false,
            ...settings,
        },
        status: "draft",
    })

    await quiz.save()
    await quiz.populate("classId", "subjectName subjectCode")

    return res
        .status(201)
        .json(new ApiResponse(201, quiz, "Quiz created successfully"))
})

// ✅ Get quizzes for a specific class
const getClassQuizzes = asyncHandler(async (req, res) => {
    const { classId } = req.params
    const { status, page = 1, limit = 20 } = req.query

    if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(400, "Invalid class ID")
    }

    // ✅ Verify access to class
    const classDoc = await Class.findById(classId)
    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    const hasAccess =
        classDoc.isFaculty(req.user._id) || classDoc.isStudent(req.user._id)
    if (!hasAccess) {
        throw new ApiError(403, "Access denied")
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const filter = { classId }

    // ✅ Status filter
    if (status) {
        filter.status = status
    }

    // ✅ Students can only see published quizzes
    if (req.user.role === "student") {
        filter.status = "published"
    }

    const [quizzes, totalCount] = await Promise.all([
        Quiz.find(filter)
            .populate("userId", "fullName facultyId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Quiz.countDocuments(filter),
    ])

    // ✅ Add computed fields
    const now = new Date()
    const enhancedQuizzes = quizzes.map((quiz) => ({
        ...quiz,
        computedStatus: getQuizStatus(quiz, now),
        canTake:
            req.user.role === "student" &&
            quiz.status === "published" &&
            now >= new Date(quiz.scheduledAt) &&
            now <= new Date(quiz.deadline),
    }))

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                quizzes: enhancedQuizzes,
                classInfo: {
                    _id: classDoc._id,
                    subjectName: classDoc.subjectName,
                    subjectCode: classDoc.subjectCode,
                },
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalQuizzes: totalCount,
                },
            },
            "Class quizzes retrieved successfully"
        )
    )
})

// ✅ Update quiz
const updateQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const updateData = req.body

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (quiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own quizzes")
    }

    if (quiz.status === "published") {
        throw new ApiError(400, "Cannot update published quiz")
    }

    // ✅ Update allowed fields
    const allowedFields = [
        "title",
        "description",
        "questions",
        "duration",
        "scheduledAt",
        "deadline",
        "settings",
        "tags",
    ]
    const filteredData = {}

    allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field]
        }
    })

    // ✅ Update requirements if questions changed
    if (filteredData.questions) {
        filteredData.requirements = {
            ...quiz.requirements,
            numQuestions: filteredData.questions.length,
            totalMarks: filteredData.questions.reduce(
                (sum, q) => sum + (q.points || 1),
                0
            ),
        }
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(
        quizId,
        { $set: filteredData },
        { new: true, runValidators: true }
    ).populate("classId", "subjectName subjectCode")

    return res
        .status(200)
        .json(new ApiResponse(200, updatedQuiz, "Quiz updated successfully"))
})

// ✅ Unpublish quiz
const unpublishQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (quiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only unpublish your own quizzes")
    }

    if (quiz.status !== "published") {
        throw new ApiError(400, "Quiz is not published")
    }

    // ✅ Check if quiz has started
    if (new Date() >= new Date(quiz.scheduledAt)) {
        throw new ApiError(
            400,
            "Cannot unpublish quiz that has already started"
        )
    }

    quiz.status = "draft"
    quiz.isPublished = false
    quiz.publishedAt = undefined

    await quiz.save()

    return res
        .status(200)
        .json(new ApiResponse(200, quiz, "Quiz unpublished successfully"))
})

// ✅ Duplicate quiz
const duplicateQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const { title, classId } = req.body

    const originalQuiz = await Quiz.findById(quizId)
    if (!originalQuiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (originalQuiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only duplicate your own quizzes")
    }

    const duplicatedQuiz = new Quiz({
        ...originalQuiz.toObject(),
        _id: undefined,
        title: title || `Copy of ${originalQuiz.title}`,
        classId: classId || originalQuiz.classId,
        status: "draft",
        isPublished: false,
        publishedAt: undefined,
        createdAt: undefined,
        updatedAt: undefined,
    })

    await duplicatedQuiz.save()
    await duplicatedQuiz.populate("classId", "subjectName subjectCode")

    return res
        .status(201)
        .json(
            new ApiResponse(201, duplicatedQuiz, "Quiz duplicated successfully")
        )
})

// ✅ Get quiz preview (faculty only)
const getQuizPreview = asyncHandler(async (req, res) => {
    const { quizId } = req.params

    const quiz = await Quiz.findById(quizId).populate(
        "classId",
        "subjectName subjectCode"
    )

    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (quiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only preview your own quizzes")
    }

    // ✅ Return full quiz with answers for preview
    return res
        .status(200)
        .json(new ApiResponse(200, quiz, "Quiz preview retrieved successfully"))
})

// ✅ Get quiz statistics
const getQuizStatistics = asyncHandler(async (req, res) => {
    const { quizId } = req.params

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (quiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Access denied")
    }

    // ✅ Get basic stats
    const [attemptCount, avgScore, completion] = await Promise.all([
        QuizAttempt.countDocuments({ quiz: quizId }),
        QuizAttempt.aggregate([
            { $match: { quiz: new mongoose.Types.ObjectId(quizId) } },
            { $group: { _id: null, avg: { $avg: "$percentage" } } },
        ]),
        QuizAttempt.countDocuments({ quiz: quizId }), // Could add completion rate logic
    ])

    const statistics = {
        totalAttempts: attemptCount,
        averageScore: avgScore[0]?.avg?.toFixed(2) || 0,
        completionRate: 100, // Placeholder
        passingRate: 0, // Calculate based on passing score
        difficulty:
            quiz.averageScore > 80
                ? "Easy"
                : quiz.averageScore > 60
                  ? "Medium"
                  : "Hard",
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                statistics,
                "Quiz statistics retrieved successfully"
            )
        )
})

// ✅ Export quiz data
const exportQuizData = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const { format = "json" } = req.query

    const quiz = await Quiz.findById(quizId).populate(
        "classId",
        "subjectName subjectCode"
    )

    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (quiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Access denied")
    }

    if (format === "pdf") {
        // Generate PDF (you'd implement PDF generation here)
        throw new ApiError(501, "PDF export not implemented yet")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, quiz, "Quiz data exported successfully"))
})

// ✅ Add to exports
export {
    generateQuizFromPDF,
    createQuizManual,
    getQuiz,
    getClassQuizzes,
    updateQuiz,
    publishQuiz,
    unpublishQuiz,
    duplicateQuiz,
    getQuizPreview,
    getQuizStatistics,
    exportQuizData,
    getUserQuizzes,
    deleteQuiz,
    getQuizStatus,
    canUserTakeQuiz,
}
