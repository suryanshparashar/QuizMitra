import mongoose, { Schema } from "mongoose"

// Check if model already exists
if (mongoose.models.Otp) {
    delete mongoose.models.Otp
}

const otpSchema = new Schema({
    email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
        index: true,
    },
    otp: {
        type: String,
        required: [true, "OTP is required"],
    },
    createdAt: {
        type: Date,
        default: Date.now,
        // Automatically delete documents after 10 minutes (600 seconds)
        // NOTE: timestamps:true is intentionally omitted so findOneAndUpdate
        // can reset createdAt (and thus the TTL) when a new OTP is requested.
        expires: 600,
    },
})

export const Otp = mongoose.models.Otp || mongoose.model("Otp", otpSchema)
