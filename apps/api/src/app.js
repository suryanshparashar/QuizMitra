import cors from "cors"
import express from "express"
import cookieParser from "cookie-parser"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import { errorHandler } from "./middlewares/errorHandler.middleware.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const indexHtmlPath = path.join(__dirname, "..", "public", "index.html")

const app = express()

app.use(
    cors({
        origin: process.env.CORS_ORIGIN?.split(",") || [
            "http://localhost:5173",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
)

// Common Middlewares
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Route imports
import healthcheckRouter from "./routes/healthcheck.route.js"
import authRoutes from "./routes/auth.route.js"
import userRoutes from "./routes/user.route.js"
import classRoutes from "./routes/class.route.js"
import quizRoutes from "./routes/quiz.route.js"
import quizAttemptRoutes from "./routes/quizAttempt.route.js"
import quizGradingRoutes from "./routes/quizGrading.route.js"
import dashboardRoutes from "./routes/dashboard.route.js"
import classMessageRoutes from "./routes/classMessage.route.js"
import analyticsRoutes from "./routes/analytics.route.js"
import searchRoutes from "./routes/search.route.js"
import notificationRoutes from "./routes/notification.route.js"

// Route setup
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/users", userRoutes)
app.use("/api/v1/classes", classRoutes)
app.use("/api/v1/quizzes", quizRoutes)
app.use("/api/v1/quiz-attempts", quizAttemptRoutes)
app.use("/api/v1/quiz-grading", quizGradingRoutes)
app.use("/api/v1/dashboard", dashboardRoutes)
app.use("/api/v1/class-messages", classMessageRoutes)
app.use("/api/v1/analytics", analyticsRoutes)
app.use("/api/v1/search", searchRoutes)
app.use("/api/v1/notifications", notificationRoutes)

// SPA Fallback — serve index.html for all non-API GET routes
// Only active when the frontend is co-deployed (index.html exists in public/)
// In production API-only deployments (e.g. Render), this is safely skipped
app.get(/^(?!\/api\/v1).*$/, (req, res, next) => {
    if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath)
    } else {
        next()
    }
})

// Global Error Handler Middleware
app.use(errorHandler)

export { app }
