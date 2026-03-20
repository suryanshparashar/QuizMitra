// controllers/quiz.controller.js
import { Class } from "../models/class.model.js"
import { Quiz } from "../models/quiz.model.js"
import { QuizAttempt } from "../models/quizAttempt.model.js"
import { User } from "../models/user.model.js"
import {
    asyncHandler,
    ApiError,
    ApiResponse,
    deleteFromCloudinary,
} from "../utils/index.js"
import { generateQuestions } from "../services/quizGraph.service.js"
import mongoose from "mongoose"
import { extractSourceContent } from "../services/documentProcessing.service.js"
import { ProcessedPdf } from "../models/processedPdf.model.js"
import {
    createContentVectors,
    joinVectorChunks,
} from "../services/contentVector.service.js"
import { createModel } from "../agents/utils/modelFactory.js"
import { sanitizeQuestionWithFormattingAgent } from "../agents/agents/formatting.agent.js"
import { createDevLogger } from "../utils/devLogger.js"

const MIN_DEADLINE_BUFFER_MINUTES = 10
const MAX_TOTAL_MARKS = 100
const MAX_STORED_EXTRACTED_CONTENT_CHARS = 250000
const MAX_STORED_VECTOR_CHUNKS = 250
const MIN_EXTRACTED_TEXT_LENGTH = 100
const ALLOWED_GENERATION_QUESTION_TYPES = new Set([
    "multiple-choice",
    "multiple-select",
    "true-false",
    "short-answer",
    "long-answer",
])
const devLog = createDevLogger("quiz.controller")

const parseAiJsonObject = (rawContent) => {
    const rawText = String(rawContent || "").trim()
    const cleaned = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()

    try {
        return JSON.parse(cleaned)
    } catch (error) {
        const objectMatch = cleaned.match(/\{[\s\S]*\}/)
        if (!objectMatch) {
            throw new Error("AI response did not contain a JSON object")
        }

        return JSON.parse(objectMatch[0])
    }
}

const calculateMarksPerQuestion = (totalMarks, numQuestions) => {
    const marks = Number(totalMarks)
    const count = Number(numQuestions)

    if (!Number.isFinite(marks) || !Number.isFinite(count) || count <= 0) {
        return 0
    }

    return Number((marks / count).toFixed(4))
}

const processPdfInBackground = async ({
    processedPdfId,
    fileBuffer,
    fileName,
    userId,
}) => {
    try {
        await ProcessedPdf.findByIdAndUpdate(processedPdfId, {
            progress: 20,
            status: "processing",
            errorMessage: "",
        })

        const extractedContent = await extractSourceContent({
            type: "pdf",
            data: fileBuffer,
            originalName: fileName,
        })

        const storedContent = String(extractedContent || "").slice(
            0,
            MAX_STORED_EXTRACTED_CONTENT_CHARS
        )

        if (storedContent.trim().length < MIN_EXTRACTED_TEXT_LENGTH) {
            throw new ApiError(
                422,
                "Unable to extract text. Handwritten notes are not supported. Please upload a typed or digital PDF."
            )
        }

        await ProcessedPdf.findByIdAndUpdate(processedPdfId, {
            progress: 70,
        })

        const vectorPayload = createContentVectors(storedContent, {
            maxChunks: MAX_STORED_VECTOR_CHUNKS,
        })

        if (!vectorPayload.vectors.length) {
            throw new ApiError(
                422,
                "Could not generate content vectors from extracted PDF text"
            )
        }

        await ProcessedPdf.findByIdAndUpdate(processedPdfId, {
            status: "completed",
            progress: 100,
            extractedContent: storedContent,
            vectorDimensions: vectorPayload.dimensions,
            contentVectors: vectorPayload.vectors,
            errorMessage: "",
            userId,
        })
    } catch (error) {
        await ProcessedPdf.findByIdAndUpdate(processedPdfId, {
            status: "failed",
            progress: 100,
            errorMessage: error?.message || "Failed to process PDF",
        })
    }
}

const processUploadedPdf = asyncHandler(async (req, res) => {
    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty members can process PDFs")
    }

    if (!req.file) {
        throw new ApiError(400, "PDF file is required")
    }

    if (req.file.mimetype !== "application/pdf") {
        throw new ApiError(400, "Only PDF files are allowed")
    }

    if (req.file.size > 10 * 1024 * 1024) {
        throw new ApiError(400, "PDF file size cannot exceed 10MB")
    }

    const processedPdf = await ProcessedPdf.create({
        userId: req.user._id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: "processing",
        progress: 5,
    })

    processPdfInBackground({
        processedPdfId: processedPdf._id,
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname,
        userId: req.user._id,
    })

    return res.status(202).json(
        new ApiResponse(
            202,
            {
                processedPdfId: processedPdf._id,
                status: processedPdf.status,
                progress: processedPdf.progress,
            },
            "PDF upload accepted. OCR processing started."
        )
    )
})

