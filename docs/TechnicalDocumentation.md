# QuizMitra - Technical Documentation

## Document Information

- **Product Name**: QuizMitra
- **Version**: 1.0.0
- **Date**: March 29, 2026
- **Document Type**: Technical Architecture \& Implementation Guide
- **Status**: Stable

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  React + Vite Web App                                         │  │
│  │  - Public Landing (showcase media)                            │  │
│  │  - Student / Faculty / Admin / Superadmin dashboards          │  │
│  │  - Role-protected pages via JWT + persisted auth store        │  │
│  └───────────────────────────────┬────────────────────────────────┘  │
└──────────────────────────────────┼───────────────────────────────────┘
           │ HTTPS (REST + Cookies/JWT)
┌──────────────────────────────────▼───────────────────────────────────┐
│                        APPLICATION LAYER                             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Express API (/api/v1)                                         │  │
│  │ Routes: auth, user, class, quiz, quiz-attempt, quiz-grading, │  │
│  │ dashboard, class-messages, analytics, search, notifications,  │  │
│  │ admin, project-media                                          │  │
│  └───────────────────────────┬────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼────────────────────────────────────┐  │
│  │ Core Services & Controllers                                    │  │
│  │ - Auth + role authorization (student/faculty/admin/superadmin) │  │
│  │ - Quiz lifecycle + attempts + grading                           │  │
│  │ - Superadmin governance (admins/users/status/media permissions) │  │
│  │ - Project Media management (upload/edit/publish/delete)         │  │
│  └───────────────────────────┬────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼────────────────────────────────────┐  │
│  │ AI / Agent Subsystem                                           │  │
│  │ - LangGraph orchestration                                      │  │
│  │ - Question generation                                           │  │
│  │ - Answer checking                                                │  │
│  │ - Advisory generation                                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
           │
┌──────────────────────────────────▼───────────────────────────────────┐
│                            DATA LAYER                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ MongoDB (Mongoose)                                             │  │
│  │ - Users, Admins (with mediaPermissions), Classes, Quizzes      │  │
│  │ - QuizAttempts, Notifications, Messages, ProjectMedia, etc.    │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
           │
┌──────────────────────────────────▼───────────────────────────────────┐
│                        EXTERNAL SERVICES                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │ Sarvam LLM APIs  │  │ Email Service    │  │ Cloudinary         │ │
│  │ (generation/RAG) │  │ (OTP/verification│  │ (feature media CDN │ │
│  │                  │  │ notifications)   │  │ + storage)         │ │
│  └──────────────────┘  └──────────────────┘  └───────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interaction Flow

**Quiz Creation Flow:**

```

Faculty UI → /api/v1/quizzes/* → Quiz Controller
          ↓
      Manual Create OR AI Generate
          ↙                    ↘
    Manual payload        Agent pipeline
           (LangGraph/LangChain)
                  ↓
         Validate & Normalize
                  ↓
         Persist quiz in MongoDB
                  ↓
         Return quiz response

```

**Quiz Evaluation Flow:**

```

Student Quiz Attempt → /api/v1/quiz-attempts or /quizzes/*
              ↓
           Objective + Subjective evaluation
              ↙                    ↘
Decision rules for auto-grading   Agent pipeline for subjective evaluation
             (e.g. MCQ/MSQ/TF)          (LangGraph/LangChain)
             ↘                    ↙
           Advisory generation (AI)
              ↓
           Save attempt, score, and insights in DB
              ↓
           Student/Faculty dashboards consume results APIs

```

**Project Media Management Flow (Superadmin):**

```
Superadmin Dashboard (Manage Media)
      ↓
POST/PATCH/DELETE /api/v1/project-media/superadmin/*
      ↓
Multer (memory) validates image/video file
      ↓
Cloudinary upload/replace/delete
      ↓
ProjectMedia metadata stored in MongoDB
      ↓
Public listing via GET /api/v1/project-media/public
```

**Admin Media Permission Pipeline:**

```
Superadmin toggles admin media permissions
      ↓
PATCH /api/v1/admin/superadmin/admins/:id/media-permissions
      ↓
Admin.mediaPermissions { canView, canDownload } updated
      ↓
Admin requests media endpoints:
  - GET /api/v1/project-media/admin
  - GET /api/v1/project-media/admin/:id/download-link
      ↓
Server enforces role + mediaPermissions before response
```

---

## 2. Technology Stack

### 2.1 Frontend

| Technology      | Version | Purpose                  |
| :-------------- | :------ | :----------------------- |
| React           | 18.2+   | UI Framework             |
| Vite            | 5.0+    | Build tool \& dev server |
| React Router    | 6.20+   | Client-side routing      |
| Zustand         | 4.4+    | State management         |
| Axios           | 1.6+    | HTTP client              |
| Tailwind CSS    | 3.4+    | Utility-first CSS        |
| Lucide React    | 0.300+  | Icon library             |
| React Hook Form | 7.49+   | Form management          |
| Zod             | 3.22+   | Schema validation        |

**Additional Libraries:**

- `recharts` - Charts and graphs
- `date-fns` - Date manipulation
- `react-hot-toast` - Toast notifications
- `@headlessui/react` - Accessible UI components

### 2.2 Backend

| Technology         | Version | Purpose               |
| :----------------- | :------ | :-------------------- |
| Node.js            | 20 LTS  | Runtime environment   |
| Express.js         | 4.18+   | Web framework         |
| MongoDB            | 7.0+    | Primary database      |
| Mongoose           | 8.0+    | MongoDB ODM           |
| JWT                | 9.0+    | Authentication        |
| bcrypt             | 5.1+    | Password hashing      |
| dotenv             | 16.3+   | Environment variables |
| cors               | 2.8+    | CORS middleware       |
| helmet             | 7.1+    | Security headers      |
| express-rate-limit | 7.1+    | Rate limiting         |

**Additional Libraries:**

- `multer` - File upload handling
- `compression` - Response compression
- `morgan` - HTTP request logger
- `express-validator` - Input validation
- `nodemailer` - Email sending

### 2.3 AI/ML Stack

| Technology    | Version | Purpose                   |
| :------------ | :------ | :------------------------ |
| LangChain     | 0.1+    | Agent framework           |
| LangGraph     | 0.0.40+ | Multi-agent orchestration |
| Google AI     | -       | LLM API client            |
| LangSmith SDK | 0.0.70+ | Tracing (future)          |

