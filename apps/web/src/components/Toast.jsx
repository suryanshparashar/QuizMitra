/**
 * Toast — Styled toast wrapper around react-hot-toast.
 * Based on QuizMitra Design System Document §5.7.
 *
 * Features:
 * - Semantic color tokens (Success, Error, Warning, Info)
 * - Full dark mode support respecting data-theme attribute
 * - Design system compliant spacing and shadows
 * - 5-second auto-dismiss with max width 360px
 *
 * Usage:
 *   import { showToast } from '../components/Toast';
 *   showToast.success("Quiz published!");
 *   showToast.error("Failed to save.");
 */

import toast, { Toaster } from "react-hot-toast"

const logToastErrorInDev = (message) => {
    if (!import.meta.env.DEV) return
    console.error("[Toast Error]", message)
}

/**
 * Detects current theme from data-theme attribute
 * Falls back to light mode if not set
 */
const isDarkMode = () => {
    const theme = document.documentElement.getAttribute("data-theme")
    if (theme === "dark") return true
    if (theme === "light") return false
    // Fallback: check system preference if "system" mode
    return window.matchMedia("(prefers-color-scheme: dark)").matches
}

/**
 * Gets theme-aware colors for different toast types
 */
const getToastStyles = () => {
    const dark = isDarkMode()
    return {
        light: {
            background: "rgba(255,255,255,0.98)",
            color: "#111827",
            boxShadow: "0 10px 15px rgba(0, 0, 0, 0.1)",
        },
        dark: {
            background: "rgba(15,23,42,0.98)",
            color: "#F8FAFC",
            boxShadow: "0 10px 15px rgba(0, 0, 0, 0.3)",
        },
    }[dark ? "dark" : "light"]
}

const baseStyle = {
    borderRadius: "12px",
    padding: "16px",
    fontSize: "14px",
    fontWeight: 600,
    maxWidth: "360px",
}

export const showToast = {
    success: (message) => {
        const themeStyles = getToastStyles()
        return toast.success(message, {
            style: {
                ...baseStyle,
                ...themeStyles,
                borderLeft: "4px solid #16A34A",
            },
            iconTheme: { primary: "#16A34A", secondary: "#fff" },
        })
    },

    error: (message) => {
        logToastErrorInDev(message)
        const themeStyles = getToastStyles()
        return toast.error(message, {
            style: {
                ...baseStyle,
                ...themeStyles,
                borderLeft: "4px solid #DC2626",
            },
            iconTheme: { primary: "#DC2626", secondary: "#fff" },
        })
    },

    info: (message) => {
        const themeStyles = getToastStyles()
        return toast(message, {
            style: {
                ...baseStyle,
                ...themeStyles,
                borderLeft: "4px solid #0891B2",
            },
            icon: "ℹ️",
        })
    },

    warning: (message) => {
        const themeStyles = getToastStyles()
        return toast(message, {
            style: {
                ...baseStyle,
                ...themeStyles,
                borderLeft: "4px solid #EA580C",
            },
            icon: "⚠️",
        })
    },
}

/**
 * Drop <ToastProvider /> once in the component tree (App.jsx).
 */
export function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 5000,
                style: {
                    maxWidth: "360px",
                },
            }}
        />
    )
}
