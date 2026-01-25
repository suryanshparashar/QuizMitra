// controllers/class.controller.js
import { Class } from "../models/class.model.js"
import { Quiz } from "../models/quiz.model.js"
import { User } from "../models/user.model.js"
import { asyncHandler, ApiError, ApiResponse } from "../utils/index.js"
import mongoose from "mongoose"

// ✅ Create class with proper validation
const createClass = asyncHandler(async (req, res) => {
    if (req.user.role !== "faculty") {
        throw new ApiError(403, "Only faculty can create classes")
    }

    const {
        subjectName,
        subjectCode,
        semester,
        classSlot,
        venue,
        department,
        academicYear,
    } = req.body

    // ✅ Simple validation
    if (
        !subjectName ||
        !subjectCode ||
        !semester ||
        !classSlot ||
        !venue ||
        !department ||
        !academicYear
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // ✅ Check if class already exists
    const existingClass = await Class.findOne({
        subjectCode: subjectCode.toUpperCase(),
        semester,
        academicYear,
        faculty: req.user._id,
    })

    if (existingClass) {
        throw new ApiError(
            409,
            "Class with this subject code already exists for this semester"
        )
    }

    // ✅ Create class
    const classData = {
        subjectName: subjectName.trim(),
        subjectCode: subjectCode.toUpperCase().trim(),
        semester: semester.trim(),
        classSlot: classSlot.toUpperCase().trim(),
        venue: venue.trim(),
        department: department.toUpperCase().trim(),
        academicYear: academicYear.trim(),
        faculty: req.user._id,
    }

    const newClass = await Class.create(classData)
    await newClass.populate("faculty", "fullName email")

    return res
        .status(201)
        .json(new ApiResponse(201, newClass, "Class created successfully"))
})

// ✅ Get class by class code instead of ID
// Get class by code - NO ACCESS CHECK
const getClassByCode = asyncHandler(async (req, res) => {
    const { classCode } = req.params

    const classDetails = await Class.findOne({
        classCode: classCode.toUpperCase(),
        isArchived: false,
    })
        .populate("faculty", "fullName email")
        .populate("students.user", "fullName email")

    if (!classDetails) {
        throw new ApiError(404, "Class not found")
    }

    // ✅ Access control check
    const isFaculty = classDetails.isFaculty(req.user._id)
    const isStudent = classDetails.isStudent(req.user._id)
    if (!isFaculty && !isStudent) {
        throw new ApiError(403, "You don't have access to this class")
    }

    const response = {
        _id: classDetails._id,
        subjectName: classDetails.subjectName,
        subjectCode: classDetails.subjectCode,
        semester: classDetails.semester,
        classSlot: classDetails.classSlot,
        venue: classDetails.venue,
        department: classDetails.department,
        academicYear: classDetails.academicYear,
        classCode: classDetails.classCode,
        faculty: classDetails.faculty,
        students: classDetails.students.filter((s) => s.status === "active"),
        totalStudents: classDetails.students.filter(
            (s) => s.status === "active"
        ).length,
        isArchived: classDetails.isArchived,
        createdAt: classDetails.createdAt,
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                response,
                "Class details retrieved successfully"
            )
        )
})

// Join class with code
const joinClassWithCode = asyncHandler(async (req, res) => {
    const { classCode } = req.params

    // ✅ Only students can join classes
    if (req.user.role !== "student") {
        throw new ApiError(403, "Only students can join classes")
    }

    const classDoc = await Class.findOne({
        classCode: classCode.toUpperCase(),
        isArchived: false,
    }).populate("faculty", "fullName")

    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    // Check if already enrolled
    const alreadyEnrolled = classDoc.students.some(
        (s) =>
            s.user.toString() === req.user._id.toString() &&
            s.status === "active"
    )

    if (alreadyEnrolled) {
        throw new ApiError(409, "You are already enrolled in this class")
    }

    // Add student
    classDoc.students.push({
        user: req.user._id,
        joinedAt: new Date(),
        status: "active",
    })

    await classDoc.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                class: {
                    _id: classDoc._id,
                    subjectName: classDoc.subjectName,
                    subjectCode: classDoc.subjectCode,
                    classCode: classDoc.classCode,
                    faculty: classDoc.faculty,
                    studentsCount: classDoc.students.filter(
                        (s) => s.status === "active"
                    ).length,
                },
            },
            "Successfully joined the class"
        )
    )
})

