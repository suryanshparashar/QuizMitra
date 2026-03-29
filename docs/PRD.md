# QuizMitra - Product Requirements Document (PRD)

## Document Information

- **Product Name**: QuizMitra
- **Version**: 1.0.0
- **Date**: February 15, 2026
- **Author**: Suryansh Parashar
- **Status**: Draft

---

## 1. Executive Summary

### 1.1 Product Vision

QuizMitra is an AI-powered quiz generation and evaluation platform designed for educational institutions, enabling faculty to create intelligent assessments and students to receive personalized feedback through automated evaluation and advisory systems.

### 1.2 Product Mission

To revolutionize academic assessments by leveraging AI agents that can generate contextual questions, evaluate answers intelligently, and provide personalized learning guidance to students while giving faculty complete control over class management and performance analytics.

### 1.3 Target Audience

- **Primary**: College/University Faculty and Students
- **Secondary**: Educational institutions preparing students for competitive exams (GATE, JEE, NEET, UPSC, etc.)
- **Geographic**: India (initially), with potential for global expansion

---

## 2. Product Overview

### 2.1 Product Description

QuizMitra is a multi-agent AI system that automates the entire quiz lifecycle - from question generation to evaluation and advisory. Faculty can upload PDFs or rely on LLM knowledge to generate quizzes, while students receive instant feedback and personalized improvement suggestions.

### 2.2 Key Differentiators

- Multi-agent architecture using LangGraph orchestration
- PDF-based contextual question generation
- Automated answer evaluation for all question types
- Personalized advisory system
- Granular permission control for Class Representatives
- BYOK (Bring Your Own Key) architecture for transparency and control
- LangSmith tracing for debugging and monitoring

### 2.3 Success Metrics

- Faculty adoption rate: Target 80% within semester
- Student engagement: Average 3+ quizzes per student per month
- Answer evaluation accuracy: >90% compared to manual grading
- Advisory relevance score: >4/5 student satisfaction
- Platform uptime: 99.5%

---

## 3. User Personas

### 3.1 Faculty (Primary User)

**Profile**: Dr. Minika Vyas, Associate Professor, Computer Science

- **Age**: 35-50
- **Technical Proficiency**: Medium to High
- **Goals**:
    - Reduce time spent on quiz creation and evaluation
    - Track individual and class performance
    - Provide personalized feedback at scale
- **Pain Points**:
    - Manual quiz creation is time-consuming
    - Grading subjective answers is tedious
    - Limited insights into individual student learning gaps
- **Needs**:
    - Easy quiz creation with flexible question types
    - Automated evaluation with accuracy
    - Comprehensive analytics dashboard
    - Control over data access and permissions

### 3.2 Student (Primary User)

**Profile**: Suryansh Parashar, B.Tech 4th Year

- **Age**: 19-23
- **Technical Proficiency**: Medium to High
- **Goals**:
    - Practice and improve exam performance
    - Understand weak areas and get guidance
    - Track progress over time
- **Pain Points**:
    - Generic feedback doesn't help improvement
    - Delayed evaluation results
    - No guidance on how to improve
- **Needs**:
    - Instant quiz results
    - Detailed explanation of mistakes
    - Personalized study recommendations
    - Easy class joining and quiz access

### 3.3 Class Representative (Secondary User)

**Profile**: Arpit Goyal, CR of CSA4029

- **Age**: 20-22
- **Technical Proficiency**: Medium to High
- **Goals**:
    - Help faculty with class coordination
    - Support struggling classmates
    - Monitor overall class performance
- **Pain Points**:
    - Limited visibility into class analytics
    - Cannot proactively help struggling students
- **Needs**:
    - Controlled access to class performance data
    - Student report visibility (as permitted by faculty)
    - Dashboard to identify students needing help

---

## 4. Core Features \& Requirements

### 4.1 User Management

#### 4.1.1 User Registration \& Authentication

**Priority**: P0 (Must Have)

**Functional Requirements**:

- Users can register with role selection: Faculty or Student
- Required fields:
    - **Faculty**: Name, Email, Faculty ID, Department, Designation
    - **Student**: Name, Email, Student ID, Year, Branch
- Email verification mandatory before login
- Secure password requirements (8+ chars, alphanumeric + special)
- JWT-based authentication
- Session management with refresh tokens

