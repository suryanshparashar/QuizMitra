import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    getUserById,
    searchUsers,
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

export default router
