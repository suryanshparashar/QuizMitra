// controllers/classMessageController.js
import { ClassMessage } from "../models/classMessage.model.js"
import { Class } from "../models/class.model.js"
import { ApiResponse, ApiError, asyncHandler } from "../utils/index.js"
import mongoose from "mongoose"

// Create new message in class (Faculty and CR only)
const createMessage = asyncHandler(async (req, res) => {
    const { classId } = req.params
    const { content } = req.body

    // ✅ Validate input
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Message content is required")
    }

    if (content.length > 1000) {
        throw new ApiError(400, "Message content cannot exceed 1000 characters")
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(400, "Invalid class ID")
    }

    // ✅ Check if class exists
    const classDoc = await Class.findById(classId)
    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    if (classDoc.isArchived) {
        throw new ApiError(400, "Cannot send messages in archived class")
    }

    // ✅ Check permissions - Only faculty and CR can create messages
    const isFaculty = classDoc.isFaculty(req.user._id)
    const isClassRep = classDoc.isClassRepresentative(req.user._id)

    if (!isFaculty && !isClassRep) {
        throw new ApiError(
            403,
            "Only faculty and class representatives can create messages"
        )
    }

    // ✅ Create message
    const message = new ClassMessage({
        class: classId,
        sender: req.user._id,
        content: content.trim(),
    })

    await message.save()

    // ✅ Populate sender details for response
    await message.populate([
        {
            path: "sender",
            select: "fullName role facultyId studentId",
        },
        {
            path: "class",
            select: "subjectName subjectCode",
        },
    ])

    return res.status(201).json(
        new ApiResponse(201, message, "Message created successfully")
    )
})

// Get all messages in a class
const getClassMessages = asyncHandler(async (req, res) => {
    const { classId } = req.params
    const { page = 1, limit = 20, sort = "newest" } = req.query

    if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(400, "Invalid class ID")
    }

    // ✅ Check if user has access to this class
    const classDoc = await Class.findById(classId)
    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    const hasAccess =
        classDoc.isFaculty(req.user._id) ||
        classDoc.isStudent(req.user._id) ||
        classDoc.isClassRepresentative(req.user._id)

    if (!hasAccess) {
        throw new ApiError(403, "Access denied to this class")
    }

    // ✅ Build aggregation pipeline
    const sortOrder = sort === "oldest" ? 1 : -1
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const pipeline = [
        {
            $match: {
                class: new mongoose.Types.ObjectId(classId),
            },
        },

        // Populate sender details
        {
            $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "senderDetails",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            role: 1,
                            facultyId: 1,
                            studentId: 1,
                        },
                    },
                ],
            },
        },

        // Populate comment details
        {
            $lookup: {
                from: "users",
                localField: "comments.commenter",
                foreignField: "_id",
                as: "commenterDetails",
            },
        },

        // Add computed fields
        {
            $addFields: {
                senderDetails: { $first: "$senderDetails" },
                commentsCount: { $size: "$comments" },
                latestCommentAt: { $max: "$comments.createdAt" },
                // Map comments with commenter details
                commentsWithDetails: {
                    $map: {
                        input: "$comments",
                        as: "comment",
                        in: {
                            _id: "$$comment._id",
                            content: "$$comment.content",
                            createdAt: "$$comment.createdAt",
                            commenter: {
                                $let: {
                                    vars: {
                                        commenter: {
                                            $filter: {
                                                input: "$commenterDetails",
                                                cond: {
                                                    $eq: [
                                                        "$$this._id",
                                                        "$$comment.commenter",
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    in: {
                                        _id: { $first: "$$commenter._id" },
                                        fullName: {
                                            $first: "$$commenter.fullName",
                                        },
                                        role: { $first: "$$commenter.role" },
                                        facultyId: {
                                            $first: "$$commenter.facultyId",
                                        },
                                        studentId: {
                                            $first: "$$commenter.studentId",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },

        // Sort by creation date or latest activity
        {
            $sort:
                sort === "activity"
                    ? { latestCommentAt: -1, createdAt: -1 }
                    : { createdAt: sortOrder },
        },

        // Pagination
        { $skip: skip },
        { $limit: parseInt(limit) },

        // Clean up response
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                senderDetails: 1,
                commentsCount: 1,
                comments: "$commentsWithDetails",
                // Only show first 3 comments in list view
                recentComments: {
                    $slice: [
                        {
                            $sortArray: {
                                input: "$commentsWithDetails",
                                sortBy: { createdAt: -1 },
                            },
                        },
                        3,
                    ],
                },
            },
        },
    ]

    const messages = await ClassMessage.aggregate(pipeline)

    // ✅ Get total count for pagination
    const totalCount = await ClassMessage.countDocuments({ class: classId })
    const totalPages = Math.ceil(totalCount / parseInt(limit))

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                messages,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalMessages: totalCount,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                },
            },
            "Class messages retrieved successfully"
        )
    )
})

// Get single message with all comments
const getMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ApiError(400, "Invalid message ID")
    }

    const pipeline = [
        {
            $match: { _id: new mongoose.Types.ObjectId(messageId) },
        },

        // Populate sender
        {
            $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "senderDetails",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            role: 1,
                            facultyId: 1,
                            studentId: 1,
                        },
                    },
                ],
            },
        },

        // Populate class
        {
            $lookup: {
                from: "classes",
                localField: "class",
                foreignField: "_id",
                as: "classDetails",
                pipeline: [{ $project: { subjectName: 1, subjectCode: 1 } }],
            },
        },

        // Populate commenters
        {
            $lookup: {
                from: "users",
                localField: "comments.commenter",
                foreignField: "_id",
                as: "commenterDetails",
            },
        },

        // Structure the response
        {
            $addFields: {
                senderDetails: { $first: "$senderDetails" },
                classDetails: { $first: "$classDetails" },
                commentsWithDetails: {
                    $map: {
                        input: "$comments",
                        as: "comment",
                        in: {
                            _id: "$$comment._id",
                            content: "$$comment.content",
                            createdAt: "$$comment.createdAt",
                            commenter: {
                                $let: {
                                    vars: {
                                        commenter: {
                                            $filter: {
                                                input: "$commenterDetails",
                                                cond: {
                                                    $eq: [
                                                        "$$this._id",
                                                        "$$comment.commenter",
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    in: {
                                        _id: { $first: "$$commenter._id" },
                                        fullName: {
                                            $first: "$$commenter.fullName",
                                        },
                                        role: { $first: "$$commenter.role" },
                                        facultyId: {
                                            $first: "$$commenter.facultyId",
                                        },
                                        studentId: {
                                            $first: "$$commenter.studentId",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },

        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                senderDetails: 1,
                classDetails: 1,
                comments: {
                    $sortArray: {
                        input: "$commentsWithDetails",
                        sortBy: { createdAt: 1 },
                    },
                },
                commentsCount: { $size: "$comments" },
            },
        },
    ]

    const [message] = await ClassMessage.aggregate(pipeline)

    if (!message) {
        throw new ApiError(404, "Message not found")
    }

    // ✅ Check access to the class
    const classDoc = await Class.findById(message.classDetails._id)
    const hasAccess =
        classDoc.isFaculty(req.user._id) ||
        classDoc.isStudent(req.user._id) ||
        classDoc.isClassRepresentative(req.user._id)

    if (!hasAccess) {
        throw new ApiError(403, "Access denied")
    }

    return res.status(200).json(
        new ApiResponse(200, message, "Message retrieved successfully")
    )
})

// Add comment to message (Everyone in class can comment)
const addComment = asyncHandler(async (req, res) => {
    const { messageId } = req.params
    const { content } = req.body

    // ✅ Validate input
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content is required")
    }

    if (content.length > 500) {
        throw new ApiError(400, "Comment content cannot exceed 500 characters")
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ApiError(400, "Invalid message ID")
    }

    // ✅ Find message and check class access
    const message = await ClassMessage.findById(messageId).populate("class")
    if (!message) {
        throw new ApiError(404, "Message not found")
    }

    if (message.class.isArchived) {
        throw new ApiError(400, "Cannot comment in archived class")
    }

    // ✅ Check if user has access to this class
    const hasAccess =
        message.class.isFaculty(req.user._id) ||
        message.class.isStudent(req.user._id) ||
        message.class.isClassRepresentative(req.user._id)

    if (!hasAccess) {
        throw new ApiError(403, "Access denied to this class")
    }

    // ✅ Add comment
    const newComment = {
        commenter: req.user._id,
        content: content.trim(),
        createdAt: new Date(),
    }

    message.comments.push(newComment)
    await message.save()

    // ✅ Get the added comment with commenter details
    const addedComment = message.comments[message.comments.length - 1]
    await message.populate({
        path: "comments.commenter",
        select: "fullName role facultyId studentId",
        match: { _id: addedComment.commenter },
    })

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                messageId: message._id,
                comment: addedComment,
                totalComments: message.comments.length,
            },
            "Comment added successfully"
        )
    )
})

// Delete message (Sender only)
const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ApiError(400, "Invalid message ID")
    }

    const message = await ClassMessage.findById(messageId)
    if (!message) {
        throw new ApiError(404, "Message not found")
    }

    // ✅ Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "Only the message sender can delete this message"
        )
    }

    await ClassMessage.findByIdAndDelete(messageId)

    return res.status(200).json(
        new ApiResponse(200, null, "Message deleted successfully")
    )
})

