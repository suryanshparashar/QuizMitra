import mongoose, { Schema } from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

if (mongoose.models.Admin) {
    delete mongoose.models.Admin
}

const adminSchema = new Schema(
    {
        role: {
            type: String,
            enum: ["admin", "superadmin"],
            default: "admin",
            required: true,
            index: true,
        },

        // Separate identifiers for admin and superadmin accounts.
        adminId: {
            type: String,
            unique: true,
            sparse: true,
            uppercase: true,
            trim: true,
        },

        superAdminId: {
            type: String,
            unique: true,
            sparse: true,
            uppercase: true,
            trim: true,
        },

        name: {
            type: String,
            required: [true, "Name is required"],
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
        isEmailVerified: {
            type: Boolean,
            default: true,
        },
        accountStatus: {
            type: String,
            enum: ["active", "suspended", "deactivated"],
            default: "active",
        },
        refreshToken: {
            type: String,
            select: false,
        },
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.password
                delete ret.refreshToken
                return ret
            },
        },
        toObject: {
            virtuals: true,
        },
    }
)

// Backward compatibility: existing controller code may still use `fullName`.
adminSchema
    .virtual("fullName")
    .get(function () {
        return this.name
    })
    .set(function (value) {
        this.name = value
    })

adminSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12)
    }
    next()
})

adminSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

adminSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            role: this.role,
            email: this.email,
            fullName: this.name,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )
}

adminSchema.methods.generateRefreshToken = function () {
    return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    })
}

export const Admin =
    mongoose.models.Admin || mongoose.model("Admin", adminSchema)