const getProcessedPdfStatus = asyncHandler(async (req, res) => {
    const { processedPdfId } = req.params

    if (!mongoose.Types.ObjectId.isValid(processedPdfId)) {
        throw new ApiError(400, "Invalid processed PDF id")
    }

    const processedPdf = await ProcessedPdf.findById(processedPdfId)
    if (!processedPdf) {
        throw new ApiError(404, "Processed PDF not found")
    }

    if (processedPdf.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Access denied")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                processedPdfId: processedPdf._id,
                status: processedPdf.status,
                progress: processedPdf.progress,
                vectorDimensions: processedPdf.vectorDimensions,
                chunkCount: processedPdf.contentVectors?.length || 0,
                fileName: processedPdf.fileName,
                contentLength: processedPdf.extractedContent?.length || 0,
                errorMessage: processedPdf.errorMessage || "",
            },
            "Processed PDF status fetched"
        )
    )
})

const uploadMaterial = asyncHandler(async (req, res) => {
    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty members can upload materials")
    }

    if (!req.file) {
        throw new ApiError(400, "PDF file is required")
    }

    if (req.file.mimetype !== "application/pdf") {
        throw new ApiError(400, "Only PDF files are allowed")
    }

    if (req.file.size > 10 * 1024 * 1024) {
        throw new ApiError(400, "PDF file size cannot exceed 10MB")
    }

    const { classId, materialName } = req.body
    let resolvedClassId = null

    if (classId) {
        if (!mongoose.Types.ObjectId.isValid(classId)) {
            throw new ApiError(400, "Invalid class ID format")
        }

        const classDoc = await Class.findById(classId)
        if (!classDoc || !classDoc.isFaculty(req.user._id)) {
            throw new ApiError(
                403,
                "You can only upload materials for your own classes"
            )
        }
        resolvedClassId = classDoc._id
    }

    const processedPdf = await ProcessedPdf.create({
        userId: req.user._id,
        classId: resolvedClassId,
        isMaterial: true,
        materialName: String(materialName || req.file.originalname).trim(),
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: "processing",
        progress: 5,
        expiresAt: null,
    })

    processPdfInBackground({
        processedPdfId: processedPdf._id,
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname,
        userId: req.user._id,
    })

    return res.status(202).json(
        new ApiResponse(
            202,
            {
                materialId: processedPdf._id,
                status: processedPdf.status,
                progress: processedPdf.progress,
            },
            "Material upload accepted. Processing started."
        )
    )
})

const listMaterials = asyncHandler(async (req, res) => {
    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty members can view materials")
    }

    const { classId } = req.query
    const filter = {
        userId: req.user._id,
    }

    if (classId) {
        if (!mongoose.Types.ObjectId.isValid(classId)) {
            throw new ApiError(400, "Invalid class ID format")
        }
        filter.classId = classId
    }

    const materials = await ProcessedPdf.find(filter)
        .sort({ createdAt: -1 })
        .select(
            "materialName fileName classId fileSize status progress vectorDimensions contentVectors extractedContent errorMessage createdAt"
        )
        .lean()

    const payload = materials.map((material) => ({
        _id: material._id,
        materialName: material.materialName || material.fileName,
        fileName: material.fileName,
        classId: material.classId || null,
        fileSize: material.fileSize || 0,
        status: material.status,
        progress: material.progress,
        chunkCount: material.contentVectors?.length || 0,
        contentLength: material.extractedContent?.length || 0,
        vectorDimensions: material.vectorDimensions || 0,
        errorMessage: material.errorMessage || "",
        createdAt: material.createdAt,
    }))

    return res
        .status(200)
        .json(new ApiResponse(200, payload, "Materials fetched successfully"))
})

const getMaterialStatus = asyncHandler(async (req, res) => {
    const { materialId } = req.params

    if (!mongoose.Types.ObjectId.isValid(materialId)) {
        throw new ApiError(400, "Invalid material id")
    }

    const material = await ProcessedPdf.findOne({
        _id: materialId,
        userId: req.user._id,
    })

    if (!material) {
        throw new ApiError(404, "Material not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                materialId: material._id,
                status: material.status,
                progress: material.progress,
                materialName: material.materialName || material.fileName,
                chunkCount: material.contentVectors?.length || 0,
                contentLength: material.extractedContent?.length || 0,
                errorMessage: material.errorMessage || "",
            },
            "Material status fetched"
        )
    )
})