**Non-Functional Requirements**:

- Password hashing using bcrypt
- HTTPS only for authentication endpoints
- Token expiry: Access token (10 days), Refresh token (14 days)

#### 4.1.2 User Profiles

**Priority**: P1 (Should Have)

**Functional Requirements**:

- View and edit basic profile information
- Upload profile picture (optional)
- View quiz history and performance trends

---

### 4.2 Class Management

#### 4.2.1 Class Creation (Faculty)

**Priority**: P0 (Must Have)

**Functional Requirements**:

- Faculty can create classes with:
    - Subject Name
    - Subject Code
    - Semester
    - Class Slot
    - Venue
    - Department
    - Academic Year
- Auto-generated 6-character unique Class Code
- Class archiving capability
- Faculty can view all their created classes

**Business Rules**:

- One faculty can create multiple classes
- Class codes are unique across the platform
- Archived classes cannot be edited or accept new students

#### 4.2.2 Class Joining (Student)

**Priority**: P0 (Must Have)

**Functional Requirements**:

- Students join classes using 6-character Class Code
- View enrolled classes in dashboard
- See class details: subject, faculty, schedule, venue
- Leave class option (marks as inactive, not deleted)

**Business Rules**:

- Students can join multiple classes
- Once joined, access to all quizzes in that class
- Cannot join archived classes

#### 4.2.3 Class Representative Assignment

**Priority**: P1 (Should Have)

**Functional Requirements**:

- Faculty can assign one student as Class Representative (CR)
- CR role persists until faculty changes it
- CR gets special dashboard access based on permissions
- Faculty can remove CR designation anytime
- Only enrolled students can be made CR

**Business Rules**:

- Maximum one CR per class
- CR must be an active student in the class
- CR removal reverts user to regular student role

#### 4.2.4 CR Permission Management

**Priority**: P1 (Should Have)

**Functional Requirements**:

- Faculty configures CR permissions:
    - View individual student reports (Yes/No)
    - View overall class performance (Yes/No)
    - View LLM API usage statistics (Yes/No)
    - View quiz analytics (Yes/No)
- Permission changes take effect immediately
- Default: All permissions disabled

**Business Rules**:

- Permissions are class-specific
- CR cannot modify their own permissions
- Faculty can audit CR access logs (future enhancement)

---

### 4.3 Quiz Management

#### 4.3.1 Quiz Creation

**Priority**: P0 (Must Have)

**Functional Requirements**:

- Faculty can create quizzes with:
    - **Basic Info**: Title, Description, Duration
    - **Scheduling**: Start Date/Time, Deadline
    - **Requirements**:
        - Number of questions
        - Total marks
        - Individual question marks distribution
        - Question types: MCQ, MSQ, Short Answer, Long Answer, True/False, One-Word
        - Difficulty level preference
        - Topics (optional)
- Two input modes:

1. **PDF Upload**: Questions generated from uploaded PDF content
2. **LLM Knowledge**: Questions generated from LLM's knowledge base

- Save as draft or publish immediately
- Edit quiz (only in draft state)
- Duplicate quiz feature

**Technical Requirements**:

- PDF upload: Max 50MB, formats: PDF only
- PDF stored in MongoDB GridFS
- PDF content vectorized and stored in MongoDB Vector Search
- Vector embeddings: Google text-embedding-004 (or configurable)

**Business Rules**:

- Only class faculty can create quizzes for that class
- Published quizzes cannot be edited
- Students can only see published quizzes within schedule window

#### 4.3.2 Question Generation Agent

**Priority**: P0 (Must Have)

**Functional Requirements**:

- AI agent generates questions based on:
    - Faculty requirements (count, marks, types)
    - PDF content (if uploaded) using RAG
    - LLM knowledge (if no PDF)
    - Specified topics and difficulty level
- Question output format:
    - Question text
    - Question type
    - Options (for MCQ/MSQ)
    - Correct answer(s)
    - Marks allocation
    - Explanation (for faculty review)
- Faculty can regenerate questions if not satisfied
- Faculty can manually edit generated questions

**Technical Requirements**:

- Agent built using LangChain
- RAG pipeline for PDF-based generation:
    - Chunk size: 1000 tokens, overlap: 200
    - Retrieval: Top 5 relevant chunks
    - Context injection in prompt
