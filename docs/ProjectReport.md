# QuizMitra Project Report

## Document Information

- **Product Name**: QuizMitra
- **Version**: 1.0.0
- **Date**: March 29, 2026
- **Author**: Suryansh Parashar
- **Status**: Approved

---

## CHAPTER-1: PROJECT DESCRIPTION AND OUTLINE

### 1.1 Introduction

QuizMitra is an AI-enabled academic assessment platform built to automate the full quiz lifecycle for higher education use cases. The system supports faculty, students, and controlled class-level roles (for example, Class Representative) to coordinate quiz creation, quiz participation, evaluation, and performance analytics from a unified web application.

At a system level, QuizMitra integrates:

- A React + Vite frontend for role-based dashboards and workflows.
- A Node.js + Express backend with MongoDB persistence.
- AI-assisted services for quiz generation, subjective answer evaluation, and personalized advisory output.
- Sarvam-M (free) as the primary sovereign Bharatiya model for text agents, and Sarvam-Vision for OCR/document intelligence.
- Notification, reporting, and analytics pipelines for operational visibility.

The project was designed as a practical, extensible platform for real classroom operations, not only as a demo workflow. It therefore includes operational details such as scheduling constraints, one-attempt policy, anti-cheat enforcement, secure authentication, and granular post-evaluation visibility controls.

### 1.2 Motivation for the work

Traditional academic quiz workflows often create a heavy workload for faculty:

- Manual quiz creation consumes substantial preparation time.
- Subjective answer evaluation is repetitive and inconsistent at scale.
- Students typically receive delayed and generic feedback.
- Class-level insights are fragmented across tools or unavailable in time.

The motivation behind QuizMitra is to reduce this operational burden while improving assessment quality and learner outcomes. The platform seeks to combine speed (automated generation and grading), fairness (rule-based and model-assisted evaluation), and pedagogy (actionable feedback and trend analytics) in a single system.

A second motivation is architecture-level experimentation with multi-agent AI orchestration in education technology, where traceable and modular agent behavior can support future customization, BYOK integrations, and stronger governance.

### 1.3 Problem Statement

Educational institutions need a secure, scalable, and intelligent quiz management system that can:

- Generate high-quality quizzes from source material or topic prompts.
- Evaluate both objective and subjective responses efficiently.
- Provide personalized and timely feedback to students.
- Offer faculty meaningful dashboard analytics for intervention and planning.
- Maintain integrity during quiz attempts and reduce manipulation risk.

Existing workflows do not adequately satisfy all these requirements in one integrated, low-friction, role-aware platform.

### 1.4 Objective of the work

The primary objectives of QuizMitra are:

- Design and implement an end-to-end AI-supported quiz platform.
- Enable faculty to create/publish quizzes through PDF-based and topic-based generation modes.
- Support mixed question types (MCQ, True/False, Short, Long, etc.) with configurable scoring logic.
- Provide student-facing quiz attempt experiences with timer and anti-cheat controls.
- Automate objective and subjective evaluation with transparent scoring output.
- Generate personalized post-quiz advisory insights for students.
- Deliver role-based dashboards and analytics for faculty and students.
- Ensure extensibility through modular architecture and documented APIs.

### 1.5 Summary

Chapter 1 introduced QuizMitra as a full-stack, AI-assisted educational assessment platform. It established the motivating constraints in current academic workflows, formalized the core problem statement, and outlined the system goals related to automation, reliability, security, and learning impact.

---

## CHAPTER-2: RELATED WORK INVESTIGATION

### 2.1 Existing Approaches/Methods

Current solutions in the assessment ecosystem can be grouped into four broad categories:

1. Manual LMS quiz workflows

- Faculty create and grade quizzes directly in LMS tools.
- Strong administration support but limited AI augmentation.

2. Basic auto-grading quiz systems

- Fast objective grading for MCQ-like formats.
- Limited support for subjective evaluation quality.

3. Third-party AI question generators

- Generate content quickly from prompts or documents.
- Often weak integration with institutional class lifecycle and analytics.

4. Proctoring-first exam tools

- Focus heavily on surveillance and invigilation.
- Frequently costly, intrusive, and not always suitable for routine academic quizzes.

QuizMitra positions itself as a balanced system that combines classroom workflow practicality, AI augmentation, analytics visibility, and integrity safeguards.

### 2.2 Pros and cons of the stated Approaches/Methods

1. Manual LMS workflows

- Pros:
    - High control for instructors.
    - Low AI risk and predictable behavior.
- Cons:
    - Time intensive for creation and grading.
    - Delayed feedback loops.
    - Limited personalization.

