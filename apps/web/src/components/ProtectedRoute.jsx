// components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore.js"
import { getDashboardPath } from "../utils/getDashboardPath.js"

export default function ProtectedRoute({ children, requiredRole }) {
    const { isAuthenticated, user, loading } = useAuthStore()

    // Show loading while checking auth status
    if (loading) {
        return <div>Loading...</div>
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />
    }

    // Check role-based access
    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to={getDashboardPath(user.role)} replace />
    }

    return children
}
