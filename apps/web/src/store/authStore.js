// store/authStore.js
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { api } from "../services/api.js"

export const useAuthStore = create()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            loading: true,

            // Initialize auth state from storage
            initializeAuth: () => {
                const state = get()
                if (state.accessToken && state.user) {
                    set({ isAuthenticated: true, loading: false })
                } else {
                    set({ loading: false })
                }
            },

            // Login
            login: async (identifier, password) => {
                const response = await api.post("/auth/login", {
                    identifier,
                    password,
                })
                const { user, accessToken } = response.data.data

                set({ user, accessToken, isAuthenticated: true })
            },

            // Admin Login
            loginAdmin: async (identifier, password) => {
                const response = await api.post("/admin/login", {
                    identifier,
                    password,
                })
                const { user, accessToken } = response.data.data

                set({ user, accessToken, isAuthenticated: true })
            },

            // Register
            register: async (userData) => {
                const response = await api.post("/auth/register", userData)
                console.log("Registration response:", response)
            },

            // Send OTP
            sendOtp: async (email, fullName) => {
                const response = await api.post("/auth/send-otp", {
                    email,
                    fullName,
                })
                return response.data
            },

            // Verify OTP
            verifyOtp: async (email, otp) => {
                const response = await api.post("/auth/verify-otp", {
                    email,
                    otp,
                })
                return response.data
            },

            // Logout
            logout: async () => {
                try {
                    await api.post("/auth/logout")
                } catch (error) {
                    console.error("Logout error:", error)
                } finally {
                    set({
                        user: null,
                        accessToken: null,
                        isAuthenticated: false,
                    })
                }
            },

            // Update user data
            updateUser: (userData) => {
                const updatedUser = { ...get().user, ...userData }
                set({ user: updatedUser })
            },
        }),
        {
            name: "auth-storage",
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)