const deleteMaterial = asyncHandler(async (req, res) => {
    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty members can delete materials")
    }

    const { materialId } = req.params

    if (!mongoose.Types.ObjectId.isValid(materialId)) {
        throw new ApiError(400, "Invalid material id")
    }

    const material = await ProcessedPdf.findOne({
        _id: materialId,
        userId: req.user._id,
    })

    if (!material) {
        throw new ApiError(404, "Material not found")
    }

    if (material.pdfPublicId) {
        await deleteFromCloudinary(material.pdfPublicId)
    }

    await ProcessedPdf.deleteOne({ _id: material._id })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Material deleted successfully"))
})

// ✅ Enhanced PDF quiz generation
// ✅ Enhanced Quiz Generation (PDF or Topic)
const generateQuiz = asyncHandler(async (req, res) => {
    // ✅ Validate faculty role
    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty members can generate quizzes")
    }

    // ✅ Get data from request body
    const {
        classId,
        title,
        description,
        requirements,
        duration,
        scheduledAt,
        deadline,
        topic, // ✅ New field
        materialId,
        processedPdfId,
        tags = [],
        settings = {},
    } = req.body

    let parsedSettings = settings
    if (typeof parsedSettings === "string") {
        try {
            parsedSettings = JSON.parse(parsedSettings)
        } catch (error) {
            throw new ApiError(400, "Invalid settings format")
        }
    }

    if (!parsedSettings || typeof parsedSettings !== "object") {
        parsedSettings = {}
    }

    // ✅ Enhanced validation
    if (!classId) {
        throw new ApiError(400, "Class ID is required")
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(400, "Invalid class ID format")
    }

    if (!title || !requirements || !duration || !scheduledAt || !deadline) {
        throw new ApiError(400, "All required fields must be provided")
    }

    // ✅ Determine input type
    let inputObj
    let inputType
    let inputName

    if (materialId) {
        if (!mongoose.Types.ObjectId.isValid(materialId)) {
            throw new ApiError(400, "Invalid material id")
        }

        const material = await ProcessedPdf.findOne({
            _id: materialId,
            userId: req.user._id,
        })

        if (!material) {
            throw new ApiError(404, "Material not found")
        }

        if (material.status !== "completed") {
            throw new ApiError(400, "Selected material is still processing")
        }

        const reconstructedContent = joinVectorChunks(material.contentVectors)
        const sourceContent = reconstructedContent || material.extractedContent

        if (!sourceContent) {
            throw new ApiError(
                400,
                "Selected material does not contain extracted content"
            )
        }

        inputObj = {
            type: "preprocessed-pdf",
            data: sourceContent,
        }
        inputType = "pdf"
        inputName = material.materialName || material.fileName
    } else if (processedPdfId) {
        if (!mongoose.Types.ObjectId.isValid(processedPdfId)) {
            throw new ApiError(400, "Invalid processed PDF id")
        }

        const processedPdf = await ProcessedPdf.findById(processedPdfId)
        if (!processedPdf) {
            throw new ApiError(404, "Processed PDF not found")
        }

        if (processedPdf.userId.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Access denied for processed PDF")
        }

        if (processedPdf.status !== "completed") {
            throw new ApiError(
                400,
                "PDF processing is not completed yet. Please wait."
            )
        }

        if (!processedPdf.extractedContent) {
            throw new ApiError(
                400,
                "Processed PDF does not contain extracted content"
            )
        }

        const reconstructedContent = joinVectorChunks(
            processedPdf.contentVectors
        )
        const sourceContent =
            reconstructedContent || processedPdf.extractedContent

        inputObj = {
            type: "preprocessed-pdf",
            data: sourceContent,
        }
        inputType = "pdf"
        inputName = processedPdf.fileName
    } else if (req.file) {
        // PDF Mode
        if (req.file.mimetype !== "application/pdf") {
            throw new ApiError(400, "Only PDF files are allowed")
        }
        if (req.file.size > 10 * 1024 * 1024) {
            throw new ApiError(400, "PDF file size cannot exceed 10MB")
        }
        inputObj = { type: "pdf", data: req.file.buffer }
        inputType = "pdf"
        inputName = req.file.originalname
        inputObj.originalName = req.file.originalname
    } else if (topic && topic.trim().length > 0) {
        // Topic Mode
        if (topic.length > 200) {
            throw new ApiError(400, "Topic cannot exceed 200 characters")
        }
        inputObj = { type: "topic", data: topic.trim() }
        inputType = "topic"
        inputName = topic.trim()
    } else {
        throw new ApiError(
            400,
            "Either a PDF file or a Valid Topic is required"
        )
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
        // "topics", // Not required for generic generation
        "totalMarks",
    ]
    for (const field of requiredFields) {
        if (!parsedRequirements[field]) {
            throw new ApiError(400, `Requirements must include ${field}`)
        }
    }

    const questionCount = Number(parsedRequirements.numQuestions)
    const totalMarks = Number(parsedRequirements.totalMarks)
    const requestedQuestionTypes = Array.isArray(
        parsedRequirements.questionTypes
    )
        ? parsedRequirements.questionTypes
              .map((entry) =>
                  String(entry || "")
                      .trim()
                      .toLowerCase()
              )
              .filter((entry) => ALLOWED_GENERATION_QUESTION_TYPES.has(entry))
        : []

    if (!Number.isFinite(questionCount) || questionCount < 1) {
        throw new ApiError(400, "Number of questions must be at least 1")
    }

    if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
        throw new ApiError(400, "Total marks must be greater than 0")
    }

    if (totalMarks > MAX_TOTAL_MARKS) {
        throw new ApiError(400, `Total marks cannot exceed ${MAX_TOTAL_MARKS}`)
    }

    parsedRequirements.numQuestions = questionCount
    parsedRequirements.totalMarks = Number(totalMarks.toFixed(2))
    parsedRequirements.questionTypes =
        requestedQuestionTypes.length > 0
            ? [...new Set(requestedQuestionTypes)]
            : ["multiple-choice"]
    parsedRequirements.marksPerQuestion = calculateMarksPerQuestion(
        parsedRequirements.totalMarks,
        parsedRequirements.numQuestions
    )

    // ✅ Validate duration
    const durationNum = parseInt(duration, 10)
    if (isNaN(durationNum) || durationNum < 5 || durationNum > 480) {
        throw new ApiError(400, "Duration must be between 5 and 480 minutes")
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

    const minimumAllowedGapMs =
        (durationNum + MIN_DEADLINE_BUFFER_MINUTES) * 60 * 1000
    if (
        deadlineDate.getTime() - scheduledDate.getTime() <
        minimumAllowedGapMs
    ) {
        throw new ApiError(
            400,
            `Deadline must be at least ${durationNum + MIN_DEADLINE_BUFFER_MINUTES} minutes after scheduled time (duration + 10 minute buffer)`
        )
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

    // ✅ Generate questions
    let generatedQuestions
    try {
        devLog.info("Starting question generation", {
            classId,
            inputType,
            requestedCount: parsedRequirements.numQuestions,
            requestedTypes: parsedRequirements.questionTypes,
            difficulty: parsedRequirements.difficultyLevel,
            hasTopic: Boolean(topic),
            hasMaterialId: Boolean(materialId),
            hasProcessedPdfId: Boolean(processedPdfId),
        })

        console.log(
            `Generating ${parsedRequirements.numQuestions} questions from ${inputType}...`
        )
        generatedQuestions = await generateQuestions(
            inputObj,
            parsedRequirements
        )

        if (!generatedQuestions || generatedQuestions.length === 0) {
            throw new ApiError(
                500,
                `No questions could be generated from the ${inputType}`
            )
        }

        if (generatedQuestions.length !== parsedRequirements.numQuestions) {
            throw new ApiError(
                500,
                `AI generated ${generatedQuestions.length} out of ${parsedRequirements.numQuestions} required questions. Please retry generation.`
            )
        }

        generatedQuestions = generatedQuestions.map((question) => ({
            ...question,
            points: parsedRequirements.marksPerQuestion,
        }))

        devLog.info("Question generation completed", {
            classId,
            generatedCount: generatedQuestions.length,
            requestedCount: parsedRequirements.numQuestions,
        })
    } catch (error) {
        devLog.error("Question generation failed", {
            classId,
            inputType,
            requestedCount: parsedRequirements?.numQuestions,
            requestedTypes: parsedRequirements?.questionTypes,
            difficulty: parsedRequirements?.difficultyLevel,
            message: error?.message,
            stack: error?.stack,
        })

        console.error("AI generation error:", error)

        if (error.message?.includes("timeout")) {
            throw new ApiError(
                408,
                "AI processing timed out. Please try with a smaller input."
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
            "Failed to generate questions. Please try again."
        )
    }

    // ✅ Create quiz with all required fields
    const quiz = new Quiz({
        userId: req.user._id,
        classId: classId,
        title: title.trim(),
        description: description?.trim() || "",
        input: inputName,
        inputType: inputType,
        requirements: {
            numQuestions: parsedRequirements.numQuestions,
            difficultyLevel: parsedRequirements.difficultyLevel,
            questionTypes: parsedRequirements.questionTypes,
            topics: parsedRequirements.topics || [],
            marksPerQuestion: parsedRequirements.marksPerQuestion,
            totalMarks: parsedRequirements.totalMarks,
        },
        questions: generatedQuestions,
        duration: durationNum,
        scheduledAt: scheduledDate,
        deadline: deadlineDate,
        tags: Array.isArray(tags) ? tags : [],
        settings: {
            attemptsAllowed: parsedSettings.attemptsAllowed || 1,
            shuffleQuestions: parsedSettings.shuffleQuestions || false,
            shuffleOptions: parsedSettings.shuffleOptions || false,
            showCorrectAnswers: parsedSettings.showCorrectAnswers !== false,
            showScoreImmediately: parsedSettings.showScoreImmediately !== false,
            allowQuestionWiseScores:
                parsedSettings.allowQuestionWiseScores === true,
            allowQuestionWiseCorrectAnswers:
                parsedSettings.allowQuestionWiseCorrectAnswers === true,
            allowQuestionWiseFeedback:
                parsedSettings.allowQuestionWiseFeedback === true,
            releaseQuestionWiseAfterDeadline:
                parsedSettings.releaseQuestionWiseAfterDeadline !== false,
            allowBackNavigation: parsedSettings.allowBackNavigation !== false,
            passingScore: parsedSettings.passingScore || 60,
            autoSubmit: parsedSettings.autoSubmit !== false,
            ...parsedSettings,
        },
        status: "draft",
        category: parsedRequirements.category || "quiz",
        pdfFile: inputObj?.pdfFile || undefined,
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
            select: "subjectName subjectCode classSlot semester classCode",
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
        responseQuiz.questions = responseQuiz.questions.map(
            (question, index) => {
                const { correctAnswer, correctOptions, ...safeQuestion } =
                    question
                return {
                    ...safeQuestion,
                    originalQuestionIndex: index,
                }
            }
        )

        if (req.user.role === "student") {
            const shouldShuffleOptions =
                responseQuiz?.settings?.shuffleOptions === true
            const shouldShuffleQuestions =
                responseQuiz?.settings?.shuffleQuestions === true

            if (shouldShuffleOptions) {
                responseQuiz.questions = responseQuiz.questions.map(
                    (question) => {
                        if (!Array.isArray(question.options)) {
                            return question
                        }

                        return {
                            ...question,
                            options: shuffleArray(question.options),
                        }
                    }
                )
            }

            if (shouldShuffleQuestions) {
                responseQuiz.questions = shuffleArray(responseQuiz.questions)
            }
        }
    }

    // ✅ Add computed fields for frontend
    const now = new Date()
    responseQuiz.computedStatus = getQuizStatus(quiz, now)

    // ✅ Check if student has already attempted
    let userAttempt = null
    if (req.user.role === "student") {
        const { QuizAttempt } = await import("../models/quizAttempt.model.js")
        userAttempt = await QuizAttempt.findOne({
            quiz: quizId,
            student: req.user._id,
        }).lean()
    }
    responseQuiz.userAttempt = userAttempt

    const attemptsAllowed = quiz.settings?.attemptsAllowed || 1
    const attemptsUsed = userAttempt ? 1 : 0 // Since they only have 1 attempt document usually, or we count them

    // ✅ Update canTakeQuiz logic to prevent retakes
    responseQuiz.canTakeQuiz =
        canUserTakeQuiz(quiz, req.user, now) &&
        (!userAttempt || attemptsUsed < attemptsAllowed)

    responseQuiz.timeUntilStart =
        quiz.scheduledAt > now ? quiz.scheduledAt - now : 0
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
        const questionType = String(question?.questionType || "multiple-choice")
            .trim()
            .toLowerCase()
        const requiresOptions = [
            "multiple-choice",
            "multiple-select",
            "true-false",
        ].includes(questionType)

        if (
            !question.questionText ||
            question.questionText.trim().length === 0
        ) {
            validationErrors.push(
                `Question ${index + 1} is missing question text`
            )
        }

        if (
            requiresOptions &&
            (!Array.isArray(question.options) || question.options.length < 2)
        ) {
            validationErrors.push(
                `Question ${index + 1} must have at least 2 options`
            )
        }

        const hasCorrectAnswer =
            questionType === "multiple-select"
                ? Array.isArray(question.correctOptions) &&
                  question.correctOptions.length > 0
                : Boolean(String(question.correctAnswer || "").trim())

        if (!hasCorrectAnswer) {
            validationErrors.push(
                `Question ${index + 1} is missing correct answer`
            )
        }
    })

    // ✅ Validate quiz timing
    const now = new Date()
    // Removed scheduledAt <= now check to allow re-publishing or late publishing

    if (quiz.deadline <= quiz.scheduledAt) {
        validationErrors.push("Quiz deadline must be after scheduled time")
    }

    const minimumGapForPublishMs =
        (Number(quiz.duration || 0) + MIN_DEADLINE_BUFFER_MINUTES) * 60 * 1000
    if (
        new Date(quiz.deadline).getTime() -
            new Date(quiz.scheduledAt).getTime() <
        minimumGapForPublishMs
    ) {
        validationErrors.push(
            `Quiz deadline must be at least ${Number(quiz.duration || 0) + MIN_DEADLINE_BUFFER_MINUTES} minutes after scheduled time`
        )
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
        {
            path: "classId",
            select: "subjectName subjectCode classSlot students",
        },
    ])

    // ✅ Notify students
    try {
        const studentIds = quiz.classId.students
            .filter((s) => s.status === "active")
            .map((s) => s.user)

        if (studentIds.length > 0) {
            const { NotificationTemplates, createBulkNotifications } =
                await import("./notification.controller.js")

            const notificationData = {
                sender: req.user._id,
                ...NotificationTemplates.QUIZ_PUBLISHED,
                message: NotificationTemplates.QUIZ_PUBLISHED.getMessage(
                    quiz.title,
                    quiz.classId.subjectName
                ),
                relatedQuiz: quiz._id,
                relatedClass: quiz.classId._id,
                actionUrl: `/quiz/${quiz._id}`,
            }

            await createBulkNotifications(studentIds, notificationData)
        }
    } catch (error) {
        console.error("Failed to send notifications:", error)
        // Don't block response
    }

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

    // ✅ Delete PDF from Cloudinary if exists
    if (quiz.pdfFile?.publicId) {
        await deleteFromCloudinary(quiz.pdfFile.publicId)
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

const shuffleArray = (items = []) => {
    const shuffled = [...items]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
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

    if (
        !classId ||
        !title ||
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

    if (totalMarks > MAX_TOTAL_MARKS) {
        throw new ApiError(400, `Total marks cannot exceed ${MAX_TOTAL_MARKS}`)
    }

    const quiz = new Quiz({
        userId: req.user._id,
        classId,
        title: title.trim(),
        description: description?.trim() || "",
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
            allowQuestionWiseScores: settings.allowQuestionWiseScores === true,
            allowQuestionWiseCorrectAnswers:
                settings.allowQuestionWiseCorrectAnswers === true,
            allowQuestionWiseFeedback:
                settings.allowQuestionWiseFeedback === true,
            releaseQuestionWiseAfterDeadline:
                settings.releaseQuestionWiseAfterDeadline !== false,
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
    const scheduleFields = ["scheduledAt", "deadline"]
    const mutableSettingKeys = [
        "allowQuestionWiseScores",
        "allowQuestionWiseCorrectAnswers",
        "allowQuestionWiseFeedback",
        "releaseQuestionWiseAfterDeadline",
        "shuffleQuestions",
        "shuffleOptions",
    ]
    const filteredData = {}

    allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field]
        }
    })

    const requestedFields = Object.keys(filteredData)
    const isActivePublishedQuiz =
        quiz.status === "published" && new Date(quiz.deadline) >= new Date()

    if (filteredData.settings && typeof filteredData.settings === "object") {
        const currentSettings =
            typeof quiz.settings?.toObject === "function"
                ? quiz.settings.toObject()
                : quiz.settings || {}

        const nextSettings = { ...currentSettings }
        for (const key of mutableSettingKeys) {
            if (typeof filteredData.settings[key] === "boolean") {
                nextSettings[key] = filteredData.settings[key]
            }
        }

        filteredData.settings = nextSettings
    }

    if (
        isActivePublishedQuiz &&
        requestedFields.some((field) => {
            if (scheduleFields.includes(field)) return false
            if (field !== "settings") return true

            const incomingSettings = updateData.settings || {}
            const incomingKeys = Object.keys(incomingSettings)
            return incomingKeys.some((key) => !mutableSettingKeys.includes(key))
        })
    ) {
        throw new ApiError(
            400,
            "Only quiz schedule and question-wise result visibility settings can be updated after publishing"
        )
    }

    const nextScheduledAt =
        filteredData.scheduledAt !== undefined
            ? new Date(filteredData.scheduledAt)
            : new Date(quiz.scheduledAt)
    const nextDeadline =
        filteredData.deadline !== undefined
            ? new Date(filteredData.deadline)
            : new Date(quiz.deadline)
    const nextDuration =
        filteredData.duration !== undefined
            ? parseInt(filteredData.duration, 10)
            : parseInt(quiz.duration, 10)

    if (isNaN(nextDuration) || nextDuration < 5 || nextDuration > 480) {
        throw new ApiError(400, "Duration must be between 5 and 480 minutes")
    }

    if (isNaN(nextScheduledAt.getTime()) || isNaN(nextDeadline.getTime())) {
        throw new ApiError(400, "Invalid schedule date format")
    }

    if (nextDeadline <= nextScheduledAt) {
        throw new ApiError(400, "Deadline must be after scheduled time")
    }

    const minimumGapForUpdateMs =
        (nextDuration + MIN_DEADLINE_BUFFER_MINUTES) * 60 * 1000
    if (
        nextDeadline.getTime() - nextScheduledAt.getTime() <
        minimumGapForUpdateMs
    ) {
        throw new ApiError(
            400,
            `Deadline must be at least ${nextDuration + MIN_DEADLINE_BUFFER_MINUTES} minutes after scheduled time (duration + 10 minute buffer)`
        )
    }

    if (filteredData.questions) {
        const recalculatedTotalMarks = filteredData.questions.reduce(
            (sum, q) => sum + (q.points || 1),
            0
        )

        if (recalculatedTotalMarks > MAX_TOTAL_MARKS) {
            throw new ApiError(
                400,
                `Total marks cannot exceed ${MAX_TOTAL_MARKS}`
            )
        }
    }

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

    Object.assign(quiz, filteredData)
    await quiz.save()

    const updatedQuiz = await Quiz.findById(quizId).populate(
        "classId",
        "subjectName subjectCode"
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedQuiz, "Quiz updated successfully"))
})

