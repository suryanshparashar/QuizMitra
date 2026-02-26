// models/User.model.js
import mongoose, { Schema } from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

// ✅ Check if model already exists
if (mongoose.models.User) {
    delete mongoose.models.User
}

const userSchema = new Schema(
    {
        // Basic role
        role: {
            type: String,
            enum: ["faculty", "student"],
            required: [true, "User role is required"],
            index: true,
        },

        // Faculty ID (no validation - college-specific)
        facultyId: {
            type: String,
            unique: true,
            uppercase: true,
            trim: true,
            sparse: true,
            required: function () {
                return this.role === "faculty"
            },
        },

        // Student ID (no validation - college-specific)
        studentId: {
            type: String,
            unique: true,
            uppercase: true,
            trim: true,
            sparse: true,
            required: function () {
                return this.role === "student"
            },
        },

        // Basic user info
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            maxlength: [100, "Name cannot exceed 100 characters"],
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            validate: {
                validator: function (email) {
                    const emailRegex =
                        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
                    return emailRegex.test(email)
                },
                message: "Please enter a valid email address",
            },
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false,
        },

        // Student-specific fields (from your form)
        year: {
            type: Number,
            required: function () {
                return this.role === "student"
            },
        },

        branch: {
            type: String,
            trim: true,
            uppercase: true,
            required: function () {
                return this.role === "student"
            },
        },

        // Faculty-specific fields (from your form)
        department: {
            type: String,
            trim: true,
            uppercase: true,
            required: function () {
                return this.role === "faculty"
            },
        },

        designation: {
            type: String,
            trim: true,
            required: function () {
                return this.role === "faculty"
            },
        },

        // Account status
        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        accountStatus: {
            type: String,
            enum: ["active", "pending", "suspended"],
            default: "pending",
        },

        // Tokens
        refreshToken: {
            type: String,
            select: false,
        },

        emailVerificationToken: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.password
                delete ret.refreshToken
                delete ret.emailVerificationToken
                return ret
            },
        },
    }
)

// ✅ Basic indexes
// Indexes for email, facultyId, and studentId are automatically created due to 'unique: true'

// ✅ Virtual for display ID
userSchema.virtual("displayId").get(function () {
    return this.role === "faculty" ? this.facultyId : this.studentId
})

// ✅ Hash password before save
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12)
    }
    next()
})

// ✅ Methods
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            role: this.role,
            email: this.email,
            fullName: this.fullName,
            displayId: this.displayId,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    })
}

export const User = mongoose.models.User || mongoose.model("User", userSchema)