**Models:**

- **Gemini 2.0 Flash** - Question generation, long answer evaluation
- **Gemma 3 27B** - Advisory agent, short answer evaluation
- **text-embedding-004** - Vector embeddings for RAG

### 2.4 Database \& Storage

| Technology            | Version | Purpose                  |
| :-------------------- | :------ | :----------------------- |
| MongoDB Atlas         | 7.0+    | Primary database (cloud) |
| MongoDB Vector Search | -       | Vector similarity search |
| GridFS                | -       | PDF file storage         |

### 2.5 DevOps \& Infrastructure

| Technology     | Purpose                        |
| :------------- | :----------------------------- |
| GitHub Actions | CI/CD pipeline                 |
| Nginx (future) | Reverse proxy \& load balancer |

### 2.6 Development Tools

| Tool          | Purpose            |
| :------------ | :----------------- |
| VS Code       | IDE                |
| ESLint        | JavaScript linting |
| Prettier      | Code formatting    |
| Postman       | API testing        |
| MongoDB Atlas | Database GUI       |
| Git           | Version control    |

---

## 3. Database Design

### 3.1 MongoDB Collections

#### 3.1.1 Users Collection

```javascript
{
  _id: ObjectId,
  role: "faculty" | "student",

  // Basic info
  fullName: String,
  email: String (unique, indexed),
  password: String (hashed),

  // Role-specific IDs
  facultyId: String (unique, sparse, indexed),
  studentId: String (unique, sparse, indexed),

  // Student-specific fields
  year: Number,
  branch: String,

  // Faculty-specific fields
  department: String,
  designation: String,

  // Account status
  isEmailVerified: Boolean,
  accountStatus: "active" | "pending" | "suspended",

  // Tokens
  refreshToken: String,
  emailVerificationToken: String,

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ facultyId: 1 }, { unique: true, sparse: true })
db.users.createIndex({ studentId: 1 }, { unique: true, sparse: true })
db.users.createIndex({ role: 1, accountStatus: 1 })
```

#### 3.1.2 Classes Collection

```javascript
{
  _id: ObjectId,

  // Basic info
  subjectName: String,
  subjectCode: String,
  classCode: String (unique, 6-char, indexed),

  // Schedule
  semester: String,
  classSlot: String,
  venue: String,

  // Academic context
  department: String,
  academicYear: String,

  // Ownership
  faculty: ObjectId (ref: User, indexed),

  // Students
  students: [
    {
      user: ObjectId (ref: User),
      joinedAt: Date,
      status: "active" | "inactive" | "removed"
    }
  ],

  // Status
  isArchived: Boolean,

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

```javascript
db.classes.createIndex({ classCode: 1 }, { unique: true })
db.classes.createIndex({ faculty: 1 })
db.classes.createIndex({ "students.user": 1 })
db.classes.createIndex({ isArchived: 1 })
db.classes.createIndex({ subjectCode: 1, academicYear: 1 })
```

#### 3.1.3 Quizzes Collection

```javascript
{
  _id: ObjectId,

  // Basic info
  title: String,
  description: String,
  classId: ObjectId (ref: Class, indexed),
  userId: ObjectId (ref: User - faculty),

  // Timing
  duration: Number (minutes),
  scheduledAt: Date (indexed),
  deadline: Date (indexed),

  // Questions
  questions: [
    {
      questionText: String,
      questionType: "mcq" | "msq" | "short" | "long" | "true-false" | "one-word",
      options: [String], // For MCQ/MSQ
      correctAnswer: String | [String], // Single or multiple
      marks: Number,
      explanation: String (optional)
    }
  ],

  // Requirements (stored for reference)
  requirements: {
    numQuestions: Number,
    totalMarks: Number,
    questionTypes: [String],
    difficulty: String,
    topics: [String]
  },

  // Input source
  inputType: "pdf" | "llm-knowledge",
  pdfId: ObjectId (ref: GridFS, if PDF used),

  // Status
  status: "draft" | "published" | "archived",

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

```javascript
db.quizzes.createIndex({ classId: 1, status: 1 })
db.quizzes.createIndex({ userId: 1 })
db.quizzes.createIndex({ scheduledAt: 1, deadline: 1 })
db.quizzes.createIndex({ status: 1, scheduledAt: 1 })
```

#### 3.1.4 QuizAttempts Collection

```javascript
{
  _id: ObjectId,

  // References
  quiz: ObjectId (ref: Quiz, indexed),
  student: ObjectId (ref: User, indexed),
  class: ObjectId (ref: Class),

  // Timing
  startedAt: Date,
  submittedAt: Date,
  timeSpent: Number (seconds),

  // Answers
  answers: [
    {
      questionIndex: Number,
      questionText: String,
      selectedAnswer: String | [String],
      correctAnswer: String | [String],
      isCorrect: Boolean,
      marksAwarded: Number,
      maxMarks: Number,
      evaluationReasoning: String (for subjective questions)
    }
  ],

  // Scoring
  totalQuestions: Number,
  correctAnswers: Number,
  incorrectAnswers: Number,
  marksObtained: Number,
  maxMarks: Number,
  percentage: Number,

  // Advisory
  advisory: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    motivationalMessage: String
  },

  // Status
  status: "submitted" | "graded",

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

```javascript
db.quizattempts.createIndex({ quiz: 1, student: 1 }, { unique: true })
db.quizattempts.createIndex({ student: 1, createdAt: -1 })
db.quizattempts.createIndex({ class: 1 })
db.quizattempts.createIndex({ quiz: 1, submittedAt: -1 })
```

#### 3.1.5 Notifications Collection

```javascript
{
  _id: ObjectId,

  // Recipient
  recipient: ObjectId (ref: User, indexed),

  // Content
  type: "quiz_published" | "quiz_graded" | "class_joined" | "system_update",
  title: String,
  message: String,

  // Related entities
  relatedQuiz: ObjectId (ref: Quiz, optional),
  relatedClass: ObjectId (ref: Class, optional),

  // Status
  isRead: Boolean (indexed),
  readAt: Date,

  // Timestamps
  createdAt: Date
}
```

**Indexes:**

```javascript
db.notifications.createIndex({ recipient: 1, isRead: 1, createdAt: -1 })
db.notifications.createIndex({ type: 1 })
```

#### 3.1.6 AgentLogs Collection (For Debugging)

```javascript
{
  _id: ObjectId,

  // Agent info
  agentType: "orchestrator" | "question_generator" | "answer_checker" | "advisory",
  workflowId: String (UUID),

  // Request
  input: Object,

  // Response
  output: Object,

  // Metadata
  tokensUsed: Number,
  latency: Number (ms),
  status: "success" | "error",
  errorMessage: String (if error),

  // User context
  userId: ObjectId (ref: User),

  // Timestamps
  createdAt: Date
}
```

**Indexes:**

```javascript
db.agentlogs.createIndex({ workflowId: 1 })
db.agentlogs.createIndex({ userId: 1, createdAt: -1 })
db.agentlogs.createIndex({ agentType: 1, status: 1 })
db.agentlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }) // 30 days TTL
```

### 3.2 MongoDB Vector Search Configuration

**Collection**: `pdf_vectors`

```javascript
{
  _id: ObjectId,

  // PDF reference
  pdfId: ObjectId (ref: GridFS),
  quizId: ObjectId (ref: Quiz, indexed),
  userId: ObjectId (ref: User),

  // Content
  chunkText: String,
  chunkIndex: Number,

  // Vector
  embedding: [Float] (1536 dimensions for text-embedding-3-small),

  // Metadata
  pageNumber: Number,

  // Timestamps
  createdAt: Date
}
```

**Vector Search Index:**

```javascript
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1536,
        "similarity": "cosine"
      },
      "quizId": {
        "type": "objectId"
      }
    }
  }
}
```

---

## 4. API Specification

### 4.1 API Design Principles

- **RESTful**: Resource-based URLs
- **Versioning**: `/api/v1/`
- **JSON**: Request/response format
- **Status Codes**: Standard HTTP codes
- **Error Format**: Consistent error structure
- **Authentication**: JWT Bearer token

#### 4.1.1 ApiError Utility Class

```json
class ApiError extends Error {
    constructor (
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiError }
```

#### 4.1.2 ApiResponse Utility Class

```json
class ApiResponse {
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}

export { ApiResponse }
```

#### 4.1.3 asyncHandler Utility Function

```json
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
            .resolve(requestHandler(req, res, next))
            .catch((err) => next(err))
    }
}