const regenerateQuizQuestion = asyncHandler(async (req, res) => {
    const { quizId, questionIndex } = req.params
    const { instruction = "" } = req.body || {}

    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty members can regenerate questions")
    }

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    const index = Number(questionIndex)
    if (!Number.isInteger(index) || index < 0) {
        throw new ApiError(400, "Invalid question index")
    }

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (quiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only edit your own quizzes")
    }

    const isActivePublishedQuiz =
        quiz.status === "published" && new Date(quiz.deadline) >= new Date()
    if (isActivePublishedQuiz) {
        throw new ApiError(
            400,
            "Question content cannot be regenerated for active published quizzes"
        )
    }

    if (!Array.isArray(quiz.questions) || index >= quiz.questions.length) {
        throw new ApiError(404, "Question not found at provided index")
    }

    const currentQuestion = quiz.questions[index]

    const model = createModel({
        purpose: "quizGeneration",
        temperature: 0.35,
        maxOutputTokens: 4096,
    })

    const prompt = `
Regenerate ONE improved quiz question with options while keeping it aligned to the same topic and difficulty.

Quiz title: ${quiz.title}
Quiz description: ${quiz.description || "N/A"}
Difficulty target: ${quiz.requirements?.difficultyLevel || "medium"}
Question type target: ${currentQuestion.questionType || "multiple-choice"}

Current question text:
${currentQuestion.questionText}

Current options:
${(currentQuestion.options || []).map((opt, i) => `${i + 1}. ${opt}`).join("\n")}

Current correct answer:
${currentQuestion.correctAnswer || ""}

Faculty instruction (optional):
${String(instruction || "").slice(0, 500)}

Return ONLY valid JSON object with this shape:
{
  "questionText": "...",
  "options": ["...", "...", "...", "..."],
  "correctAnswer": "...",
  "difficulty": "easy|medium|hard",
  "topic": "...",
  "explanation": "..."
}

Rules:
- Ensure correctAnswer exactly matches one of options.
- options must be concise and unambiguous.
- questionText should be clear and exam-ready.
`.trim()

    let parsed
    try {
        const response = await model.invoke(prompt)
        parsed = parseAiJsonObject(response?.content)
    } catch (error) {
        throw new ApiError(
            500,
            `Failed to regenerate question via AI: ${error?.message || "Unknown error"}`
        )
    }

    const sanitizedQuestion = sanitizeQuestionWithFormattingAgent(
        {
            questionText: parsed?.questionText,
            options: parsed?.options,
            correctAnswer: parsed?.correctAnswer,
            difficulty: parsed?.difficulty,
            topic: parsed?.topic,
            explanation: parsed?.explanation,
            questionType: currentQuestion.questionType,
            points: currentQuestion.points || 1,
        },
        {
            requirements: quiz.requirements,
            fallbackQuestionType:
                currentQuestion.questionType || "multiple-choice",
            fallbackPoints: currentQuestion.points || 1,
        }
    )

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                question: sanitizedQuestion,
                questionIndex: index,
            },
            "Question regenerated successfully"
        )
    )
})