// ✅ Enhanced get class details
const getClassDetails = asyncHandler(async (req, res) => {
    const { classId } = req.params

    if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(400, "Invalid class ID")
    }

    // ✅ Simple class retrieval with basic population
    const classDetails = await Class.findById(classId)
        .populate("faculty", "fullName email") // Only basic faculty info
        .populate("students.user", "fullName email") // Only basic student info

    if (!classDetails) {
        throw new ApiError(404, "Class not found")
    }

    // ✅ Simple access control
    const hasAccess =
        classDetails.isFaculty(req.user._id) ||
        classDetails.isStudent(req.user._id)

    if (!hasAccess) {
        throw new ApiError(403, "You don't have access to this class")
    }

    // ✅ Simple response with just the essentials
    const response = {
        _id: classDetails._id,
        subjectName: classDetails.subjectName,
        subjectCode: classDetails.subjectCode,
        semester: classDetails.semester,
        classSlot: classDetails.classSlot,
        venue: classDetails.venue,
        department: classDetails.department,
        academicYear: classDetails.academicYear,
        classCode: classDetails.classCode,
        faculty: classDetails.faculty,
        students: classDetails.students.filter((s) => s.status === "active"),
        totalStudents: classDetails.getActiveStudentsCount(),
        isArchived: classDetails.isArchived,
        createdAt: classDetails.createdAt,
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                response,
                "Class details retrieved successfully"
            )
        )
})

// ✅ Enhanced add students with proper schema structure
// Add students to class
const addStudentsToClass = asyncHandler(async (req, res) => {
    const { classCode } = req.params
    const { studentIds } = req.body

    const classDoc = await Class.findOne({
        classCode: classCode.toUpperCase(),
        isArchived: false,
    })

    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    // ✅ Only faculty can add students
    if (classDoc.faculty.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only class faculty can add students")
    }

    // Find valid students
    const students = await User.find({
        _id: { $in: studentIds },
        role: "student",
        accountStatus: "active",
    }).select("fullName email")

    let addedCount = 0
    for (const student of students) {
        const exists = classDoc.students.some(
            (s) =>
                s.user.toString() === student._id.toString() &&
                s.status === "active"
        )

        if (!exists) {
            classDoc.students.push({
                user: student._id,
                joinedAt: new Date(),
                status: "active",
            })
            addedCount++
        }
    }

    await classDoc.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                addedStudents: addedCount,
                totalStudents: classDoc.students.filter(
                    (s) => s.status === "active"
                ).length,
            },
            `Successfully added ${addedCount} students`
        )
    )
})

// ✅ Enhanced remove student
// Remove student from class
const removeStudentFromClass = asyncHandler(async (req, res) => {
    const { classCode, studentId } = req.params

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError(400, "Invalid student ID")
    }

    const classDoc = await Class.findOne({
        classCode: classCode.toUpperCase(),
        isArchived: false,
    })

    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    if (classDoc.faculty.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only class faculty can remove students")
    }

    // Find and remove student
    const studentIndex = classDoc.students.findIndex(
        (s) => s.user.toString() === studentId && s.status === "active"
    )

    if (studentIndex === -1) {
        throw new ApiError(404, "Student not found in this class")
    }

    classDoc.students[studentIndex].status = "removed"
    await classDoc.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalStudents: classDoc.students.filter(
                    (s) => s.status === "active"
                ).length,
            },
            "Student removed from class successfully"
        )
    )
})