export { asyncHandler }
```

#### 4.1.4 Error Handler Middleware

```json
import { ApiError } from "../utils/index.js"

const errorHandler = (err, req, res, next) => {
    // Handle known ApiError instances
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            statusCode: err.statusCode,
            message: err.message,
            success: err.success,
            errors: err.errors,
            ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
        })
    }

    // Log unexpected errors
    console.error("Unexpected error:", err)

    // Handle unknown errors
    const isDevelopment = process.env.NODE_ENV === "development"

    return res.status(500).json({
        statusCode: 500,
        message: isDevelopment
            ? err.message || "Internal Server Error"
            : "Internal Server Error",
        success: false,
        errors: [],
        ...(isDevelopment && {
            stack: err.stack,
            name: err.name,
        }),
    })
}

export { errorHandler }
```

#### 4.1.5 Auth Middleware

```json
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        )

        if (!user) {
            throw new ApiError("Invalid access token: User not found")
        }

        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, "Invalid access token: " + error.message)
    }
})
```

> All these are core formats, can be updated according to the use case

### 4.2 Base URL

```
Production: https://api.quizmitra.onrender.com/api/v1
Development: http://localhost:24000/api/v1
```

### 4.3 Authentication

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Token Expiry:**

- Access Token: 10 days
- Refresh Token: 14 days

### 4.4 Response Format

**Success Response:**

```js
return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User details fetched successfully"))
```

```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Success message",
  "success": true
}
```

**Error Response:**

```js
throw new ApiError(409, "Username or email already exists")
```

```json
{
    "statusCode": 409,
    "message": "Error message",
    "errors": ["Detailed error 1", "Detailed error 2"],
    "success": false
}
```

### 4.5 API Endpoints

#### 4.5.1 Authentication Endpoints

**POST /auth/register**

- **Description**: Register new user
- **Auth**: None
- **Body**:

```json
{
  "role": "faculty" | "student",
  "fullName": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string",

  // For students
  "studentId": "string",
  "year": number,
  "branch": "string",

  // For faculty
  "facultyId": "string",
  "department": "string",
  "designation": "string"
}
```

- **Response**: User object (without password)

**POST /auth/login**

- **Description**: Login user
- **Auth**: None
- **Body**:

```json
{
    "email": "string",
    "password": "string"
}
```

- **Response**:

```json
{
  "user": { ... },
  "accessToken": "string",
  "refreshToken": "string"
}
```

**POST /auth/logout**

- **Description**: Logout user
- **Auth**: Required
- **Response**: Success message

**POST /auth/refresh-token**

- **Description**: Refresh access token
- **Auth**: None
- **Body**:

```json
{
    "refreshToken": "string"
}
```

- **Response**: New accessToken

#### 4.5.2 Class Endpoints

**POST /classes/create**

- **Description**: Create new class (Faculty only)
- **Auth**: Required (Faculty)
- **Body**:

```json
{
    "subjectName": "string",
    "subjectCode": "string",
    "semester": "string",
    "classSlot": "string",
    "venue": "string",
    "department": "string",
    "academicYear": "string"
}
```

- **Response**: Class object with generated classCode

**GET /classes/my-classes**

- **Description**: Get user's classes
- **Auth**: Required
- **Query Params**: None
- **Response**: Array of class objects

**GET /classes/:classCode**

- **Description**: Get class details
- **Auth**: Required (must be faculty or enrolled student)
- **Response**: Class object with students

**POST /classes/:classCode/join**

- **Description**: Join class using code (Student only)
- **Auth**: Required (Student)
- **Response**: Class object

**POST /classes/:classCode/students/add**

- **Description**: Add students to class (Faculty only)
- **Auth**: Required (Faculty)
- **Body**:

```json
{
    "studentIds": ["ObjectId1", "ObjectId2"]
}
```

- **Response**: Success message with count

**DELETE /classes/:classCode/students/:studentId/remove**

- **Description**: Remove student from class (Faculty only)
- **Auth**: Required (Faculty)
- **Response**: Success message

**PATCH /classes/:classCode/archive**

- **Description**: Archive class (Faculty only)
- **Auth**: Required (Faculty)
- **Response**: Updated class object

#### 4.5.3 Quiz Endpoints

**POST /quizzes/create-manual**

- **Description**: Create quiz manually (Faculty only)
- **Auth**: Required (Faculty)
- **Body**:

```json
{
  "classId": "ObjectId",
  "title": "string",
  "description": "string",
  "duration": number,
  "scheduledAt": "ISO date",
  "deadline": "ISO date",
  "questions": [
    {
      "questionText": "string",
      "questionType": "mcq" | "msq" | "short" | "long" | "true-false" | "one-word",
      "options": ["string"] (optional),
      "correctAnswer": "string" | ["string"],
      "marks": number
    }
  ]
}
```

- **Response**: Quiz object

**POST /quizzes/generate-from-pdf**

- **Description**: Generate quiz from PDF (Faculty only)
- **Auth**: Required (Faculty)
- **Content-Type**: multipart/form-data
- **Body**:

```
pdf: File
classId: ObjectId
title: string
description: string
duration: number
scheduledAt: ISO date
deadline: ISO date
requirements: JSON {
  numQuestions: number,
  questionTypes: [string],
  difficulty: "easy" | "medium" | "hard",
  topics: [string] (optional)
}
```

- **Response**: Quiz object with generated questions

**GET /quizzes/:quizId**

- **Description**: Get quiz details
- **Auth**: Required
- **Response**: Quiz object (without correct answers for students before submission)

**GET /quizzes/class/:classCode/quizzes**

- **Description**: Get all quizzes for a class
- **Auth**: Required
- **Query Params**:
    - `status`: "draft" | "published" | "archived"
    - `page`: number
    - `limit`: number
- **Response**: Array of quiz objects with pagination

**PATCH /quizzes/:quizId/publish**

- **Description**: Publish quiz (Faculty only)
- **Auth**: Required (Faculty)
- **Response**: Updated quiz object

**POST /quizzes/:quizId/attempt**

- **Description**: Submit quiz attempt (Student only)
- **Auth**: Required (Student)
- **Body**:

```json
{
  "startedAt": "ISO date",
  "answers": [
    {
      "questionIndex": number,
      "selectedAnswer": "string" | ["string"]
    }
  ]
}
```

- **Response**: QuizAttempt object with evaluation and advisory

**GET /quizzes/:quizId/attempts**

- **Description**: Get all attempts for a quiz (Faculty only)
- **Auth**: Required (Faculty)
- **Response**: Array of QuizAttempt objects

**GET /quizzes/:quizId/my-attempt**

- **Description**: Get student's attempt for a quiz
- **Auth**: Required (Student)
- **Response**: QuizAttempt object or null

**DELETE /quizzes/:quizId/pdf**

- **Description**: Delete PDF and vectors (Faculty only)
- **Auth**: Required (Faculty)
- **Response**: Success message

#### 4.5.4 Dashboard Endpoints

**GET /dashboard/faculty**

- **Description**: Get faculty dashboard data
- **Auth**: Required (Faculty)
- **Response**:

```json
{
  "stats": {
    "totalClasses": number,
    "totalQuizzes": number,
    "totalStudents": number,
    "avgPerformance": number
  },
  "recentClasses": [...],
  "upcomingQuizzes": [...],
  "performanceChart": [...]
}
```

**GET /dashboard/student**

- **Description**: Get student dashboard data
- **Auth**: Required (Student)
- **Response**:

```json
{
  "stats": {
    "enrolledClasses": number,
    "completedQuizzes": number,
    "avgScore": number
  },
  "availableQuizzes": [...],
  "recentAttempts": [...],
  "performanceChart": [...]
}
```

#### 4.5.5 Analytics Endpoints

**GET /analytics/class/:classCode**

- **Description**: Get class analytics (Faculty only)
- **Auth**: Required (Faculty)
- **Query Params**:
    - `startDate`: ISO date
    - `endDate`: ISO date
- **Response**: Analytics object with charts data

**GET /analytics/student/:studentId**

- **Description**: Get student performance (Faculty or self)
- **Auth**: Required
- **Response**: Student performance data

### 4.6 Rate Limiting

- **Default**: 100 requests/minute per IP
- **Auth endpoints**: 5 requests/minute per IP
- **Agent endpoints**: 10 requests/minute per user

### 4.7 Error Codes

| Code | Description                              |
| :--- | :--------------------------------------- |
| 400  | Bad Request - Invalid input              |
| 401  | Unauthorized - Invalid/missing token     |
| 403  | Forbidden - Insufficient permissions     |
| 404  | Not Found - Resource doesn't exist       |
| 409  | Conflict - Duplicate resource            |
| 422  | Unprocessable Entity - Validation failed |
| 429  | Too Many Requests - Rate limit exceeded  |
| 500  | Internal Server Error                    |
| 503  | Service Unavailable - LLM API down       |

---

## 5. Multi-Agent System Architecture

### 5.1 Agent Overview

```
LangGraph Workflow (QuizState)
  ├── orchestrator (routing node)
  ├── content
  ├── generateObjectiveQuestions
  ├── generateSubjectiveQuestions
  ├── mergeGeneratedQuestions
  ├── generateOptions
  ├── review (for performance insights)
  └── formatting (quality checker)
