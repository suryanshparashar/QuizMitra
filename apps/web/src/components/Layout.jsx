import { Outlet, Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore.js"

export default function Layout() {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate("/login")
    }

    return (
        <div>
            <header>
                <nav>
                    <Link to="/dashboard">QuizGuard</Link>

                    {user && (
                        <div>
                            <Link to="/dashboard">Dashboard</Link>
                            <Link to="/profile">Profile</Link>
                            {user.role === "faculty" && (
                                <>
                                    <Link to="/classes/create">
                                        Create Class
                                    </Link>
                                    <Link to="/quizzes/create">
                                        Create Quiz
                                    </Link>
                                </>
                            )}
                            {user.role === "student" && (
                                <Link to="/classes/join">Join Class</Link>
                            )}
                            <button onClick={handleLogout}>Logout</button>
                        </div>
                    )}
                </nav>
            </header>

            <main>
                <Outlet />
            </main>
        </div>
    )
}
