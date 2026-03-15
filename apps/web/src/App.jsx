import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom"
import { useAuthStore } from "./store/authStore"
import { useEffect } from "react"
import { getDashboardPath } from "./utils/getDashboardPath"

// Layout Components
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"

// Auth Pages
import Login from "./pages/auth/Login"
import AdminLogin from "./pages/auth/AdminLogin"
import Register from "./pages/auth/Register"
import VerifyEmail from "./pages/auth/VerifyEmail"

// Dashboard Pages
import FacultyDashboard from "./pages/dashboard/FacultyDashboard"
import StudentDashboard from "./pages/dashboard/StudentDashboard"
import AdminDashboard from "./pages/dashboard/AdminDashboard"
import SuperAdminDashboard from "./pages/dashboard/SuperAdminDashboard"

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
                                    <Navigate
                                        to={getDashboardPath(user?.role)}
                                        replace
                                    />
                                ) : (
                                    <Login />
                                )
                            }
                        />
                        <Route
                            path="/admin/login"
                            element={
                                isAuthenticated ? (
                                    <Navigate
                                        to={getDashboardPath(user?.role)}
                                        replace
                                    />
                                ) : (
                                    <AdminLogin />
                                )
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                isAuthenticated ? (
                                    <Navigate
                                        to={getDashboardPath(user?.role)}
                                        replace
                                    />
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
                            {/* Root → role-specific dashboard */}
                            <Route
                                path="/"
                                element={
                                    <Navigate
                                        to={getDashboardPath(user?.role)}
                                        replace
                                    />
                                }
                            />

                            {/* /dashboard → backward-compat redirect for any hardcoded links */}
                            <Route
                                path="/dashboard"
                                element={
                                    <Navigate
                                        to={getDashboardPath(user?.role)}
                                        replace
                                    />
                                }
                            />

                            {/* Role-specific dashboard routes */}
                            <Route
                                path="/faculty/dashboard"
                                element={
                                    user?.role === "faculty" ? (
                                        <FacultyDashboard />
                                    ) : (
                                        <Navigate
                                            to={getDashboardPath(user?.role)}
                                            replace
                                        />
                                    )
                                }
                            />
                            <Route
                                path="/student/dashboard"
                                element={
                                    user?.role === "student" ? (
                                        <StudentDashboard />
                                    ) : (
                                        <Navigate
                                            to={getDashboardPath(user?.role)}
                                            replace
                                        />
                                    )
                                }
                            />
                            <Route
                                path="/admin/dashboard"
                                element={
                                    user?.role === "admin" ||
                                    user?.role === "superadmin" ? (
                                        <AdminDashboard />
                                    ) : (
                                        <Navigate
                                            to={getDashboardPath(user?.role)}
                                            replace
                                        />
                                    )
                                }
                            />
                            <Route
                                path="/superadmin/dashboard"
                                element={
                                    user?.role === "superadmin" ? (
                                        <SuperAdminDashboard />
                                    ) : (
                                        <Navigate
                                            to={getDashboardPath(user?.role)}
                                            replace
                                        />
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
