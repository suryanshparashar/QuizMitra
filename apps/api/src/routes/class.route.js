// routes/class.routes.js
import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    createClass,
    getClassByCode,
    addStudentsToClass,
    removeStudentFromClass,
    archiveClass,
    unarchiveClass,
    joinClassWithCode,
    getUserClasses,
} from "../controllers/class.controller.js"

const router = Router()
router.use(verifyJWT)

// ✅ Class CRUD operations
router.route("/create").post(createClass)
router.route("/my-classes").get(getUserClasses)

// ✅ Class code based routes (MUST be before dynamic :classId routes)
router.route("/:classCode/join").post(joinClassWithCode)
router.route("/:classCode").get(getClassByCode) // Get class by code instead of ID
router.route("/:classCode/students/add").post(addStudentsToClass)
router
    .route("/:classCode/students/:studentId/remove")
    .delete(removeStudentFromClass)
router.route("/:classCode/archive").patch(archiveClass)
router.route("/:classCode/unarchive").patch(unarchiveClass)

export default router
