/**
 * Toast — Styled toast wrapper around react-hot-toast.
 * Based on QuizMitra Design System Document §5.7.
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

export const showToast = {
    success: (message) =>
        toast.success(message, {
            style: {
                borderRadius: "14px",
                padding: "16px",
                fontSize: "14px",
                fontWeight: 600,
                borderLeft: "4px solid #16A34A",
                background: "rgba(255,255,255,0.94)",
                color: "#111827",
                boxShadow: "0 16px 28px rgba(26, 40, 78, 0.16)",
            },
            iconTheme: { primary: "#16A34A", secondary: "#fff" },
        }),

    error: (message) => {
        logToastErrorInDev(message)
        return toast.error(message, {
            style: {
                borderRadius: "14px",
                padding: "16px",
                fontSize: "14px",
                fontWeight: 600,
                borderLeft: "4px solid #DC2626",
                background: "rgba(255,255,255,0.94)",
                color: "#111827",
                boxShadow: "0 16px 28px rgba(26, 40, 78, 0.16)",
            },
            iconTheme: { primary: "#DC2626", secondary: "#fff" },
        })
    },

    info: (message) =>
        toast(message, {
            style: {
                borderRadius: "14px",
                padding: "16px",
                fontSize: "14px",
                fontWeight: 600,
                borderLeft: "4px solid #335DE8",
                background: "rgba(255,255,255,0.94)",
                color: "#111827",
                boxShadow: "0 16px 28px rgba(26, 40, 78, 0.16)",
            },
            icon: "ℹ️",
        }),

    warning: (message) =>
        toast(message, {
            style: {
                borderRadius: "14px",
                padding: "16px",
                fontSize: "14px",
                fontWeight: 600,
                borderLeft: "4px solid #EA580C",
                background: "rgba(255,255,255,0.94)",
                color: "#111827",
                boxShadow: "0 16px 28px rgba(26, 40, 78, 0.16)",
            },
            icon: "⚠️",
        }),
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
