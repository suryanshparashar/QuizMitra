import { Router } from "express"
import {
    aiHealthcheck,
    healthcheck,
} from "../controllers/healthcheck.controller.js"

const router = Router()

router.route("/").get(healthcheck)
router.route("/test").get(healthcheck)
router.route("/ai").get(aiHealthcheck)

export default router