```

### 5.2 Orchestrator Agent (LangGraph)

**Purpose**: Centralized routing and lifecycle control for the quiz generation graph.

**Current Behavior:**

- Orchestrator is a dedicated LangGraph node (`orchestratorAgent`) invoked at start and after every worker node.
- Uses state-driven routing via `nextNode`.
- Ends graph immediately when status is `failed` or `completed`.
- Routes deterministically through generation pipeline based on available state fields.
- Keeps orchestration logic isolated from graph edge callbacks.

**Implementation:**

```javascript
import { StateGraph } from "@langchain/langgraph"

const workflow = new StateGraph(QuizState)
    .addNode("orchestrator", orchestratorAgent)
    .addNode("content", contentAgent)
    .addNode("generateObjectiveQuestions", objectiveQuestionAgent)
    .addNode("generateSubjectiveQuestions", subjectiveQuestionAgent)
    .addNode("mergeGeneratedQuestions", mergeQuestionsAgent)
    .addNode("generateOptions", optionsAgent)
    .addNode("review", reviewAgent)
    .addNode("formatting", formattingAgent)

workflow.addEdge("__start__", "orchestrator")
workflow.addConditionalEdges(
    "orchestrator",
    (state) => state.nextNode || "__end__",
    {
        content: "content",
        generateObjectiveQuestions: "generateObjectiveQuestions",
        generateSubjectiveQuestions: "generateSubjectiveQuestions",
        mergeGeneratedQuestions: "mergeGeneratedQuestions",
        generateOptions: "generateOptions",
        review: "review",
        formatting: "formatting",
        __end__: "__end__",
    }
)

