import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    createMessage,
    getClassMessages,
    getMessage,
    addComment,
    deleteMessage,
    deleteComment,
    getUserMessages,
    // updateMessage,
    // updateComment,
    // getMessageAnalytics
} from "../controllers/classMessage.controller.js"

const router = Router()
router.use(verifyJWT)

// Class message routes
router.route("/class/:classId/messages").get(getClassMessages)
router.route("/class/:classId/messages").post(createMessage)
// router.route("/class/:classId/analytics").get(getMessageAnalytics)

// Individual message routes
router.route("/messages/:messageId").get(getMessage)
// router.route("/messages/:messageId").patch(updateMessage)
router.route("/messages/:messageId").delete(deleteMessage)

// Comment routes
router.route("/messages/:messageId/comments").post(addComment)
// router.route("/messages/:messageId/comments/:commentId").patch(updateComment)
router.route("/messages/:messageId/comments/:commentId").delete(deleteComment)

// User's messages
router.route("/my-messages").get(getUserMessages)

export default router
