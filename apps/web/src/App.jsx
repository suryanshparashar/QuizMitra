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
import ClassDetails from "./pages/classes/ClassDetails"

// Quiz Pages
import CreateQuiz from "./pages/quizzes/CreateQuiz"
import QuizDetails from "./pages/quizzes/QuizDetails"
import QuizEditor from "./pages/quizzes/QuizEditor"
import TakeQuiz from "./pages/quizzes/TakeQuiz"
import QuizResults from "./pages/quizzes/QuizResults"
import QuizGrading from "./pages/quizzes/QuizGrading"
import QuizGradingReview from "./pages/quizzes/QuizGradingReview"

// Profile Pages
import Profile from "./pages/profile/Profile"

// Error Pages
import NotFound from "./pages/errors/NotFound"

import { NotificationProvider } from "./context/NotificationContext"
import Notifications from "./pages/Notifications"
import { ToastProvider } from "./components/Toast"

function App() {
    const { user, isAuthenticated, initializeAuth } = useAuthStore()

    useEffect(() => {
        // Initialize auth state from localStorage on app start
        initializeAuth()
    }, [initializeAuth])

    return (
        <Router>
            <NotificationProvider>
                <ToastProvider />
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

                            {/* Notifications Route */}
                            <Route
                                path="/notifications"
                                element={<Notifications />}
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
                                path="/quizzes/:quizId/edit"
                                element={
                                    <ProtectedRoute requiredRole="faculty">
                                        <QuizEditor />
                                    </ProtectedRoute>
                                }
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
                            <Route
                                path="/quiz-grading/:quizId"
                                element={
                                    <ProtectedRoute requiredRole="faculty">
                                        <QuizGrading />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/quiz-grading/:quizId/review/:studentId"
                                element={
                                    <ProtectedRoute requiredRole="faculty">
                                        <QuizGradingReview />
                                    </ProtectedRoute>
                                }
                            />
                        </Route>

                        {/* Catch all route */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </NotificationProvider>
        </Router>
    )
}

export default App