- LLM: Gemini 2.0 Flash or Gemma 3 27B (gemma-3-27b-it)
- Structured output parsing for question JSON

**Quality Requirements**:

- Questions must be relevant to context
- Difficulty level matches specification
- No duplicate questions in same quiz
- Grammatically correct and clear

#### 4.3.3 Quiz Taking (Student)

**Priority**: P0 (Must Have)

**Functional Requirements**:

- Students see available quizzes in class dashboard
- Quiz states:
    - **Upcoming**: Before scheduled start time
    - **Active**: Within start time and deadline
    - **Completed**: After attempting
    - **Missed**: Past deadline without attempt
- Quiz attempt interface:
    - Timer display (countdown)
    - Question navigation
    - Save draft answers
    - Submit quiz
    - Warning before submission
- One attempt per quiz (configurable in future)
- Auto-submit on timer expiry

**Business Rules**:

- Students can only attempt published quizzes
- Attempt must be within scheduled window
- Cannot edit after submission
- Late submissions marked but accepted (configurable)

#### 4.3.4 Answer Evaluation Agent

**Priority**: P0 (Must Have)

**Functional Requirements**:

- Automated evaluation for all question types:
    - **MCQ/MSQ/True-False/One-Word**: Exact match
    - **Short Answer**: Semantic similarity + keyword matching
    - **Long Answer**: LLM-based rubric evaluation
- Assigns marks based on:
    - Correctness
    - Completeness
    - Relevance
- Generates explanation for marks awarded
- Faculty can manually override marks (future)

**Technical Requirements**:

- Agent built using LangChain
- Evaluation criteria:
    - MCQ/MSQ: Direct comparison
    - Short/Long answers: LLM evaluation with structured rubric
    - Similarity threshold: 0.75 for partial marks
- LLM: gemini-2.0-flash or gemma-3-27b-it for subjective evaluation
- Structured output with marks and reasoning

**Quality Requirements**:

- Evaluation accuracy: >90% compared to manual grading
- Consistent marking across similar answers
- Transparent reasoning for marks

#### 4.3.5 Advisory Agent

**Priority**: P0 (Must Have)

**Functional Requirements**:

- Provides personalized advice to students after quiz submission:
    - Strengths identified (topics/question types done well)
    - Weaknesses identified (areas needing improvement)
    - Specific study recommendations
    - Resources to review (topics, concepts)
    - Motivational message
- Advice considers:
    - Current quiz performance
    - Historical performance in class
    - Question-wise analysis
- Displayed on result screen and saved in profile

**Technical Requirements**:

- Agent built using LangChain
- Input: Quiz attempt data, question-wise performance, user history
- Output: Structured advisory with sections (strengths, weaknesses, recommendations)
- LLM: gemma-3-27b-it (cost-effective for advisory)

**Quality Requirements**:

- Advice relevance: >4/5 student satisfaction
- Actionable recommendations
- Encouraging tone

---

### 4.4 Multi-Agent Orchestration

#### 4.4.1 Orchestrator Agent

**Priority**: P0 (Must Have)

**Functional Requirements**:

- Coordinates workflow through a dedicated LangGraph orchestrator node (not inline routing helpers).
- Uses shared state to decide and route the next node in the generation pipeline.
- Enforces fail-fast and completion exits by routing to graph end when status is `failed` or `completed`.
- Supports deterministic node progression for quiz generation:
    - `content`
    - `generateObjectiveQuestions`
    - `generateSubjectiveQuestions`
    - `mergeGeneratedQuestions`
    - `generateOptions`
    - `review`
    - `formatting`
- Returns to orchestrator after each worker node for centralized decision-making.
- Logs orchestration decisions and failure context for debugging.

**Technical Requirements**:

- Built using LangGraph
- State includes routing key (`nextNode`) and pipeline progress fields
- State management: checkpointer-compatible compilation for persistence
- Error handling: Exponential backoff for LLM failures
- Timeout: 60s per agent, 180s total workflow
- Logging: All agent inputs/outputs to MongoDB

**Architecture Requirements**:

- Modular agent design
- Easy to add new agents in future
- Scalable for concurrent workflows

---

### 4.5 Data Management

#### 4.5.1 PDF Management

**Priority**: P0 (Must Have)

**Functional Requirements**:

- Faculty can:
    - Upload PDF for quiz generation
    - View list of uploaded PDFs
    - Delete PDFs
    - Reuse PDFs for multiple quizzes
- PDF deletion consequences:
    - Removes PDF file from storage
    - Deletes associated vector embeddings
    - Marks quizzes using that PDF (metadata retained)

**Technical Requirements**:

- Storage: MongoDB GridFS for PDF files
- Vector storage: MongoDB Atlas Vector Search
- Embedding model: Google text-embedding-004
- Cascade deletion: PDF → Vectors
- File metadata: name, size, upload date, associated quizzes

#### 4.5.2 User Data Storage

**Priority**: P0 (Must Have)

**Functional Requirements**:

- All user data stored securely:
    - User profiles
    - Classes and memberships
    - Quizzes and questions
    - Quiz attempts and evaluations
    - Agent logs
- GDPR compliance considerations:
    - User data export capability
    - Account deletion with data purge
    - Audit trail for data access

**Technical Requirements**:

- Database: MongoDB
- Collections:
    - users
    - classes
    - quizzes
    - quiz_attempts
    - notifications
    - agent_logs
- Indexes: Optimized for common queries
- Backup: Daily automated backups

---

### 4.6 Analytics \& Reporting

#### 4.6.1 Faculty Dashboard

**Priority**: P1 (Should Have)

**Functional Requirements**:

- Overview metrics:
    - Total classes created
    - Total quizzes published
    - Total students across classes
    - Overall class performance average
- Per-class analytics:
    - Student count
    - Quiz count
    - Average performance
    - Completion rates
- Quiz analytics:
    - Attempt count
    - Average score
    - Question-wise difficulty analysis
    - Time taken distribution
- Student performance reports:
    - Individual student quiz history
    - Topic-wise performance
    - Progress over time

#### 4.6.2 Student Dashboard

**Priority**: P1 (Should Have)

**Functional Requirements**:

- Overview metrics:
    - Enrolled classes count
    - Quizzes attempted/available
    - Average score across quizzes
    - Rank in classes (optional)
- Performance analytics:
    - Quiz-wise scores
    - Topic-wise strengths/weaknesses
    - Progress trend chart
    - Comparison with class average
- Upcoming quizzes list
- Recent advisory messages

#### 4.6.3 CR Dashboard

**Priority**: P2 (Nice to Have)

**Functional Requirements**:

- Access based on faculty-granted permissions:
    - Class performance overview (if permitted)
    - Individual student reports (if permitted)
    - LLM API usage stats (if permitted)
- Student list with performance indicators
- Identify struggling students for intervention

---

## 5. Technical Architecture

### 5.1 Technology Stack

**Frontend**:

- React + Vite
- Zustand (State Management)
- Tailwind CSS
- Lucide Icons
- Axios

**Backend**:

- Node.js + Express
- MongoDB (Atlas)
- JWT Authentication
- bcrypt (Password Hashing)

**AI/ML**:

- LangChain (Agents)
- LangGraph (Orchestration)
- Gemini 2.0 Flash / Gemma 3 27B
- MongoDB Atlas Vector Search
- LangSmith (Tracing - future)

**Infrastructure**:

- Cloud hosting (Render/Vercel)
- MongoDB Atlas (Database + Vector Search)
- CDN for static assets
- CI/CD pipeline

### 5.2 Agent Architecture

```
┌──────────────────────────────────────────────────────┐
│ Orchestrator Agent Node (LangGraph)                 │
│ - Reads QuizState + nextNode routing key            │
│ - Routes to next worker node                        │
│ - Handles failed/completed end transitions          │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
 content -> objective -> subjective -> merge -> options -> review -> formatting
    ↑                                                                    │
    └────────────────────────── return to orchestrator after each node ──┘
```

### 5.3 Data Models

**User Schema**:

- \_id, role, fullName, email, password (hashed)
- studentId/facultyId
- year, branch, department, designation
- isEmailVerified, accountStatus
- timestamps

**Class Schema**:

- \_id, subjectName, subjectCode, classCode
- semester, classSlot, venue, department, academicYear
- faculty (ref: User)
- students: [{ user (ref: User), joinedAt, status }]
- classRepresentative (ref: User)
- isArchived
- timestamps

**Quiz Schema**:

- \_id, classId (ref: Class), title, description
- duration, scheduledAt, deadline
- questions: [{ questionText, type, options, correctAnswer, marks }]
- pdfId (ref: GridFS), status (draft/published)
- requirements: { numQuestions, totalMarks, questionTypes, difficulty }
- timestamps

**QuizAttempt Schema**:

- \_id, quizId (ref: Quiz), studentId (ref: User), classId (ref: Class)
- startedAt, submittedAt, timeSpent
- answers: [{ questionIndex, selectedAnswer, isCorrect, marksAwarded }]
- totalMarks, percentage
- advisory: { strengths, weaknesses, recommendations }
- timestamps

### 5.4 Security Requirements

- HTTPS only (TLS 1.3)
- JWT token-based authentication
- Password hashing: bcrypt (salt rounds: 12)
- Input validation and sanitization
- Rate limiting: 100 requests/minute per user
- CORS configured for frontend domain only
- MongoDB (NoSQL) injection prevention
- XSS protection
- CSRF tokens for state-changing operations

### 5.5 Performance Requirements

- Page load time: <2 seconds
- Quiz submission response: <5 seconds
- Question generation: <30 seconds
- Answer evaluation: <10 seconds
- API response time: <500ms (non-AI endpoints)
- Concurrent users: Support 1000+ simultaneous
- Database queries: Indexed for <100ms response

---

## 6. User Stories

### 6.1 Faculty User Stories

**US-F1**: As a faculty, I want to register with my faculty ID so that I can access the platform.

**US-F2**: As a faculty, I want to create a class with subject details so that students can join and take quizzes.

**US-F3**: As a faculty, I want to generate a unique class code so that students can easily join my class.

**US-F4**: As a faculty, I want to assign a student as Class Representative so that they can help me manage the class.

**US-F5**: As a faculty, I want to control what data the CR can access so that student privacy is maintained.

**US-F6**: As a faculty, I want to create a quiz by uploading a PDF so that questions are generated from my study material.

**US-F7**: As a faculty, I want to create a quiz without uploading a PDF so that questions are generated from the LLM's knowledge.

**US-F8**: As a faculty, I want to specify quiz requirements (number of questions, marks, types) so that the generated quiz meets my needs.

**US-F9**: As a faculty, I want to review and edit AI-generated questions so that I can ensure quality.

**US-F10**: As a faculty, I want to delete uploaded PDFs and their vector data so that I can manage storage.

**US-F11**: As a faculty, I want to view class performance analytics so that I can identify areas for improvement.

**US-F12**: As a faculty, I want to view individual student reports so that I can provide targeted guidance.

### 6.2 Student User Stories

**US-S1**: As a student, I want to register with my student ID so that I can access the platform.

**US-S2**: As a student, I want to join a class using a class code so that I can access quizzes.

**US-S3**: As a student, I want to view all available quizzes in my classes so that I can plan my preparation.

**US-S4**: As a student, I want to attempt quizzes within the scheduled time so that I can evaluate my knowledge.

**US-S5**: As a student, I want to see a timer during the quiz so that I can manage my time.

**US-S6**: As a student, I want to submit my quiz answers so that they are evaluated.

**US-S7**: As a student, I want to receive instant results after submission so that I know my performance.

**US-S8**: As a student, I want to get personalized advice after each quiz so that I can improve.

**US-S9**: As a student, I want to view my quiz history and performance trends so that I can track my progress.

**US-S10**: As a student, I want to see topic-wise strengths and weaknesses so that I can focus my studies.

### 6.3 Class Representative User Stories

**US-CR1**: As a CR, I want to view class performance (if permitted) so that I can identify struggling students.

**US-CR2**: As a CR, I want to view individual student reports (if permitted) so that I can offer help.

**US-CR3**: As a CR, I want to view LLM API usage statistics (if permitted) so that I can understand platform costs.

---

## 7. Future Enhancements

### 7.1 BYOK (Bring Your Own Key) Architecture

**Priority**: P2 (Future Update)

**Description**: Allow faculty to use their own OpenAI/Google/Anthropic LLM API keys instead of platform-provided keys.

**Benefits**:

- Transparency in API costs
- Faculty control over usage and billing
- Reduces platform operational costs

**Requirements**:

