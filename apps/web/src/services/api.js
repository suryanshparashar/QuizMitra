import axios from "axios"

// Use environment variable with fallback to correct local port (8001)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api/v1"

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // For cookies
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000, // 15 seconds
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
            // Token expired, clear auth data
            localStorage.removeItem("auth-storage")
            window.location.href = "/login"
        }
        return Promise.reject(error)
    }
)

export default api

