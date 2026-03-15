/**
 * Returns the role-specific dashboard path for a given user role.
 * Used to keep navigation consistent across the app.
 */
export const getDashboardPath = (role) => {
    switch (role) {
        case "superadmin":
            return "/superadmin/dashboard"
        case "admin":
            return "/admin/dashboard"
        case "faculty":
            return "/faculty/dashboard"
        case "student":
            return "/student/dashboard"
        default:
            return "/login"
    }
}
