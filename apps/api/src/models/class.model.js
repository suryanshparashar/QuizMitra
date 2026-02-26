// models/Class.model.js
import mongoose, { Schema } from "mongoose"

// ✅ Check if model already exists
if (mongoose.models.Class) {
    delete mongoose.models.Class
}

const classSchema = new Schema(
    {
        // Basic class info (from your form)
        subjectName: {
            type: String,
            required: [true, "Subject name is required"],
            trim: true,
            maxlength: [100, "Subject name cannot exceed 100 characters"],
        },

        subjectCode: {
            type: String,
            required: [true, "Subject code is required"],
            uppercase: true,
            trim: true,
        },

        semester: {
            type: String,
            required: [true, "Semester is required"],
            trim: true,
        },

        classSlot: {
            type: String,
            required: [true, "Class slot is required"],
            trim: true,
            uppercase: true,
        },

        venue: {
            type: String,
            required: [true, "Venue is required"],
            trim: true,
        },

        department: {
            type: String,
            required: [true, "Department is required"],
            trim: true,
            uppercase: true,
        },

        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            trim: true,
        },

        // Faculty who created the class
        faculty: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Faculty is required"],
            index: true,
        },

        // Students in the class
        students: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                joinedAt: {
                    type: Date,
                    default: Date.now,
                },
                status: {
                    type: String,
                    enum: ["active", "inactive", "removed"],
                    default: "active",
                },
            },
        ],

        // Auto-generated class code for joining
        classCode: {
            type: String,
            unique: true,
            uppercase: true,
            index: true,
        },

        // Class Representative
        classRepresentative: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        // CR Permissions
        crPermissions: {
            viewReports: { type: Boolean, default: false },
            viewAnalytics: { type: Boolean, default: false },
            viewAPIStats: { type: Boolean, default: false },
            manageQuizzes: { type: Boolean, default: false },
        },

        // Basic status
        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
)

// ✅ Basic indexes
classSchema.index({ "students.user": 1 })

// ✅ Pre-save middleware to generate class code
classSchema.pre("save", async function (next) {
    if (!this.classCode) {
        this.classCode = await this.generateClassCode()
    }
    next()
})

// ✅ Essential methods only
classSchema.methods.isFaculty = function (userId) {
    const facultyId = this.faculty?._id || this.faculty
    return facultyId?.toString() === userId.toString()
}

classSchema.methods.isStudent = function (userId) {
    return this.students.some((student) => {
        const studentUserId = student.user?._id || student.user
        return (
            studentUserId?.toString() === userId.toString() &&
            student.status === "active"
        )
    })
}

classSchema.methods.generateClassCode = async function () {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code
    let isUnique = false

    while (!isUnique) {
        code = ""
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(
                Math.floor(Math.random() * characters.length)
            )
        }

        const existing = await this.constructor.findOne({ classCode: code })
        if (!existing) {
            isUnique = true
        }
    }

    return code
}

classSchema.methods.addStudent = function (userId) {
    // Check if already exists
    const existing = this.students.find(
        (s) => s.user.toString() === userId.toString()
    )
    if (existing && existing.status === "active") {
        return false // Already active
    }

    if (existing && existing.status !== "active") {
        // Reactivate student
        existing.status = "active"
        existing.joinedAt = new Date()
    } else {
        // Add new student
        this.students.push({
            user: userId,
            joinedAt: new Date(),
            status: "active",
        })
    }

    return true
}

classSchema.methods.getActiveStudentsCount = function () {
    return this.students.filter((s) => s.status === "active").length
}

export const Class =
    mongoose.models.Class || mongoose.model("Class", classSchema)
