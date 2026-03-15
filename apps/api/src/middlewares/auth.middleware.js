import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import { Admin } from "../models/admin.model.js"
import { ApiError, asyncHandler } from "../utils/index.js"

const isDevAuthLogEnabled =
    String(process.env.NODE_ENV || "development") !== "production"

const authDebugLog = (message, meta = {}) => {
    if (!isDevAuthLogEnabled) return
    console.log(`[DEV][AUTH] ${message}`, meta)
}

const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "")

        authDebugLog("verifyJWT token source check", {
            method: req.method,
            path: req.originalUrl,
            hasAccessTokenCookie: Boolean(req.cookies?.accessToken),
            hasAuthorizationHeader: Boolean(req.header("Authorization")),
        })

        if (!token) {
            authDebugLog("verifyJWT rejected: token missing", {
                method: req.method,
                path: req.originalUrl,
            })
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const principalModel = ["admin", "superadmin"].includes(
            decodedToken?.role
        )
            ? Admin
            : User
        const user = await principalModel.findById(decodedToken?._id)

        if (!user) {
            authDebugLog("verifyJWT rejected: user not found", {
                method: req.method,
                path: req.originalUrl,
                decodedUserId: decodedToken?._id || null,
                expectedRole: decodedToken?.role || "unknown",
            })
            throw new ApiError(401, "Invalid access token: User not found")
        }

        req.user = user
        authDebugLog("verifyJWT success", {
            method: req.method,
            path: req.originalUrl,
            userId: String(user._id),
            role: user.role,
        })
        next()
    } catch (error) {
        authDebugLog("verifyJWT error", {
            method: req.method,
            path: req.originalUrl,
            message: error?.message,
            name: error?.name,
        })
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError(401, `Invalid access token: ${error.message}`)
    }
})

export { verifyJWT }