workflow.addEdge("content", "orchestrator")
workflow.addEdge("generateObjectiveQuestions", "orchestrator")
workflow.addEdge("generateSubjectiveQuestions", "orchestrator")
workflow.addEdge("mergeGeneratedQuestions", "orchestrator")
workflow.addEdge("generateOptions", "orchestrator")
workflow.addEdge("review", "orchestrator")
workflow.addEdge("formatting", "orchestrator")

const app = workflow.compile()
```

**State Persistence:**

- Graph supports compilation with checkpointer for persistence (`workflow.compile({ checkpointer })`).
- Routing key (`nextNode`) is stored in state and produced by orchestrator node.
- Failures are captured through `status` and `errors` in state and routed to graph end.

### 5.3 Question Generator Agent

**Purpose**: Generate quiz questions from PDF or LLM knowledge

**Input:**

```javascript
{
  requirements: {
    numQuestions: number,
    questionTypes: [string],
    difficulty: string,
    topics: [string],
    marksDistribution: [number]
  },
  inputType: "pdf" | "llm-knowledge",
  pdfContext: string (if PDF) // Retrieved from vector search
}
```

**Process:**

1. **If PDF uploaded:**
    - Chunk PDF text (1000 tokens, 200 overlap)
    - Generate embeddings using OpenAI
    - Store in MongoDB Vector Search
    - Retrieve top 5 relevant chunks for context
2. **Prompt construction:**

```javascript
const prompt = `
You are an expert quiz question generator for academic assessments.

Context: ${pdfContext || "Use your knowledge"}

Generate ${numQuestions} questions with the following requirements:
- Question types: ${questionTypes.join(", ")}
- Difficulty: ${difficulty}
- Topics: ${topics.join(", ") || "Any relevant topics"}
- Marks distribution: ${marksDistribution}

For each question, provide:
1. Question text (clear and unambiguous)
2. Question type
3. Options (for MCQ/MSQ, at least 4)
4. Correct answer(s)
5. Explanation (brief, for faculty review)

Output format: JSON array of questions
`
```

3. **LLM call:**

```javascript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { StructuredOutputParser } from "langchain/output_parsers"

const model = new ChatGoogleGenerativeAI({
    modelName: process.env.QUESTION_GENERATOR_LLM,
    temperature: 0.3,
})

const parser = StructuredOutputParser.fromZodSchema(questionSchema)
const chain = model.pipe(parser)

const questions = await chain.invoke(prompt)
```

**Output:**

```javascript
{
    questions: [
        {
            questionText: string,
            questionType: string,
            options: [string],
            correctAnswer: string | [string],
            marks: number,
            explanation: string,
        },
    ]
}
```

**Error Handling:**

- Retry with exponential backoff (3 attempts)
- Fallback to simpler prompt if parsing fails
- Log errors to AgentLogs collection

### 5.4 Answer Checker Agent

**Purpose**: Evaluate student answers and assign marks

**Input:**

```javascript
{
  questions: [...], // From quiz
  studentAnswers: [
    {
      questionIndex: number,
      selectedAnswer: string | [string]
    }
  ]
}
```

**Process:**

1. **For MCQ/MSQ/True-False/One-Word:**
    - Direct comparison
    - Case-insensitive
    - Trim whitespace
    - For MSQ: Check if all correct options selected
2. **For Short Answer:**

```javascript
const evaluateShortAnswer = async (question, studentAnswer) => {
    const prompt = `
  Question: ${question.questionText}
  Correct Answer: ${question.correctAnswer}
  Student Answer: ${studentAnswer}
  
  Evaluate if the student's answer is correct, partially correct, or incorrect.
  Consider semantic meaning, not just exact wording.
  
  Provide:
  1. Marks (out of ${question.marks})
  2. Brief reasoning
  
  Output JSON: { "marks": number, "reasoning": string }
  `

    const result = await llm.invoke(prompt)
    return result
}
```

3. **For Long Answer:**

```javascript
const evaluateLongAnswer = async (question, studentAnswer) => {
    const prompt = `
  Question: ${question.questionText}
  Expected Answer/Rubric: ${question.correctAnswer}
  Student Answer: ${studentAnswer}
  Max Marks: ${question.marks}
  
  Evaluate the student's answer based on:
  - Correctness of concepts
  - Completeness
  - Clarity of explanation
  - Relevance
  
  Provide:
  1. Marks awarded (out of ${question.marks})
  2. Detailed reasoning explaining the marks
  
  Output JSON: { "marks": number, "reasoning": string }
  `

    const result = await llm.invoke(prompt)
    return result
}
```

**Output:**

```javascript
{
  evaluatedAnswers: [
    {
      questionIndex: number,
      isCorrect: boolean,
      marksAwarded: number,
      maxMarks: number,
      evaluationReasoning: string
    }
  ],
  summary: {
    totalMarks: number,
    marksObtained: number,
    percentage: number,
    correctCount: number,
    incorrectCount: number
  }
}
```

### 5.5 Advisory Agent

**Purpose**: Generate personalized advice for students

**Input:**

```javascript
{
  quizAttempt: {
    marksObtained: number,
    maxMarks: number,
    percentage: number,
    evaluatedAnswers: [...]
  },
  studentHistory: {
    previousAttempts: [...],
    overallAverage: number
  }
}
```

**Process:**

```javascript
const generateAdvisory = async (input) => {
    // Analyze performance
    const strengths = []
    const weaknesses = []

    input.evaluatedAnswers.forEach((answer) => {
        const topic = extractTopic(answer.questionText)
        if (answer.isCorrect) {
            strengths.push(topic)
        } else {
            weaknesses.push(topic)
        }
    })

    const prompt = `
  You are a supportive academic advisor.
  
  Student Performance:
  - Score: ${input.quizAttempt.marksObtained}/${input.quizAttempt.maxMarks} (${input.quizAttempt.percentage}%)
  - Topics done well: ${strengths.join(", ")}
  - Topics needing improvement: ${weaknesses.join(", ")}
  - Overall average: ${input.studentHistory.overallAverage}%
  
  Provide personalized advice:
  1. Acknowledge strengths (2-3 points)
  2. Identify specific areas to improve (2-3 points)
  3. Actionable study recommendations (3-4 specific actions)
  4. Encouraging motivational message
  
  Tone: Supportive, constructive, motivating
  
  Output JSON: {
    "strengths": [string],
    "weaknesses": [string],
    "recommendations": [string],
    "motivationalMessage": string
  }
  `

    const advisory = await llm.invoke(prompt)
    return advisory
}
```

**Output:**

```javascript
{
  strengths: [
    "Strong understanding of data structures",
    "Excellent problem-solving in algorithms"
  ],
  weaknesses: [
    "Need more practice with dynamic programming",
    "Time complexity analysis requires attention"
  ],
  recommendations: [
    "Review DP patterns: Knapsack, LCS, LIS",
    "Practice 5 medium-level DP problems daily",
    "Study Big-O notation and analyze 10 algorithms",
    "Watch video tutorials on time complexity"
  ],
  motivationalMessage: "You're making great progress! Your algorithm skills are solid. Focus on DP this week and you'll see improvement."
}
```

### 5.6 Agent Monitoring \& Logging

**Log every agent invocation:**

```javascript
const logAgentCall = async (agentType, workflowId, input, output, metadata) => {
    await AgentLog.create({
        agentType,
        workflowId,
        input,
        output,
        tokensUsed: metadata.tokensUsed,
        latency: metadata.latency,
        status: metadata.status,
        errorMessage: metadata.error,
        userId: metadata.userId,
        createdAt: new Date(),
    })
}
```

**Metrics to track:**

- Token usage per agent
- Latency per agent
- Success/error rate
- Cost per quiz generated/evaluated

---

## 6. Security Implementation

### 6.1 Authentication \& Authorization

**JWT Implementation:**

```javascript
// Generate tokens
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
            role: user.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )
}

