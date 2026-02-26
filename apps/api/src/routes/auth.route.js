// routes/auth.routes.js
import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    registerUser,
    verifyEmail,
    resendVerificationEmail,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    sendOtp,
    verifyOtp,
} from "../controllers/auth.controller.js"

const router = Router()

// Public routes
router.route("/register").post(registerUser)
router.route("/send-otp").post(sendOtp)
router.route("/verify-otp").post(verifyOtp)
router.route("/verify-email/:token").get(verifyEmail)
router.route("/resend-verification").post(resendVerificationEmail)
router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

// Protected routes
router.use(verifyJWT)
router.route("/logout").post(logoutUser)
router.route("/change-password").post(changeCurrentPassword)

export default router