2. Basic auto-grading systems

- Pros:
    - Fast objective evaluation.
    - Simple to operate for standardized tests.
- Cons:
    - Poor support for nuanced subjective answers.
    - Limited pedagogic guidance after score display.

3. Standalone AI generation tools

- Pros:
    - Rapid question drafting.
    - Better ideation for topic coverage.
- Cons:
    - Integration gaps with class membership, attempt rules, and grading workflows.
    - Weak governance and reproducibility in educational settings.

4. Proctoring-centric platforms

- Pros:
    - Strong exam integrity orientation.
    - Clear institutional fit for high-stakes tests.
- Cons:
    - Privacy concerns and adoption friction.
    - High operational cost and setup overhead.

Compared to these, QuizMitra aims for a classroom-ready middle path: practical automation, role-aware controls, feedback intelligence, and incremental anti-cheat mechanisms.

---

## CHAPTER-3: REQUIREMENT ARTIFACTS

### 3.1 Introduction

This chapter consolidates system requirements derived from the PRD, design documentation, and implementation roadmap. Requirements are grouped as infrastructure requirements, specific functional and non-functional needs, and experience constraints.

### 3.2 Hardware and Software requirements

#### Hardware requirements

- Developer machine (recommended):
    - CPU: Quad-core modern processor.
    - RAM: 8 GB minimum, 16 GB recommended.
    - Storage: 10 GB free for repository, node modules, and local artifacts.
- User client device:
    - Desktop/laptop/mobile browser with modern JavaScript support.
- Network:
    - Stable internet connectivity for API operations and AI-assisted features.

#### Software requirements

- Frontend stack:
    - React 18+, Vite, Tailwind CSS, Zustand, Axios, Recharts, Lucide icons.
- Backend stack:
    - Node.js 22 LTS, Express.js, MongoDB + Mongoose.
- Security/auth:
    - JWT, bcrypt, CORS, environment-based secrets, and OTP-based email verification.
- AI and orchestration:
    - LangChain, LangGraph, Sarvam-M for text-agent tasks, and Sarvam-Vision for OCR/document intelligence.
- Tooling:
    - Git, VS Code, ESLint, Prettier, Postman, LangSmith for active internal LLM observability (tracing).

### 3.3 Specific Project requirements

#### 3.3.1 Data requirement

Core data entities include:

- Users: faculty and student roles with profile/auth metadata.
- Classes: class metadata, faculty ownership, student memberships, optional CR metadata.
- Quizzes: schedule, deadline, requirements, PDFs or Topic Keywords, publish status.
- Quiz attempts: attempt timing, answer payloads, scoring, advisory output, integrity metadata.
- Notifications: type, recipient, read state, linked resources.
- Materials/PDF assets: source document metadata, extraction status, embeddings linkage.

Data quality and governance requirements:

- Referential integrity via object references across user/class/quiz/attempt artifacts.
- Validation for required fields, lengths, status transitions, and role-scoped access.
- Indexing support for common dashboard and list retrieval patterns.

#### 3.3.2 Functions requirement

High-priority functional requirements:

- Registration, login, token-based session management.
- Email verification with OTP flow (OTP generation, persistence, expiry handling, and validation).
- Class creation/join/management workflows.
- Quiz creation with:
    - PDF/material-based generation mode.
    - Topic/keyword-based generation mode.
    - Configurable question count, types, difficulty, marks, negative marking.
- Quiz publishing and scheduling constraints.
- Student attempt flow:
    - Server-managed timer and attempt tokenization.
    - Submit and evaluate pipeline.
    - Result view with optional answer visibility controls.
- Faculty grading/review workflows including debar visibility.
- Notifications and mark-as-read user interactions.
- Dashboard analytics for faculty and students.

Grading structure used in the system:

- 91-100: S
- 81-90: A
- 71-80: B
- 61-70: C
- 51-60: D
- 40-50: E
- <40: F (fail)
- Debarred: N

#### 3.3.3 Performance and security requirement

Performance requirements:

- Responsive dashboard rendering and filtered quiz list retrieval.
- Fast non-AI API response for routine operations.
- Stable behavior under concurrent class operations.

Security requirements:

- JWT authentication and role-based authorization on protected routes.
- Input validation/sanitization across user-generated payloads.
- Attempt integrity controls:
    - Server-started timer sessions.
    - Attempt token verification.
    - Violation-driven debar recording.
