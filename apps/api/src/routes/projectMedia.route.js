import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { uploadFeatureMedia } from "../middlewares/multer.middleware.js"
import {
    uploadProjectMedia,
    getPublicProjectMedia,
    getAdminAllowedProjectMedia,
    getAdminMediaDownloadLink,
    getAdminProjectMedia,
    updateProjectMedia,
    unpublishProjectMedia,
    publishProjectMedia,
    deleteProjectMedia,
} from "../controllers/projectMedia.controller.js"

const router = Router()

// Public route (works with or without login)
router.route("/public").get(getPublicProjectMedia)

// Superadmin-only upload route
router.use(verifyJWT)
router.route("/admin").get(getAdminAllowedProjectMedia)
router.route("/admin/:id/download-link").get(getAdminMediaDownloadLink)

router
    .route("/superadmin/upload")
    .post(uploadFeatureMedia.single("media"), uploadProjectMedia)
router.route("/superadmin").get(getAdminProjectMedia)
router
    .route("/superadmin/:id")
    .patch(uploadFeatureMedia.single("media"), updateProjectMedia)
    .delete(deleteProjectMedia)
router.route("/superadmin/:id/unpublish").patch(unpublishProjectMedia)
router.route("/superadmin/:id/publish").patch(publishProjectMedia)

export default router
