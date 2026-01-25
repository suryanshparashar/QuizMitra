import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom"
import { useAuthStore } from "./store/authStore"
import { useEffect } from "react"

// Layout Components
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"

// Auth Pages
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import VerifyEmail from "./pages/auth/VerifyEmail"

// Dashboard Pages
import FacultyDashboard from "./pages/dashboard/FacultyDashboard"
import StudentDashboard from "./pages/dashboard/StudentDashboard"

// Class Pages
import CreateClass from "./pages/classes/CreateClass"
import JoinClass from "./pages/classes/JoinClass"
import ClassDetails from "./pages/classes/ClassDetails"

// Quiz Pages
import CreateQuiz from "./pages/quizzes/CreateQuiz"
import QuizDetails from "./pages/quizzes/QuizDetails"
import TakeQuiz from "./pages/quizzes/TakeQuiz"
import QuizResults from "./pages/quizzes/QuizResults"

// Profile Pages
import Profile from "./pages/profile/Profile"

// Error Pages
import NotFound from "./pages/errors/NotFound"

function App() {
    const { user, isAuthenticated, initializeAuth } = useAuthStore()

    useEffect(() => {
        // Initialize auth state from localStorage on app start
        initializeAuth()
    }, [initializeAuth])

    return (
        <Router>
            <div className="App">
                <Routes>
                    {/* Public Routes */}
                    <Route
                        path="/login"
                        element={
                            isAuthenticated ? (
                                <Navigate to="/dashboard" replace />
                            ) : (
                                <Login />
                            )
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            isAuthenticated ? (
                                <Navigate to="/dashboard" replace />
                            ) : (
                                <Register />
                            )
                        }
                    />
                    <Route
                        path="/verify-email/:token"
                        element={<VerifyEmail />}
                    />

                    {/* Protected Routes with Layout */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        {/* Dashboard Routes - Role-based */}
                        <Route
                            path="/"
                            element={<Navigate to="/dashboard" replace />}
                        />
                        <Route
                            path="/dashboard"
                            element={
                                user?.role === "faculty" ? (
                                    <FacultyDashboard />
                                ) : (
                                    <StudentDashboard />
                                )
                            }
                        />

                        {/* Profile Routes */}
                        <Route path="/profile" element={<Profile />} />

                        {/* Class Routes */}
                        <Route
                            path="/classes/create"
                            element={
                                <ProtectedRoute requiredRole="faculty">
                                    <CreateClass />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/classes/join"
                            element={
                                <ProtectedRoute requiredRole="student">
                                    <JoinClass />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/classes/:classId"
                            element={<ClassDetails />}
                        />

                        {/* Quiz Routes */}
                        <Route
                            path="/quizzes/create"
                            element={
                                <ProtectedRoute requiredRole="faculty">
                                    <CreateQuiz />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/quizzes/:quizId"
                            element={<QuizDetails />}
                        />
                        <Route
                            path="/quizzes/:quizId/take"
                            element={
                                <ProtectedRoute requiredRole="student">
                                    <TakeQuiz />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/quiz-results/:attemptId"
                            element={<QuizResults />}
                        />
                    </Route>

                    {/* Catch all route */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </div>
        </Router>
    )
}

export default App