- Anti-cheat rules:
    - Alt + Left Arrow navigation is blocked during quiz attempt; violation can trigger debar from that quiz.
    - Full-screen mode must remain active during the attempt; exiting full-screen can trigger debar.
    - Developer tools are restricted during attempts (keyboard shortcuts and right-click context-menu path restrictions); violation can trigger debar.
    - Faculty can control whether correct answers are visible after submission; correct answers are automatically visible to students after quiz deadline.
- Secure secret management through environment variables.
- Defensive controls for route access and data exposure.

#### 3.3.4 Look and Feel Requirements

UI/UX requirements based on design artifacts:

- Clear card-based information hierarchy.
- Consistent color tokens and semantic feedback states.
- Responsive behavior across desktop/tablet/mobile breakpoints.
- Accessible typography, spacing, and focus affordances.
- Dashboard-first visualization approach for progress and outcomes.

### 3.4 Summary

Chapter 3 documented the implementation requirements at system, functional, and experience levels. These artifacts define the contract between design intent, engineering implementation, and quality assurance.

---

## CHAPTER-4: DESIGN METHODOLOGY AND ITS NOVELTY

### 4.1 Methodology and goal

QuizMitra follows a practical iterative methodology:

- Requirement synthesis from PRD and design system.
- Modular implementation in vertical slices (auth, class, quiz, attempt, analytics).
- Incremental hardening through roadmap-driven enhancement.
- Continuous alignment between UI behavior and backend validation.

Goal of the methodology:

- Deliver a production-oriented academic assessment product with measurable feature completeness and extensibility.

Novelty elements include:

- Multi-stage AI participation across generation, evaluation, and advisory rather than a single-point AI usage.
- Server-side attempt timing and policy-aware integrity controls integrated into routine quiz flow.
- Role-aware analytics and visibility controls tuned for educational contexts.

#### Multi-agentic AI Architecture (Novelty Specification)

QuizMitra incorporates a multi-agentic architecture where specialized agents execute distinct academic tasks under centralized orchestration. This modular AI design is a core novelty because it separates responsibilities, improves auditability, and enables independent enhancement of each agent.

1. Orchestrator Agent (LangGraph-based)

- Primary role:
    - Coordinates end-to-end AI workflows for quiz generation and quiz evaluation pipelines.
    - Routes task state between specialized agents.
- Input specification:
    - Workflow intent (generation/evaluation/advisory), user context, class/quiz metadata, and execution state.
- Output specification:
    - Consolidated workflow result with status, intermediate artifacts, and final payload.
- Operational behavior:
    - Maintains state transitions across agent stages.
    - Handles retries/error paths and controlled fallback behavior.

2. Objective Question Generation Agent

- Primary role:
    - Generates objective-type questions (MCQ, MSQ, True/False) from topic keywords or document-backed context.
- Input specification:
    - Objective question count/type distribution, difficulty target, marks mapping, topic/material context.
- Output specification:
    - Objective question set with question text, answer keys, and scoring-ready metadata.
- Operational behavior:
    - Enforces objective-format validity, answer-key consistency, and requirement adherence.

3. Subjective Question Generation Agent

- Primary role:
    - Generates subjective-type questions (Short/Long answer) with expected rubric guidance.
- Input specification:
    - Subjective question count, difficulty, marks, topic/material context, and pedagogy constraints.
- Output specification:
    - Subjective question set with rubric-aligned expected answers/evaluation guidance.
- Operational behavior:
    - Optimizes for depth, conceptual clarity, and evaluability in manual/AI-assisted scoring.

4. Wrong Option Generator Agent (Distractor Agent)

- Primary role:
    - Produces plausible but incorrect options for objective questions to improve assessment quality.
- Input specification:
    - Correct answer, question stem, difficulty level, and question type.
- Output specification:
    - High-quality distractor options with low ambiguity and reduced accidental correctness.
- Operational behavior:
    - Avoids duplicate/overlapping options, preserves conceptual challenge, and maintains option diversity.

5. Quality Checker Agent

- Primary role:
    - Reviews generated draft questions before final formatting and publication readiness.
- Input specification:
    - Merged draft question set, quiz requirements, and source context used during generation.
- Output specification:
    - Verified question set with corrected structure/metadata where possible, plus rejection/error flags for invalid items.
- Operational behavior:
    - Enforces quality gates such as duplicate reduction, question-type consistency, option/answer validity, and minimum required question count.
    - Fails fast when verified output is insufficient for requested quiz requirements.

6. Answer Checker Agent

- Primary role:
    - Evaluates student submissions using hybrid logic.
- Input specification:
    - Quiz schema, expected answers/rubrics, and student response payload.
- Output specification:
    - Question-wise scoring, correctness metadata, aggregate score components, and evaluation reasoning snippets.