- Secure key storage (encrypted)
- Per-faculty key configuration
- Usage tracking per key
- Fallback to platform keys if faculty key fails

### 7.2 LangSmith Tracing Integration

**Priority**: P2 (Future Update)

**Description**: Show LangSmith tracing to BYOK users for debugging and monitoring agent workflows.

**Benefits**:

- Transparency in agent behavior
- Debugging capabilities for faculty
- Performance optimization insights

**Requirements**:

- LangSmith API integration
- Per-user tracing sessions
- Dashboard to view traces
- Privacy controls (only show own traces)

### 7.3 Additional Future Features

- **Collaborative quizzes**: Group assessments
- **Adaptive quizzes**: Difficulty adjusts based on performance
- **Gamification**: Badges, leaderboards, streaks
- **Mobile app**: Native iOS/Android apps
- **Proctoring**: Webcam-based monitoring for exams
- **Question bank**: Reusable question library
- **Multi-language support**: Hindi, regional languages
- **Integration**: LMS integration (Moodle, Canvas)
- **Advanced analytics**: Predictive performance modeling

---

## 8. Success Criteria

### 8.1 Launch Criteria (MVP)

- All P0 features functional
- > 95% question generation accuracy
- > 90% answer evaluation accuracy
- <5% error rate across workflows
- Security audit passed
- Performance benchmarks met

### 8.2 Post-Launch Success Metrics (3 months)

- 50+ faculty sign-ups
- 500+ student sign-ups
- 100+ classes created
- 1000+ quizzes attempted
- > 4/5 faculty satisfaction score
- > 4/5 student satisfaction score
- <1% critical bug rate

---

## 9. Risks \& Mitigations

### 9.1 Technical Risks

**Risk**: LLM API downtime or rate limiting
**Mitigation**:

- Implement retry logic with exponential backoff
- Queue system for batch processing
- Fallback to secondary LLM provider

**Risk**: Vector search performance degradation at scale
**Mitigation**:

- Optimize indexing strategy
- Implement caching layer
- Monitor query performance metrics

**Risk**: Answer evaluation inaccuracy
**Mitigation**:

- Continuous model fine-tuning
- Faculty feedback loop for corrections
- A/B testing evaluation prompts

### 9.2 Business Risks

**Risk**: Low faculty adoption
**Mitigation**:

- Free trial period
- Demo sessions and workshops
- Faculty incentive programs

**Risk**: High operational costs (LLM API usage)
**Mitigation**:

- Implement BYOK early
- Optimize prompts for token efficiency
- Usage-based pricing model

---

## 10. Compliance \& Privacy

### 10.1 Data Privacy

- Student data: Name, email, quiz attempts, performance
- Faculty data: Name, email, uploaded PDFs, API keys (encrypted)
- Data retention: 2 years after last activity
- Right to deletion: Users can request full data purge

### 10.2 Compliance Requirements

- GDPR compliance (for EU users in future)
- Educational data privacy standards
- Secure storage of PII
- Audit trails for data access

---

## 11. Timeline \& Milestones

### Phase 1: MVP Development (8-10 weeks)

- Day 1: User authentication and class management
- Day 2: Quiz creation and question generator agent
- Day 2: Quiz taking and answer checker agent
- Day 3: Advisory agent and orchestrator integration
- Day 4: Testing, bug fixes, deployment

### Phase 2: Beta Launch (2 Days)

- Pilot with 5-10 faculty and their classes
- Gather feedback and iterate
- Performance monitoring and optimization

### Phase 3: Public Launch (5 days)

- Marketing and outreach
- Full platform availability
- User support setup

### Phase 4: Future Updates (2-3 weeks post-launch)

- BYOK architecture implementation
- LangSmith tracing integration
- Additional feature rollouts

---

## 12. Appendix

### 12.1 Glossary

- **CR**: Class Representative
- **BYOK**: Bring Your Own Key
- **RAG**: Retrieval Augmented Generation
- **LLM**: Large Language Model
- **JWT**: JSON Web Token
- **MCQ**: Multiple Choice Question
- **MSQ**: Multiple Select Question

### 12.2 References

- LangChain Documentation
- LangGraph Documentation
- MongoDB Atlas Vector Search Guide
- OpenAI API Documentation
- LangSmith Documentation

---

**END OF DOCUMENT**