// Delete comment (Commenter only)
const deleteComment = asyncHandler(async (req, res) => {
    const { messageId, commentId } = req.params

    if (
        !mongoose.Types.ObjectId.isValid(messageId) ||
        !mongoose.Types.ObjectId.isValid(commentId)
    ) {
        throw new ApiError(400, "Invalid message or comment ID")
    }

    const message = await ClassMessage.findById(messageId)
    if (!message) {
        throw new ApiError(404, "Message not found")
    }

    // ✅ Find comment
    const comment = message.comments.id(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // ✅ Check if user is the commenter
    if (comment.commenter.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "Only the comment author can delete this comment"
        )
    }

    // ✅ Remove comment
    comment.deleteOne()
    await message.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            { totalComments: message.comments.length },
            "Comment deleted successfully"
        )
    )
})

// Get user's recent messages across all classes
const getUserMessages = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const pipeline = [
        {
            $match: { sender: req.user._id },
        },

        // Populate class details
        {
            $lookup: {
                from: "classes",
                localField: "class",
                foreignField: "_id",
                as: "classDetails",
                pipeline: [
                    {
                        $project: {
                            subjectName: 1,
                            subjectCode: 1,
                            isArchived: 1,
                        },
                    },
                ],
            },
        },

        {
            $addFields: {
                classDetails: { $first: "$classDetails" },
                commentsCount: { $size: "$comments" },
            },
        },

        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },

        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                classDetails: 1,
                commentsCount: 1,
            },
        },
    ]

    const userMessages = await ClassMessage.aggregate(pipeline)
    const totalCount = await ClassMessage.countDocuments({
        sender: req.user._id,
    })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                messages: userMessages,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalMessages: totalCount,
                },
            },
            "User messages retrieved successfully"
        )
    )
})

export {
    createMessage,
    getClassMessages,
    getMessage,
    addComment,
    deleteMessage,
    deleteComment,
    getUserMessages,
}