- Operational behavior:
    - Deterministic checks for objective types.
    - Model-assisted scoring for subjective responses with structured output constraints.

7. Advisory Agent

- Primary role:
    - Produces personalized learning feedback from current and historical performance.
- Input specification:
    - Attempt outcomes, topic-level strengths/weaknesses, historical trend signals, and learner profile context.
- Output specification:
    - Structured advisory report: strengths, weak areas, recommendations, roadmap/practice guidance, motivational summary.
- Operational behavior:
    - Focuses on actionable pedagogy, not only score explanation.

8. Document Intelligence Agent (OCR Layer)

- Primary role:
    - Extracts and normalizes text from uploaded learning documents for downstream quiz generation.
- Model specification:
    - Sarvam-Vision is used for OCR/document intelligence tasks.
- Input specification:
    - Uploaded document assets (PDFs/images) and extraction constraints.
- Output specification:
    - Cleaned text blocks/chunks and metadata used by generation workflows.
- Operational behavior:
    - Provides document-to-text conversion prior to vectorization/retrieval pipelines.

9. Supporting AI Service Layer (Implementation Alignment)

- Purpose:
    - Provides model invocation utilities, prompt contracts, normalization, and safety checks used by the above agents.
- Expected properties:
    - Consistent output schema handling.
    - Centralized logging hooks with currently active LangSmith tracing for internal monitoring.
    - Planned BYOK enhancement: controlled user-facing visibility of their own LangSmith traces.

Overall novelty impact:

- Decoupled agent responsibilities improve maintainability.
- Orchestrated handoff between agents improves reliability over single-call monolithic prompting.
- Structured, stage-wise AI outputs increase explainability for educational use.

### 4.2 Functional modules design and analysis

The system is decomposed into functional modules:

- Authentication and profile module.
- Class and membership module.
- Quiz authoring and publishing module.
- Material/PDF ingestion and processing module.
- Quiz attempt and evaluation module.
- Advisory and performance insights module.
- Notification and analytics module.

Each module is designed with:

- Clear route/controller/model boundaries.
- Role-constrained access paths.
- Reusable utility abstractions for error handling and API responses.

### 4.3 Software Architectural designs

Architecture characteristics:

- Client-server architecture with RESTful APIs.
- Layered backend:
    - Routes -> Controllers -> Services/Models -> Database.
- Persistent data storage in MongoDB with indexed collections.
- AI service orchestration through dedicated service and agent nodes.

Why this architecture was selected:

- Fast development velocity in JavaScript ecosystem.
- Straightforward role and domain separation.
- Good compatibility with iterative enhancement and observability.

### 4.4 User Interface designs

UI design patterns include:

- Dashboard-centric navigation for role-specific priorities.
- Card-based surfaces for metrics, lists, and actions.
- Form structures with inline validation and feedback.
- Data visualization via trend charts and summaries.
- Responsive utility-class styling for adaptive layouts.

Recent UI refinements demonstrate design iteration:

- Enhanced faculty performance chart aesthetics and readability.
- Improved input affordances (character counts and limit warning states).
- Cleaner interaction intent for notifications and quiz integrity workflows.

### 4.5 Summary

Chapter 4 explained the design methodology, module decomposition, architecture model, and UI design strategy. The project novelty lies in combining practical classroom workflows with AI-enabled generation/evaluation/advisory and integrity-aware attempt orchestration.

---

## CHAPTER-5: TECHNICAL IMPLEMENTATION & ANALYSIS

### 5.1 Outline

This chapter presents implementation details from the frontend, backend, and AI orchestration perspectives, followed by prototype readiness summary.

### 5.2 Technical coding and code solutions

#### Backend implementation highlights

- Express-based API with modular controllers/routes for auth, classes, quizzes, attempts, notifications, and analytics.
- Mongoose schemas for core entities and index-backed retrieval patterns.
- Centralized utilities for async handling and uniform API response/error formats.
- Zoho Mail API integration (OAuth refresh-token flow) for sending OTP emails during verification flows.

Key implemented solutions:

- Server-side quiz timer sessions and attempt token validation to reduce client-side manipulation.
- Dedicated debar flow for policy violations without forcing full answer submission payload.
- Faculty grading pipeline enhanced with debar metadata visibility.
- Notification read-state updates integrated into action flows.

#### Frontend implementation highlights

- React pages organized by domain (dashboard, quizzes, classes, auth, analytics).
- State handling with React hooks and centralized auth/notification stores.
- Reusable UI components for layout, loading, toast feedback, and guards.

Key implemented solutions:

- Topic/keyword input character-count and limit breach signaling.
- Faculty dashboard chart redesign for improved visual clarity and insight readability.
- Route navigation UX improvements (scroll reset and polished list/action flows).

#### AI and analytics implementation highlights

- Sarvam-M (sovereign Indian AI model) adopted for text agents (generation, evaluation, and advisory workflows).
- Sarvam-Vision adopted for OCR/document intelligence during material ingestion.
- AI-assisted quiz generation from topic/material context.
- Hybrid evaluation logic combining deterministic and model-assisted scoring paths.
- Performance insight generation and dashboard trend rendering.

### 5.3 Prototype submission

The current prototype demonstrates a coherent end-to-end academic workflow:

- Faculty creates and publishes quiz.
- Student attempts quiz within timed policy constraints.
- System evaluates submission and generates outcomes/insights.
- Faculty and student dashboards reflect operational and performance state.

Prototype completeness indicators:

- Core role-based routes and pages operational.
- Major roadmap features for quiz lifecycle completed.
- Integration points for future features identified and scaffolded.

### 5.4 Summary

Chapter 5 documented implemented technical solutions and validated that the prototype supports real-world classroom usage patterns with AI augmentation, policy enforcement, and analytics visibility.

---

## CHAPTER-6: PROJECT OUTCOME AND APPLICABILITY

### 6.1 key implementations outline of the System

Core delivered implementations include:

- Secure role-based authentication and class management.
- Flexible quiz authoring with multiple generation modes.
- Server-driven attempt timing and policy violation handling.
- Automated evaluation and advisory result generation.
- Faculty/student dashboards with analytics visualization.
- Notification workflows with read-state lifecycle support.

### 6.2 Significant project outcomes

Major outcomes achieved:

- Reduced faculty effort for quiz creation and first-pass evaluation.
- Faster student feedback cycles and stronger post-quiz guidance.
- Better visibility into class/quiz performance trends.
- Improved assessment integrity via attempt policy controls.
- Demonstrated feasibility of modular AI integration in educational systems.

### 6.3 Project applicability on Real-world applications

Potential real-world applicability:

- College internal assessment pipelines.
- Department-level practice and formative assessment.
- Coaching institutes and competitive exam preparation groups.
- Blended-learning environments requiring continuous evaluation.

Adoption benefits:

- Operational efficiency for academic staff.
- Data-informed intervention opportunities.
- Better learner engagement through timely advisory feedback.

### 6.4 Inference

QuizMitra demonstrates that an AI-assisted assessment platform can remain practical, explainable, and institution-ready when coupled with strict role boundaries, policy-aware attempt handling, and dashboard-driven feedback loops.

---

## CHAPTER-7: CONCLUSIONS AND RECOMMENDATION

### 7.1 Outline

This chapter concludes the current project stage, highlights system constraints, and proposes strategic enhancement directions.

### 7.2 Limitation/Constraints of the System

Current limitations include:

- AI output quality may vary with topic specificity and source quality.
- Subjective evaluation consistency still requires periodic calibration and review.
- Anti-cheat controls are practical but not equivalent to full proctoring systems.
- Advanced governance features (for example, prompt leakage hardening and richer tracing) are still evolving.
- Production-scale benchmarking and cost optimization need deeper long-horizon measurement.

### 7.3 Future Enhancements

Recommended next enhancements:

- BYOK architecture as a major future update:
    - Faculty API key management with encrypted secure storage.
    - Per-key usage tracking and governance dashboards.
    - Fallback model routing and policy controls for reliability.
- Prompt leakage security hardening and comprehensive rate limiting policies.
- Expanded tracing and observability integrations, focused on user-visible LangSmith traces for BYOK users with proper access controls.
- CR permission settings and class-level access policy refinement.
- Question Bank feature for storing, curating, and reusing generated questions across quizzes.
- Quiz Retake workflows with faculty-configurable retake windows and attempt policies.
- Rephrase Question feature to generate alternate versions of existing questions.
- Multi-PDF quiz generation with configurable question distribution across uploaded resources.
- Richer personalization in advisory pipelines for each student profile and attempt history.
- Advanced analytics and predictive learning-risk indicators for early intervention.

### 7.4 Inference

The project has successfully established a robust, extensible foundation for AI-powered assessment in education. With incremental hardening in security, observability, and personalization, QuizMitra can evolve from a strong prototype into a production-grade academic intelligence platform.

---

## References (Project Artifacts)

- Feature Roadmap and Todo tracking.
- Product Requirements Document (PRD).
- Design System documentation.
- Technical Architecture and Implementation documentation.