const generateRefreshToken = (user) => {
    return jwt.sign({ _id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    })
}

// Verify middleware
const verifyJWT = async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decoded._id).select(
            "-password -refreshToken"
        )

        if (!user) {
            return res.status(401).json({ message: "Invalid token" })
        }

        req.user = user
        next()
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}
```

**Role-based Access Control:**

```javascript
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Insufficient permissions" })
        }
        next()
    }
}

// Usage
router.post("/classes/create", verifyJWT, requireRole("faculty"), createClass)
```

### 6.2 Input Validation

**Using express-validator:**

```javascript
const { body, validationResult } = require("express-validator")

const validateQuizCreation = [
    body("title").trim().isLength({ min: 5, max: 100 }),
    body("duration").isInt({ min: 5, max: 180 }),
    body("scheduledAt").isISO8601(),
    body("deadline")
        .isISO8601()
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.scheduledAt)) {
                throw new Error("Deadline must be after scheduled time")
            }
            return true
        }),
    (req, res, next) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }
        next()
    },
]
```

### 6.3 Password Security

```javascript
import bcrypt from "bcrypt"

// Hash password
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12)
}

// Verify password
const isPasswordCorrect = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword)
}
```

### 6.4 API Security Headers

```javascript
import helmet from "helmet"

app.use(helmet())
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    })
)
```

### 6.5 CORS Configuration

```javascript
import cors from "cors"

const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:54000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOptions))
```

### 6.6 Rate Limiting

```javascript
import rateLimit from "express-rate-limit"

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: "Too many requests, please try again later",
})

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again later",
})

app.use("/api/", limiter)
app.use("/api/v1/auth/", authLimiter)
```

### 6.7 Environment Variables Security

**.env.example:**

```bash
# Server
NODE_ENV=development
PORT=24000

# Database
MONGODB_URI=mongodb+srv://quiz-mitra-db:<password>@cluster0.kor9u.mongodb.net
DB_NAME=quizmitra

# JWT
ACCESS_TOKEN_SECRET=your-access-token-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-token-secret-min-32-chars
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d

# OpenAI
GOOGLE_AI_API_KEY=AIzaSy...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend
FRONTEND_URL=http://localhost:54000
```

**Security rules:**

- Never commit `.env` to Git
- Use strong random secrets (32+ characters)
- Rotate secrets regularly
- Different secrets for dev/prod

---

## 7. Deployment Strategy

### 7.1 Docker Configuration

**Dockerfile (Backend):**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 24000

CMD ["node", "src/index.js"]
```

**Dockerfile (Frontend):**

```dockerfile
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml (Development):**

```yaml
version: "3.8"

services:
    mongodb:
        image: mongo:7.0
        container_name: quizmitra-mongo
        ports:
            - "27017:27017"
        volumes:
            - mongo-data:/data/db
        environment:
            MONGO_INITDB_DATABASE: quizmitra

    backend:
        build:
            context: ./backend
            dockerfile: Dockerfile
        container_name: quizmitra-backend
        ports:
            - "8080:8080"
        volumes:
            - ./backend:/app
            - /app/node_modules
        environment:
            - NODE_ENV=development
            - MONGODB_URI=mongodb://mongodb:27017
        depends_on:
            - mongodb

    frontend:
        build:
            context: ./frontend
            dockerfile: Dockerfile.dev
        container_name: quizmitra-frontend
        ports:
            - "5173:5173"
        volumes:
            - ./frontend:/app
            - /app/node_modules
        depends_on:
            - backend

volumes:
    mongo-data:
```

### 7.2 CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yaml:**

```yaml
name: Deploy QuizMitra

on:
    push:
        branches: [main]

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3

            - name: Setup Node.js
              uses: actions/setup-node@v3
              with:
                  node-version: "20"

            - name: Install dependencies
              run: npm ci
              working-directory: ./backend

            - name: Run tests
              run: npm test
              working-directory: ./backend

            - name: Run linter
              run: npm run lint
              working-directory: ./backend

    build:
        needs: test
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3

            - name: Build Docker images
              run: |
                  docker build -t quizmitra-backend:latest ./backend
                  docker build -t quizmitra-frontend:latest ./frontend

            - name: Push to Docker Hub
              run: |
                  echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
                  docker push quizmitra-backend:latest
                  docker push quizmitra-frontend:latest

    deploy:
        needs: build
        runs-on: ubuntu-latest
        steps:
            - name: Deploy to production
              uses: appleboy/ssh-action@master
              with:
                  host: ${{ secrets.PROD_HOST }}
                  username: ${{ secrets.PROD_USER }}
                  key: ${{ secrets.SSH_PRIVATE_KEY }}
                  script: |
                      cd /var/www/quizmitra
                      docker-compose pull
                      docker-compose up -d
                      docker system prune -f
