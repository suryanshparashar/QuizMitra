import dotenv from "dotenv"
import { app } from "./app.js"
import connectDB from "./db/index.js"

dotenv.config({
    path: ".env",
})

// // ✅ Debug environment loading
// console.log("🔍 Environment Debug:")
// console.log("NODE_ENV:", process.env.NODE_ENV || "not set")
// console.log("MONGODB_URI:", process.env.MONGODB_URI ? "✅ Set" : "❌ Not set")
// console.log("PORT:", process.env.PORT || "not set")
// console.log("CORS_ORIGINS:", process.env.CORS_ORIGINS || "not set")

const PORT = process.env.PORT || 8001

connectDB()
    .then(() => {
        console.log(`Server connected to MongoDB`)
        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
        })
    })
    .catch((error) => {
        console.error("MongoDB connection error: ", error)
        process.exit(1)
    })


export default app