const generateNewQuizQuestion = asyncHandler(async (req, res) => {
    const { quizId } = req.params
    const { instruction = "" } = req.body || {}

    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty members can generate questions")
    }

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID")
    }

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
        throw new ApiError(404, "Quiz not found")
    }

    if (quiz.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only edit your own quizzes")
    }

    const isActivePublishedQuiz =
        quiz.status === "published" && new Date(quiz.deadline) >= new Date()
    if (isActivePublishedQuiz) {
        throw new ApiError(
            400,
            "New questions cannot be generated for active published quizzes"
        )
    }

    const questionTypeTarget =
        quiz.requirements?.questionTypes?.[0] || "multiple-choice"
    const marksTarget = Number(quiz.requirements?.marksPerQuestion || 1)

    const existingQuestionStems = (quiz.questions || [])
        .slice(0, 50)
        .map(
            (q, index) => `${index + 1}. ${String(q.questionText || "").trim()}`
        )
        .join("\n")

    const model = createModel({
        purpose: "quizGeneration",
        temperature: 0.35,
        maxOutputTokens: 4096,
    })

    const prompt = `
Generate ONE new quiz question with options that fits this quiz and does not duplicate existing questions.

Quiz title: ${quiz.title}
Quiz description: ${quiz.description || "N/A"}
Difficulty target: ${quiz.requirements?.difficultyLevel || "medium"}
Question type target: ${questionTypeTarget}

Existing question stems to avoid repeating:
${existingQuestionStems || "None"}

Faculty instruction (optional):
${String(instruction || "").slice(0, 500)}

Return ONLY valid JSON object with this shape:
{
  "questionText": "...",
  "options": ["...", "...", "...", "..."],
  "correctAnswer": "...",
  "difficulty": "easy|medium|hard",
  "topic": "...",
  "explanation": "..."
}

Rules:
- Ensure correctAnswer exactly matches one of options.
- options must be concise and unambiguous.
- questionText should be clear and exam-ready.
- must not duplicate existing stems.
`.trim()

    let parsed
    try {
        const response = await model.invoke(prompt)
        parsed = parseAiJsonObject(response?.content)
    } catch (error) {
        throw new ApiError(
            500,
            `Failed to generate new question via AI: ${error?.message || "Unknown error"}`
        )
    }

    const sanitizedQuestion = sanitizeQuestionWithFormattingAgent(
        {
            questionText: parsed?.questionText,
            options: parsed?.options,
            correctAnswer: parsed?.correctAnswer,
            difficulty: parsed?.difficulty,
            topic: parsed?.topic,
            explanation: parsed?.explanation,
            questionType: questionTypeTarget,
            points: marksTarget,
        },
        {
            requirements: quiz.requirements,
            fallbackQuestionType: questionTypeTarget,
            fallbackPoints: marksTarget,
        }
    )

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                question: sanitizedQuestion,
            },
            "New question generated successfully"
        )
    )
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