// ✅ Enhanced archive class
const archiveClass = asyncHandler(async (req, res) => {
    const { classCode } = req.params

    const classDoc = await Class.findOne({
        classCode: classCode.toUpperCase(),
    })

    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    if (classDoc.faculty.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only class faculty can archive the class")
    }

    if (classDoc.isArchived) {
        throw new ApiError(400, "Class is already archived")
    }

    classDoc.isArchived = true
    await classDoc.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                classCode: classDoc.classCode,
                isArchived: true,
            },
            "Class archived successfully"
        )
    )
})

// ✅ Unarchive class
const unarchiveClass = asyncHandler(async (req, res) => {
    const { classCode } = req.params

    const classDoc = await Class.findOne({
        classCode: classCode.toUpperCase(),
    })

    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    if (classDoc.faculty.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only class faculty can unarchive the class")
    }

    if (!classDoc.isArchived) {
        throw new ApiError(400, "Class is not archived")
    }

    classDoc.isArchived = false
    await classDoc.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                classCode: classDoc.classCode,
                isArchived: false,
            },
            "Class unarchived successfully"
        )
    )
})

// ✅ Assign class representative
const assignClassRepresentative = asyncHandler(async (req, res) => {
    const { classId, studentId } = req.params

    const classDoc = await Class.findById(classId)

    if (!classDoc) {
        throw new ApiError(404, "Class not found")
    }

    if (!classDoc.isFaculty(req.user._id)) {
        throw new ApiError(
            403,
            "Only class faculty can assign class representative"
        )
    }

    // ✅ Verify student is in the class
    if (!classDoc.isStudent(studentId)) {
        throw new ApiError(
            400,
            "Student must be enrolled in the class to be assigned as representative"
        )
    }

    // ✅ Assign as class representative (keep role as student)

    classDoc.classRepresentative = studentId
    await classDoc.save()

    await classDoc.populate("classRepresentative", "fullName email studentId")

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                classRepresentative: classDoc.classRepresentative,
            },
            "Class representative assigned successfully"
        )
    )
})

/*
// ✅ Join class with code
const joinClassWithCode = asyncHandler(async (req, res) => {
    const { classCode } = req.params

    if (req.user.role !== "student") {
        throw new ApiError(403, "Only students can join classes")
    }

    if (!classCode || classCode.length !== 6) {
        throw new ApiError(400, "Invalid class code")
    }

    const classDoc = await Class.findOne({
        classCode: classCode.toUpperCase(),
        isArchived: false,
    }).populate("faculty", "fullName")

    if (!classDoc) {
        throw new ApiError(404, "Class not found or archived")
    }

    // ✅ Add student to class
    const added = classDoc.addStudent(req.user._id)

    if (!added) {
        throw new ApiError(409, "You are already enrolled in this class")
    }

    await classDoc.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                class: {
                    _id: classDoc._id,
                    subjectName: classDoc.subjectName,
                    subjectCode: classDoc.subjectCode,
                    classCode: classDoc.classCode,
                    faculty: classDoc.faculty,
                    studentsCount: classDoc.getActiveStudentsCount(),
                },
            },
            "Successfully joined the class"
        )
    )
})
*/

// ✅ Get user's classes (student or faculty)
const getUserClasses = asyncHandler(async (req, res) => {
    const { role } = req.user
    let classes

    if (role === "faculty") {
        classes = await Class.find({
            faculty: req.user._id,
            isArchived: false,
        })
            .populate("students.user", "fullName email studentId")
            .sort({ createdAt: -1 })
    } else {
        classes = await Class.find({
            "students.user": req.user._id,
            "students.status": "active",
            isArchived: false,
        })
            .populate("faculty", "fullName email facultyId")
            .sort({ createdAt: -1 })
    }

    return res
        .status(200)
        .json(new ApiResponse(200, classes, "Classes retrieved successfully"))
})

export {
    createClass,
    getClassByCode,
    getClassDetails,
    addStudentsToClass,
    removeStudentFromClass,
    archiveClass,
    unarchiveClass,
    assignClassRepresentative,
    joinClassWithCode,
    getUserClasses,
}
