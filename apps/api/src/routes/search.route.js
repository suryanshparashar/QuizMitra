import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    searchGlobal,
    searchClasses,
    searchQuizzes,
    searchUsers,
    searchMessages,
    getSearchSuggestions,
    getRecentSearches,
    saveSearch
} from "../controllers/search.controller.js"

const router = Router()
router.use(verifyJWT)

// Global search
router.route("/").get(searchGlobal)

// Specific searches
router.route("/classes").get(searchClasses)
router.route("/quizzes").get(searchQuizzes)
router.route("/users").get(searchUsers)
router.route("/messages").get(searchMessages)

// Search utilities
router.route("/suggestions").get(getSearchSuggestions)
router.route("/recent").get(getRecentSearches)
router.route("/save").post(saveSearch)

export default router