// ✅ Get quizzes for logged-in student (across all classes)
const getStudentQuizzes = asyncHandler(async (req, res) => {
    const { status } = req.query
    const studentId = req.user._id

    // 1. Get enrolled active class IDs
    const classes = await Class.find({
        "students.user": studentId,
        "students.status": "active",
    }).select("_id")
    const classIds = classes.map((c) => c._id)

    // 2. Base Query
    const now = new Date()
    let query = { classId: { $in: classIds }, status: "published" }

    // Optimization: Pre-filter DB query where possible
    if (status === "upcoming") {
        query.scheduledAt = { $gt: now }
    } else if (status === "active") {
        query.scheduledAt = { $lte: now }
        query.deadline = { $gte: now }
    }
    // For completed/missed, we fetch broadly and filter in memory if needed,
    // or we could optimistically query deadline < now for missed/completed.

    // 3. Fetch Quizzes
    const quizzes = await Quiz.find(query)
        .populate("classId", "subjectName subjectCode")
        .sort({ deadline: 1 }) // Sort by deadline (soonest first)
        .lean()

    // 4. Fetch Student Attempts for these quizzes
    const quizIds = quizzes.map((q) => q._id)
    const attempts = await QuizAttempt.find({
        student: studentId,
        quiz: { $in: quizIds },
    }).select("quiz status percentage createdAt")

    const attemptMap = new Map(attempts.map((a) => [a.quiz.toString(), a]))

    // 5. Compute Status & Filter
    const processedQuizzes = quizzes.map((quiz) => {
        const attempt = attemptMap.get(quiz._id.toString())
        let myStatus = "upcoming"

        if (attempt) {
            myStatus = "completed"
        } else if (now > new Date(quiz.deadline)) {
            myStatus = "missed"
        } else if (
            now >= new Date(quiz.scheduledAt) &&
            now <= new Date(quiz.deadline)
        ) {
            myStatus = "active"
        } else {
            myStatus = "upcoming"
        }

        return {
            ...quiz,
            myStatus,
            attempt,
        }
    })

    // 6. Final Filter
    const finalResult = status
        ? processedQuizzes.filter((q) => q.myStatus === status)
        : processedQuizzes

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                finalResult,
                "Student quizzes retrieved successfully"
            )
        )
})

// ✅ Add to exports
export {
    getStudentQuizzes,
    processUploadedPdf,
    getProcessedPdfStatus,
    uploadMaterial,
    listMaterials,
    getMaterialStatus,
    deleteMaterial,
    generateQuiz,
    createQuizManual,
    getQuiz,
    getClassQuizzes,
    updateQuiz,
    regenerateQuizQuestion,
    generateNewQuizQuestion,
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
