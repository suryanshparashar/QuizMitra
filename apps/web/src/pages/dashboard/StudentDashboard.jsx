import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { api } from "../../services/api.js"

export default function StudentDashboard() {
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const response = await api.get("/dashboard")
            setDashboardData(response.data.data)
        } catch (error) {
            console.error("Error fetching dashboard:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div>Loading dashboard...</div>

    return (
        <div>
            <h1>Student Dashboard</h1>

            <div>
                <h2>Overview</h2>
                <div>
                    <div>
                        Enrolled Classes:{" "}
                        {dashboardData?.overview?.totalClasses || 0}
                    </div>
                    <div>
                        Total Quizzes:{" "}
                        {dashboardData?.overview?.totalQuizzes || 0}
                    </div>
                    <div>
                        Active Quizzes:{" "}
                        {dashboardData?.overview?.activeQuizzes || 0}
                    </div>
                    <div>
                        Upcoming Quizzes:{" "}
                        {dashboardData?.overview?.upcomingQuizzes || 0}
                    </div>
                </div>
            </div>

            <div>
                <h2>Your Classes</h2>
                <Link to="/classes/join">
                    <button>Join Class</button>
                </Link>

                {dashboardData?.enrolledClasses?.map((classItem) => (
                    <div key={classItem._id}>
                        <h3>{classItem.subjectName}</h3>
                        <p>Code: {classItem.subjectCode}</p>
                        <p>Faculty: {classItem.facultyDetails?.fullName}</p>
                        <p>Active Quizzes: {classItem.activeQuizzes}</p>
                        <Link to={`/classes/${classItem._id}`}>View Class</Link>
                    </div>
                ))}
            </div>

            <div>
                <h2>Upcoming Deadlines</h2>
                {dashboardData?.upcomingDeadlines?.map((quiz) => (
                    <div key={quiz._id}>
                        <h4>{quiz.title}</h4>
                        <p>Subject: {quiz.classId?.subjectName}</p>
                        <p>
                            Deadline: {new Date(quiz.deadline).toLocaleString()}
                        </p>
                        <Link to={`/quizzes/${quiz._id}`}>Take Quiz</Link>
                    </div>
                ))}
            </div>
        </div>
    )
}
