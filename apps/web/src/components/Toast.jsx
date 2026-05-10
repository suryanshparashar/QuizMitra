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
    return window.matchMedia("(prefers-color-scheme: dark)").matches
}

/**
 * Gets theme-aware colors for different toast types
 * Using the Deep Indigo / Navy palette from the new design system
 */
const getToastStyles = () => {
    const dark = isDarkMode()
    return {
        light: {
            background: "rgba(255, 255, 255, 0.85)",
            color: "#0F172A",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)",
            borderColor: "rgba(15, 23, 42, 0.08)",
            backdropFilter: "blur(16px)",
        },
        dark: {
            background: "rgba(15, 23, 42, 0.85)",
            color: "#F8FAFC",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            borderColor: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(16px)",
        },
    }[dark ? "dark" : "light"]
}

const baseStyle = {
    borderRadius: "20px",
    padding: "16px 20px",
    fontSize: "14px",
    fontWeight: 600,
    maxWidth: "380px",
    border: "1px solid",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
}

export const showToast = {
    success: (message) => {
        const themeStyles = getToastStyles()
        return toast.success(message, {
            style: {
                ...baseStyle,
                ...themeStyles,
                borderColor: themeStyles.borderColor,
                borderLeft: "6px solid #16A34A",
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
                borderColor: themeStyles.borderColor,
                borderLeft: "6px solid #DC2626",
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
                borderColor: themeStyles.borderColor,
                borderLeft: "6px solid #0891B2",
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
                borderColor: themeStyles.borderColor,
                borderLeft: "6px solid #EA580C",
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
