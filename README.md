<div align="center">

<img src="./apps/web/public/logo.png" alt="QuizMitra Logo" width="120" />

# QuizMitra

### AI-Powered Academic Assessment Platform

**Automate quiz creation. Evaluate every answer. Deliver personalized guidance at the classroom scale.**

[![Status](https://img.shields.io/badge/Status-Beta-blue?style=flat-square)](https://github.com/suryanshparashar/quizmitra)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20%20LTS-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![AI](https://img.shields.io/badge/AI-Sarvam--M%20%7C%20LangGraph-8B5CF6?style=flat-square)](https://sarvam.ai)

[**Live Demo**](https://quizmitra.suryanshparashar.com) · [**PRD**](./docs/PRD.md) · [**Technical Docs**](./docs/TechnicalDocumentation.md) · [**Project Report**](./docs/ProjectReport.md)

</div>

---

## The Problem

Faculty spend hours creating quizzes, grading subjective answers, and writing individual feedback — tasks that are repetitive, inconsistent at scale, and leave students with delayed, generic results. Existing tools solve one piece at a time: MCQ generators, basic auto-graders, or heavyweight proctoring suites that cost a fortune.

**QuizMitra solves the entire lifecycle in one platform.**

---

## What QuizMitra Does

QuizMitra is a full-stack web application with a modular **multi-agent AI pipeline** that automates every stage of academic assessment:

| Stage | What happens |
|---|---|
| **Creation** | Faculty uploads a PDF or enters topics → AI generates a complete quiz |
| **Review** | Faculty edits, regenerates, or adds questions before publishing |
| **Attempt** | Students attempt within a scheduled window with a server-enforced timer |
| **Evaluation** | Objective answers are checked deterministically; subjective answers via LLM-assisted scoring |
| **Advisory** | Each student receives a personalized report: strengths, weak areas, and a study roadmap |
| **Analytics** | Faculty and students get role-specific dashboards with performance trends |

---

## ✨ Feature Highlights

### 🎓 For Faculty
- Create classes with auto-generated 6-character join codes
- Generate quizzes from **uploaded PDFs** (RAG-powered) or **topic keywords**
- Configure question types (MCQ, MSQ, True/False, Short, Long, One-Word), marks, and difficulty
- Review, edit, regenerate, or add individual questions before publishing
- Control answer visibility and feedback release timing per quiz
- Enable **negative marking** and **question/option shuffling**
- Republish quizzes post-deadline for missed students
- Detailed class analytics with performance trend charts

### 🧑‍🎓 For Students
- Join classes via code or invite link
- Attempt quizzes in a clean, distraction-controlled interface
- Server-aligned countdown timer with auto-submit
- Instant results with question-wise breakdown
- **Personalized AI advisory** after every quiz, not generic tips, but guidance based on your actual answers and history
- Cumulative performance insights that evolve across attempts

### 🛡️ Integrity Controls
- Server-side timer (tamper-resistant)
- Full-screen enforcement during attempts
- DevTools and right-click restrictions
- Alt + ← navigation blocking
- Policy violation → automatic debar flow

---

## 🧠 Multi-Agent Architecture

QuizMitra's core novelty is its **modular AI pipeline**, not a single monolithic LLM call, but a graph of specialized agents orchestrated via **LangGraph**.

```

                                           Content Input
                                                ↓
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Orchestrator Agent (LangGraph)                                       │
│                           Manages state, routing, retries, and fail paths                              │
└────┬────────────┬─────────────┬─────────────┬───────────────┬────────────────────┬────────────┬────────┘
     ↓            ↓             ↓             ↓               ↓                    ↓            ↓
Objective    Subjective     Distractor    Document         Quality  →  Merge  →  Answer  →  Advisory Agent
Generator    Generator      Agent         Intelligence     Checker               Checker   (Personalized Report)
Agent        Agent       (Wrong Options)  Agent (OCR)      Agent             (Evaluation)


```

### Agents at a Glance

| Agent | Role |
|---|---|
| **Orchestrator** | LangGraph-based workflow control, state transitions, error recovery |
| **Objective Generator** | MCQ / MSQ / True-False question generation |
| **Subjective Generator** | Short / Long answer questions with rubric guidance |
| **Distractor Agent** | Generates high-quality, plausible incorrect options |
| **Quality Checker** | Validates output format, deduplication, difficulty alignment |
| **Answer Checker** | Deterministic for objective; LLM-rubric scoring for subjective |
| **Advisory Agent** | Personalized strengths/weaknesses/recommendations per student |
| **Document Intelligence** | Sarvam-Vision OCR, extracts text from uploaded PDFs/images |
| **AI Service Layer** | Shared prompt contracts, schema normalization, LangSmith tracing hooks |

---

## 🛠️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-000000?style=flat-square)
![Recharts](https://img.shields.io/badge/Recharts-FF6384?style=flat-square)

### Backend
![Node.js](https://img.shields.io/badge/Node.js_20_LTS-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)

### AI & Orchestration
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square)
![LangGraph](https://img.shields.io/badge/LangGraph-8B5CF6?style=flat-square)
![Sarvam](https://img.shields.io/badge/Sarvam--M_%7C_Vision-FF6B35?style=flat-square)
![Vector Search](https://img.shields.io/badge/MongoDB_Vector_Search-47A248?style=flat-square&logo=mongodb&logoColor=white)

### Infrastructure
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white)

---

## 🏗️ System Architecture

```

┌─────────────────────────────────────────────────────┐
│ CLIENT LAYER                                        │
│ React + Vite SPA (Role-based dashboards)            │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / REST API
┌─────────────────────▼───────────────────────────────┐
│ APPLICATION LAYER                                   │
│ Express.js API Gateway                              │
│ Auth │ Class │ Quiz │ Analytics │ Notifications     │
│ ─────────────────────────────────────────────────── │
│ Business Logic + Role Authorization                 │
│ ─────────────────────────────────────────────────── │
│ Multi-Agent System (LangGraph)                      │
└────────────┬────────────────────────┬───────────────┘
             │                        │
    ┌────────▼────────┐    ┌──────────▼──────────┐
    │ DATA LAYER      │    │ EXTERNAL SERVICES   │
    │ MongoDB Atlas   │    │ Sarvam-M / Vision   │
    │ Vector Search   │    │ Cloudinary          │
    │ GridFS          │    │ LangSmith (active)  │
    └─────────────────┘    └─────────────────────┘

```

---

## 📂 Project Structure

```

quizmitra/
├── apps
|   ├── frontend/ # React + Vite SPA
|   │   └── src/
|   │       ├── components/ # Reusable UI components
|   │       ├── pages/ # Role-specific page components
|   │       ├── store/ # Zustand state management
|   │       └── utils/ # API helpers, formatters
|   └── backend/ # Node.js + Express API
|       └── src/
|           ├── agents/ # LangChain/LangGraph agents
|           ├── controllers/ # Route handlers
|           ├── middleware/ # Auth, validation, rate limiting
|           ├── models/ # Mongoose schemas
|           ├── routes/ # API routes
|           └── utils/ # ApiError, ApiResponse, asyncHandler
├── docs/ # PRD, Technical Docs, Project Report
├── .gitignore
├── .prettierignore
├── .prettierrc
├── LICENSE
└── README.md

```

---

## 🚀 Running the Project

> **This is a proprietary project.** Source code is publicly visible
> for academic evaluation and portfolio review only.
> Setup and deployment details are available upon request.

---

## 📡 API Design

QuizMitra follows a RESTful API architecture with role-based access
control across all protected routes.

**Design principles:**
- Resource-based URL structure under `/api/v1/`
- JWT Bearer token authentication on all protected routes
- Consistent `ApiResponse` / `ApiError` response envelope
- Role-guard middleware (Faculty / Student / CR) per route
- Rate limiting: 100 req/min general · 5 req/min auth · 10 req/min AI

**Core API domains:**
- `auth` - Registration, login, token refresh, email verification
- `classes` - Class creation, joining, CR management, archiving
- `quizzes` - Generation, publishing, attempt submission, evaluation
- `dashboard` - Role-specific aggregated stats and activity
- `analytics` - Class and student performance breakdowns
- `notifications` - Event-triggered alerts with read-state lifecycle

---

---

## 📈 Grading Scale

| Grade | Range | Grade | Range |
|---|---|---|---|
| **S** | 91 - 100 | **D** | 51 - 60 |
| **A** | 81 - 90 | **E** | 40 - 50 |
| **B** | 71 - 80 | **F** (fail) | < 40 |
| **C** | 61 - 70 | **N** | Debarred |

---

## 🗺️ Roadmap

- [x] End-to-end quiz lifecycle (create → attempt → evaluate → advise)
- [x] Multi-agent AI pipeline with LangGraph orchestration
- [x] PDF-based and topic-based generation modes
- [x] Hybrid evaluation (objective + LLM-assisted subjective)
- [x] Personalized advisory with cumulative performance insights
- [x] Anti-cheat controls (fullscreen, devtools, server-timer, debar)
- [x] Role-based dashboards and analytics
- [x] Notification system
- [x] Negative marking and question shuffling
- [x] CR system with faculty-configurable permissions
- [ ] Security hardening (rate limiting, Helmet, Zod coverage)
- [ ] BYOK: Bring Your Own LLM API Key
- [ ] LangSmith user-facing trace visibility
- [ ] Question Bank for reusable question storage
- [ ] Quiz retake workflows
- [ ] Multi-PDF weighted generation
- [ ] Rephrase Question feature

---

## 📚 Project Documentation

| Document | Description |
|---|---|
| [`PRD.md`](./docs/PRD.md) | Full Product Requirements Document |
| [`TechnicalDocumentation.md`](./docs/TechnicalDocumentation.md) | Architecture, API specs, DB schemas, agent implementation |
| [`DesignSystemDocument.md`](./docs/DesignSystemDocument.md) | Color system, typography, components, screen layouts |
| [`FeatureRoadmap.md`](./docs/FeatureRoadmap.md) | Detailed feature checklist with completion status |
| [`ProjectReport.md`](./docs/ProjectReport.md) | Academic project report (all chapters) |

---

## 📄 License

```

Copyright (c) 2026 Suryansh Parashar. All Rights Reserved.

This source code is publicly visible for academic evaluation and
portfolio review only. No permission is granted to use, copy,
modify, merge, publish, distribute, sublicense, or sell copies
of this software without explicit written permission from the author.

```

---

<div align="center">

Built with ❤️ by **Suryansh Parashar**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Suryansh_Parashar-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/suryanshparashar-dev)
[![GitHub](https://img.shields.io/badge/GitHub-suryanshparashar-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/suryanshparashar)

</div>
