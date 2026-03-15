import axios from "axios"

// Use environment variable with fallback to correct local port (24000)
const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:24000/api/v1"

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // For cookies
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 120000, // 2 minutes (needed for AI generation)
})

// Helper to get token from Zustand persist storage
const getStoredToken = () => {
    try {
        const authStorage = localStorage.getItem("auth-storage")
        if (authStorage) {
            const parsed = JSON.parse(authStorage)
            return parsed?.state?.accessToken || null
        }
    } catch (error) {
        console.error("Failed to get token from storage:", error)
    }
    return null
}

// Add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = getStoredToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const requestUrl = String(error?.config?.url || "")
            const isAuthFormRequest =
                requestUrl.includes("/auth/login") ||
                requestUrl.includes("/auth/register") ||
                requestUrl.includes("/auth/send-otp") ||
                requestUrl.includes("/auth/verify-otp")

            // Let public auth forms handle their own validation errors.
            if (isAuthFormRequest) {
                return Promise.reject(error)
            }

            const hasToken = Boolean(getStoredToken())
            if (hasToken) {
                // Session expired on protected API call.
                localStorage.removeItem("auth-storage")
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login"
                }
            }
        }
        return Promise.reject(error)
    }
)

export default api