```

### 7.3 Production Environment Setup

**Nginx Configuration:**

```nginx
server {
    listen 24000;
    server_name api.quizmitra.onrender.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.quizmitra.com;

    ssl_certificate /etc/letsencrypt/live/api.quizmitra.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.quizmitra.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File upload size
    client_max_body_size 50M;
}

server {
    listen 443 ssl http2;
    server_name quizmitra.com www.quizmitra.com;

    ssl_certificate /etc/letsencrypt/live/quizmitra.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quizmitra.com/privkey.pem;

    root /var/www/quizmitra/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**PM2 Configuration (ecosystem.config.js):**

```javascript
module.exports = {
    apps: [
        {
            name: "quizmitra-api",
            script: "./src/index.js",
            instances: "max",
            exec_mode: "cluster",
            env: {
                NODE_ENV: "production",
                PORT: 24000,
            },
            error_file: "./logs/err.log",
            out_file: "./logs/out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            merge_logs: true,
            max_memory_restart: "1G",
            autorestart: true,
            watch: false,
        },
    ],
}
```

### 7.4 Monitoring \& Logging

**Winston Logger:**

```javascript
import winston from "winston"

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
        }),
        new winston.transports.File({ filename: "logs/combined.log" }),
    ],
})

if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    )
}

export default logger
```

**Health Check Endpoint:**

```javascript
app.get("/health", async (req, res) => {
    const health = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: "OK",
        database: "disconnected",
        memory: process.memoryUsage(),
    }

    try {
        await mongoose.connection.db.admin().ping()
        health.database = "connected"
    } catch (error) {
        health.status = "ERROR"
        health.database = "disconnected"
    }

    res.status(health.status === "OK" ? 200 : 503).json(health)
})
```

---

## 8. Development Guidelines

### 8.1 Project Structure

```
quizmitra/
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── app.js
│   │   ├── constants.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── class.controller.js
│   │   │   ├── quiz.controller.js
│   │   │   └── dashboard.controller.js
│   │   ├── models/
│   │   │   ├── User.model.js
│   │   │   ├── Class.model.js
│   │   │   ├── Quiz.model.js
│   │   │   └── QuizAttempt.model.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── class.routes.js
│   │   │   └── quiz.routes.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   ├── errorHandler.middleware.js
│   │   │   └── upload.middleware.js
│   │   ├── agents/
│   │   │   ├── orchestrator.js
│   │   │   ├── questionGenerator.js
│   │   │   ├── answerChecker.js
│   │   │   └── advisory.js
│   │   ├── utils/
│   │   │   ├── ApiError.js
│   │   │   ├── ApiResponse.js
│   │   │   ├── asyncHandler.js
│   │   │   └── vectorStore.js
│   │   └── db/
│   │       └── index.js
│   ├── tests/
│   ├── logs/
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── features/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── classes/
│   │   │   └── quizzes/
│   │   ├── store/
│   │   │   └── authStore.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   └── styles/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

### 8.2 Coding Standards

**ESLint Configuration (.eslintrc.json):**

```json
{
    "env": {
        "node": true,
        "es2021": true
    },
    "extends": ["eslint:recommended", "plugin:node/recommended"],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        "indent": ["error", 4],
        "quotes": ["error", "double"],
        "semi": ["error", "never"],
        "no-console": "warn",
        "no-unused-vars": "warn"
    }
}
```

**Prettier Configuration (.prettierrc):**

```json
{
    "tabWidth": 4,
    "semi": false,
    "singleQuote": false,
    "trailingComma": "none",
    "printWidth": 100
}
```

### 8.3 Git Workflow

**Branch Strategy:**

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Production hotfixes

**Commit Convention:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Testing
- `chore` - Maintenance

**Example:**

```
feat(quiz): add PDF upload for question generation

Implemented PDF upload functionality with GridFS storage
and vector embedding generation for RAG-based questions.

Closes #123
```

### 8.4 Testing Strategy

**Unit Tests (Jest):**

```javascript
// tests/unit/utils/ApiError.test.js
import { ApiError } from "../../../src/utils/ApiError"

describe("ApiError", () => {
    test("should create error with correct properties", () => {
        const error = new ApiError(404, "Not found")

        expect(error.statusCode).toBe(404)
        expect(error.message).toBe("Not found")
        expect(error.success).toBe(false)
    })
})
```

**Integration Tests:**

```javascript
// tests/integration/auth.test.js
import request from "supertest"
import app from "../../src/app"

describe("Auth API", () => {
    test("POST /auth/register should create new user", async () => {
        const response = await request(app).post("/api/v1/auth/register").send({
            role: "student",
            fullName: "Test User",
            email: "test@example.com",
            password: "Test@1234",
            confirmPassword: "Test@1234",
            studentId: "21CSE001",
            year: 2,
            branch: "CSE",
        })

        expect(response.status).toBe(201)
        expect(response.body.data.user.email).toBe("test@example.com")
    })
})
```

**Agent Tests:**

```javascript
// tests/agents/questionGenerator.test.js
import { questionGeneratorAgent } from "../../src/agents/questionGenerator"

describe("Question Generator Agent", () => {
    test("should generate MCQ questions", async () => {
        const input = {
            requirements: {
                numQuestions: 5,
                questionTypes: ["mcq"],
                difficulty: "medium",
            },
            inputType: "llm-knowledge",
            topics: ["Data Structures"],
        }

        const result = await questionGeneratorAgent.invoke(input)

        expect(result.questions).toHaveLength(5)
        expect(result.questions[0].questionType).toBe("mcq")
        expect(result.questions[0].options).toHaveLength(4)
    })
})
```

**Test Coverage Target:** >80%

---

## 9. Performance Optimization

### 9.1 Database Optimization

**Indexing Strategy:**

- Add indexes for frequently queried fields
- Compound indexes for multi-field queries
- Sparse indexes for optional fields
- TTL indexes for temporary data

**Query Optimization:**

```javascript
// ❌ Bad: Fetch all and filter in memory
const classes = await Class.find({ faculty: userId })
const activeClasses = classes.filter((c) => !c.isArchived)

