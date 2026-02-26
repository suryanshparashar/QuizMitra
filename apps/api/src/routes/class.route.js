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
    assignClassRepresentative,
    removeClassRepresentative,
    updateCRPermissions,
    leaveClass,
    getClassDetails,
} from "../controllers/class.controller.js"

const router = Router()
router.use(verifyJWT)

// ✅ Class CRUD operations
router.route("/create").post(createClass)
router.route("/my-classes").get(getUserClasses)

// ✅ Class code based routes (MUST be before dynamic :classId routes)
router.route("/:classCode/join").post(joinClassWithCode)
router.route("/:classCode").get(getClassByCode) // Get class by code instead of ID
router.route("/id/:classId").get(getClassDetails) // Re-enable GET class by ID for ClassDetails.jsx
router.route("/:classCode/students/add").post(addStudentsToClass)
router
    .route("/:classCode/students/:studentId/remove")
    .delete(removeStudentFromClass)
// ✅ Leave Class
router.route("/:classCode/leave").delete(leaveClass)

router.route("/:classCode/archive").patch(archiveClass)
router.route("/:classCode/unarchive").patch(unarchiveClass)

// ✅ Class Representative Management
router.route("/:classId/cr/assign/:studentId").post(assignClassRepresentative)
router.route("/:classId/cr/remove").delete(removeClassRepresentative)
router.route("/:classId/cr/permissions").patch(updateCRPermissions)

export default router
