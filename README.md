# QuizMitra

AI-powered academic assessment platform for colleges and universities, built to automate the complete quiz lifecycle: creation, participation, evaluation, and personalized feedback.

QuizMitra combines a full-stack web app with a modular multi-agent AI pipeline to help faculty save time and help students improve with faster, actionable learning insights.

---

## ✨ What QuizMitra Solves

Traditional quiz workflows are often slow, repetitive, and difficult to scale. QuizMitra addresses this by enabling:

- Automated quiz generation from **PDFs** or **topics**
- Hybrid evaluation for both objective and subjective answers
- Personalized post-quiz advisory for each student
- Role-based analytics for Faculty and Students
- Integrity-aware quiz attempts with anti-cheat controls

---

## 🎯 Product Vision

> Revolutionize academic assessments using AI agents that generate contextual quizzes, evaluate responses intelligently, and deliver personalized learning guidance — while preserving faculty control, transparency, and classroom practicality.

---

## 🚀 Current Status

**MVP and major beta features are implemented.**  
Core quiz lifecycle, AI generation/evaluation/advisory, dashboards, notifications, and several integrity controls are production-ready in the current prototype.

Created as a practical classroom-ready system, not just a demo.

---

## 👥 User Roles

- **Faculty**
  - Create/manage classes and quizzes
  - Generate questions from materials/topics
  - Publish quizzes and monitor performance
- **Student**
  - Join classes and attempt quizzes
  - Receive scores, feedback, and advisory guidance
  - Track progress over time
- **Class Representative (CR)**
  - Optional class-level role with faculty-configured permissions

---

## 🧠 Key Features

## 1) User Management & Auth

- Faculty/Student role-based registration
- Secure login with JWT + refresh flow
- Password hashing (`bcrypt`)
- Profile management (view/edit/profile picture)

## 2) Class Management

- Faculty class creation with unique 6-char class code
- Student class joining via code/invite link
- Class details, leave/remove actions, archive support
- Class Representative assignment and permission controls

## 3) Quiz Management

- Quiz creation with:
  - Basic info + scheduling
  - Configurable question counts, types, difficulty, marks
- Generation modes:
  - **PDF-based generation** (context-aware)
  - **Topic-based generation**
- Faculty review tools:
  - Edit/regenerate/change/add generated questions
- Publish workflow from draft to live quiz

## 4) Quiz Attempt & Evaluation

- Student attempt interface with:
  - Server-aligned timer
  - Navigation and answer status
  - Autosave + manual submit
- Auto-evaluation:
  - Objective: deterministic checks
  - Subjective: LLM-assisted scoring
- Question-wise feedback and controlled answer visibility
- Republish support (post-deadline attempt opportunities)

## 5) Advisory & Insights

- Personalized AI advisory reports:
  - Strengths
  - Weaknesses
  - Recommendations
  - Motivation
- Cumulative performance insights stored and regenerated across attempts

## 6) Dashboards & Analytics

- Faculty dashboard:
  - classes/quizzes/students/performance summary
  - trend charts and recent activity
- Student dashboard:
  - enrolled/completed/average stats
  - available quizzes and performance trends
- Class/student analytics and export support (CSV/PDF - nice to have)

## 7) Notifications

- In-app notification schema + APIs
- Event-triggered notifications (published, graded, class events, etc.)
- Mark-as-read behavior integrated with interaction flows

## 8) Integrity & Anti-Cheat Controls

- Server-side timer handling
- Policy violation-driven debar flow
- Restricted behavior during attempts:
  - Alt + Left navigation restrictions
  - Full-screen enforcement
  - Devtools/context-menu shortcut restrictions
- One-attempt style discipline (future-configurable)

---

## 🧩 Multi-Agent Architecture (Core Novelty)

QuizMitra uses a **modular multi-agent system** orchestrated via **LangGraph**.

### Orchestration Flow (High-Level)

`content → objective → subjective → merge → options → review → formatting`

A dedicated orchestrator coordinates node routing, state transitions, retries, and fail/complete exits.

### Specialized Agents

- **Orchestrator Agent** – workflow control and state routing
- **Objective Question Generation Agent** – MCQ/MSQ/True-False generation
- **Subjective Question Generation Agent** – Short/Long question generation
- **Distractor Agent** – plausible incorrect options
- **Quality Checker Agent** – validation and quality gates
- **Answer Checker Agent** – hybrid scoring for submissions
- **Advisory Agent** – personalized learning guidance
- **Document Intelligence Agent** – OCR/text extraction from uploaded material
- **Supporting AI Service Layer** – schema normalization, prompt contracts, safety checks, tracing hooks

---

## 🛠️ Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Zustand
- Axios
- Recharts
- Lucide icons

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT auth
- bcrypt

### AI & Orchestration
- LangChain
- LangGraph
- Sarvam-M (text agents)
- Sarvam-Vision (OCR/document intelligence)
- Vector retrieval pipeline for contextual generation

### Infra & Tooling
- MongoDB Atlas
- Cloudinary (material storage in current implementation)
- ESLint / Prettier
- Postman
- Git + GitHub

---

## 📦 Core Functional Modules

- Authentication & Profile
- Class & Membership
- Quiz Authoring & Publishing
- Material Ingestion (PDF/resources)
- Attempt Lifecycle & Evaluation
- Advisory & Performance Insights
- Notifications
- Faculty/Student Analytics

---

## 🔐 Security & Reliability Highlights

- JWT-based protected routes with role authorization
- Environment-based secret management
- Input validation/sanitization hardening in progress
- Security hardening roadmap includes:
  - Rate limiting
  - Zod validation coverage expansion
  - Helmet headers

---

## 📈 Grading Scale

- **S**: 91–100  
- **A**: 81–90  
- **B**: 71–80  
- **C**: 61–70  
- **D**: 51–60  
- **E**: 40–50  
- **F**: <40  
- **N**: Debarred

---

## 🗺️ Roadmap Snapshot

### ✅ Completed (Major)
- End-to-end quiz lifecycle
- Multi-mode generation and hybrid evaluation
- Advisory pipeline
- CR support and role-aware dashboards
- Material management and notifications
- Multiple integrity-focused enhancements

### 🟡 In Progress / Remaining (Near-Term)
- Security hardening
  - Rate limiting
  - Validation coverage checks
  - Helmet headers

### 🔮 Future Enhancements
- BYOK (Bring Your Own Key) architecture
- LangSmith user-visible tracing integration
- Question Bank
- Quiz retake workflows
- Multi-PDF weighted generation
- Rephrase question feature
- Extended CR permissions and observability controls

---

## 🧪 Prototype Workflow (End-to-End)

1. Faculty creates class
2. Students join class
3. Faculty creates quiz (PDF/topic mode)
4. AI generates and faculty reviews questions
5. Quiz is published
6. Students attempt within schedule window
7. System evaluates submissions
8. Advisory + dashboards + notifications update

---

## 📚 Documentation Artifacts

This README is aligned with the project artifacts:

- Product Requirements Document (PRD)
- Feature Roadmap & Todo
- Project Technical Report

---

## 📄 License

© 2026 Suryansh Parashar. All Rights Reserved.
This repository is publicly visible for academic evaluation 
and portfolio review only. No permission is granted to copy, 
modify, or distribute this code.

---

### Author

**Suryansh Parashar**