// ✅ Good: Filter in database
const activeClasses = await Class.find({
    faculty: userId,
    isArchived: false,
})
    .select("subjectName subjectCode classCode")
    .lean()
```

**Pagination:**

```javascript
const getQuizzes = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit

    const [quizzes, total] = await Promise.all([
        Quiz.find({ status: "published" }).skip(skip).limit(limit).lean(),
        Quiz.countDocuments({ status: "published" }),
    ])

    return {
        quizzes,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    }
}
```

### 9.2 Caching Strategy

**Redis for Caching (Future):**

```javascript
import Redis from "redis"

const redis = Redis.createClient()

const getCachedData = async (key) => {
    const cached = await redis.get(key)
    if (cached) {
        return JSON.parse(cached)
    }
    return null
}

const setCachedData = async (key, data, ttl = 3600) => {
    await redis.setex(key, ttl, JSON.stringify(data))
}

// Usage
const getClassDetails = async (classId) => {
    const cacheKey = `class:${classId}`
    const cached = await getCachedData(cacheKey)

    if (cached) return cached

    const classDetails = await Class.findById(classId)
    await setCachedData(cacheKey, classDetails, 3600)

    return classDetails
}
```

### 9.3 API Response Optimization

**Compression:**

```javascript
import compression from "compression"

app.use(compression())
```

**Response Time:**

```javascript
import responseTime from "response-time"

app.use(
    responseTime((req, res, time) => {
        logger.info(`${req.method} ${req.url} - ${time}ms`)
    })
)
```

### 9.4 Agent Performance

**Token Optimization:**

- Use concise prompts
- Leverage system messages
- Implement result caching for similar queries

**Parallel Processing:**

```javascript
// Evaluate multiple answers in parallel
const evaluateAnswers = async (questions, studentAnswers) => {
    const evaluations = await Promise.all(
        studentAnswers.map((answer, index) =>
            answerCheckerAgent.invoke({
                question: questions[index],
                studentAnswer: answer.selectedAnswer,
            })
        )
    )

    return evaluations
}
```

---

## 10. Troubleshooting \& Debugging

### 10.1 Common Issues

**Issue: MongoDB Connection Failed**

```
Solution:
1. Check MONGODB_URI in .env
2. Verify MongoDB is running: mongosh
3. Check network connectivity
4. Verify IP whitelist (if using Atlas)
```

**Issue: JWT Token Invalid**

```
Solution:
1. Check token expiry
2. Verify ACCESS_TOKEN_SECRET matches
3. Clear browser local storage
4. Regenerate token
```

**Issue: Agent Timeout**

```
Solution:
1. Check OpenAI API status
2. Verify API key is valid
3. Increase timeout duration
4. Check network latency
5. Review prompt complexity
```

### 10.2 Debug Tools

**Debug Logging:**

```javascript
import debug from "debug"

const log = debug("quizmitra:api")
const errorLog = debug("quizmitra:error")

log("Processing quiz creation...")
errorLog("Failed to generate questions: %O", error)
```

**MongoDB Query Profiling:**

```javascript
mongoose.set("debug", true) // In development
```

**Agent Tracing:**

```javascript
const traceAgent = async (agentName, input) => {
    const startTime = Date.now()

    try {
        const result = await agent.invoke(input)
        const duration = Date.now() - startTime

        logger.info({
            agent: agentName,
            duration,
            status: "success",
            tokens: result.metadata?.tokens,
        })

        return result
    } catch (error) {
        logger.error({
            agent: agentName,
            duration: Date.now() - startTime,
            status: "error",
            error: error.message,
        })
        throw error
    }
}
```

---

## 11. API Documentation

### 11.1 Swagger/OpenAPI Setup

```javascript
import swaggerJsdoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "QuizMitra API",
            version: "1.0.0",
            description: "AI-powered quiz generation and evaluation platform",
        },
        servers: [
            {
                url: "http://localhost:8080/api/v1",
                description: "Development server",
            },
            {
                url: "https://api.quizmitra.com/api/v1",
                description: "Production server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./src/routes/*.js"],
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
```

---

## 12. Future Enhancements

### 12.1 BYOK (Bring Your Own Key) Architecture

**Implementation Plan:**

1. Add `apiKeys` field to User model (encrypted)
2. API key management UI
3. Route LLM calls through user's key
4. Usage tracking per key
5. Cost estimation dashboard

**Schema Change:**

```javascript
{
  apiKeys: {
    openai: {
      key: String (encrypted),
      isActive: Boolean,
      addedAt: Date,
      lastUsed: Date,
      tokensUsed: Number
    }
  }
}
```

### 12.2 LangSmith Integration

**Setup:**

```javascript
import { Client } from "langsmith"

const client = new Client({
    apiKey: process.env.LANGSMITH_API_KEY,
})

const tracedAgent = async (input) => {
    return await client.trace(
        {
            name: "question_generator",
            userId: input.userId,
            metadata: { classId: input.classId },
        },
        async () => {
            return await questionGeneratorAgent.invoke(input)
        }
    )
}
```

### 12.3 Mobile App Development

**Tech Stack:**

- React Native (cross-platform)
- Expo for rapid development
- Reuse API endpoints
- Native features: camera for document scan, offline support

---

## 13. Appendix

### 13.1 Useful Commands

**Development:**

```bash
# Start backend
npm run dev

# Start frontend
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

**Docker:**

```bash
# Build images
docker-compose build

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Clean up
docker system prune -a
```

**MongoDB:**

```bash
# Connect to MongoDB
mongosh

# Backup database
mongodump --db quizmitra --out ./backup

# Restore database
mongorestore --db quizmitra ./backup/quizmitra

# Create index
db.users.createIndex({ email: 1 }, { unique: true })
```

### 13.2 Environment Setup Checklist

- [ ] Node.js 20 LTS installed
- [ ] MongoDB 7.0+ installed/configured
- [ ] Git configured
- [ ] Google AI API key obtained
- [ ] .env file created from .env.example
- [ ] Dependencies installed (`npm install`)
- [ ] Database indexes created
- [ ] Email service configured (optional)

---

**END OF TECHNICAL DOCUMENTATION**
