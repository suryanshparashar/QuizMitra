import { ApiError } from "../utils/index.js"

const errorHandler = (err, req, res, next) => {
    // ✅ Added 'req' and 'next'
    console.error("🚨 Error Handler Triggered:", err.message)
    console.error("🚨 Error Stack:", err.stack)

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            statusCode: err.statusCode,
            message: err.message,
            success: err.success,
            errors: err.errors,
        })
    }

    // ✅ Handle Mongoose validation errors
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message)
        return res.status(400).json({
            statusCode: 400,
            message: messages.join(", "),
            success: false,
            errors: messages,
        })
    }

    // ✅ Handle duplicate key errors (11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0]
        const message = `${field} already exists`
        return res.status(409).json({
            statusCode: 409,
            message,
            success: false,
            errors: [message],
        })
    }

    // ✅ Default error
    console.error("❌ Unexpected error:", err)

    return res.status(500).json({
        statusCode: 500,
        message: err.message || "Internal Server Error",
        success: false,
        errors: [],
    })
}

export { errorHandler }
