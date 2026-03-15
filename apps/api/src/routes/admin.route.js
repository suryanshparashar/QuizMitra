import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    getAdminDashboard,
    registerAdmin,
    loginAdmin,
    getSuperAdminDashboard,
    listAdmins,
    updateAdminStatus,
    deleteAdmin,
    listUsers,
    updateUserStatus,
} from "../controllers/admin.controller.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const router = Router()

// Postman-only style endpoint protected by server registration key
router
    .route("/register")
    .post(registerAdmin)
    .all((req, res) => {
        return res
            .status(405)
            .json(
                new ApiResponse(
                    405,
                    {},
                    "Method not allowed. Use POST /api/v1/admin/register"
                )
            )
    })

router
    .route("/login")
    .post(loginAdmin)
    .all((req, res) => {
        return res
            .status(405)
            .json(
                new ApiResponse(
                    405,
                    {},
                    "Method not allowed. Use POST /api/v1/admin/login"
                )
            )
    })

// All routes below require a valid JWT
router.use(verifyJWT)

// Admin dashboard (admin + superadmin)
router.route("/dashboard").get(getAdminDashboard)

// Superadmin-only routes
router.route("/superadmin/dashboard").get(getSuperAdminDashboard)
router.route("/superadmin/admins").get(listAdmins)
router.route("/superadmin/admins/:id/status").patch(updateAdminStatus)
router.route("/superadmin/admins/:id").delete(deleteAdmin)
router.route("/superadmin/users").get(listUsers)
router.route("/superadmin/users/:id/status").patch(updateUserStatus)

export default router
