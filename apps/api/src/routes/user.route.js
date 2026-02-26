import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    getUserById,
    searchUsers,
    updatePassword,
    getUserDashboardStats,
    deactivateAccount,
    // deleteAccount,
} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router()
router.use(verifyJWT)

router.route("/profile").get(getCurrentUser)
router.route("/update-details").patch(updateAccountDetails)
router.route("/avatar").patch(upload.single("avatar"), updateUserAvatar)
router.route("/public/:userId").get(getUserById)
router.route("/search").get(searchUsers)
// router.route("/delete-account").delete(deleteAccount)
router.route("/change-password").post(updatePassword)
router.route("/dashboard-stats").get(getUserDashboardStats)
router.route("/deactivate").post(deactivateAccount)

export default router
