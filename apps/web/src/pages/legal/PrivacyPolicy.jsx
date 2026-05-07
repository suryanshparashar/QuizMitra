import { Link } from "react-router-dom"
import { ShieldCheck, Database, Brain, Lock, UserCheck } from "lucide-react"

const EFFECTIVE_DATE = "April 10, 2026"
const PRIVACY_CONTACT_EMAIL = "sparashar2002@zohomail.in"
const QUIZ_RECORD_RETENTION_YEARS = 2

const summaryPoints = [
    "We collect only the data needed to run classes, quizzes, grading, and progress insights.",
    "We use AI services to support quiz generation, subjective evaluation, and learning insights.",
    "We use cookies and secure tokens only for authentication and session management.",
    "You can request access, correction, or deletion-related actions through our privacy contact email.",
]

const dataCategories = [
    {
        title: "Account and Profile Data",
        points: [
            "Name, email address, role, and basic profile fields.",
            "Institution-related identifiers such as student or faculty identifiers where applicable.",
            "Authentication and account status metadata required for secure access.",
        ],
    },
    {
        title: "Learning and Assessment Data",
        points: [
            "Quiz attempts, submitted answers, scores, timing, and question-level evaluation data.",
            "Performance trend signals such as strong areas, weak areas, and improvement recommendations.",
            "Class and quiz participation records for academic tracking and reporting.",
        ],
    },
    {
        title: "Communication and Uploaded Content",
        points: [
            "Class messages, notifications, and operational communication history.",
            "Uploaded learning material and media used for classroom and platform workflows.",
            "Support and account communication content where users contact the platform.",
        ],
    },
]

const purposes = [
    "Provide authentication, account access, and role-based classroom workflows.",
    "Deliver quizzes, evaluate responses, and publish relevant feedback and insights.",
    "Generate analytics to improve learning outcomes and academic decision-making.",
    "Maintain platform security, abuse prevention, troubleshooting, and service reliability.",
    "Send required transactional communications such as verification and account notices.",
]

const processorCategories = [
    "AI processing providers",
    "Cloud storage and database infrastructure",
    "Transactional email providers",
    "Monitoring and observability tooling",
]

const rights = [
    "Request access to your personal data used in QuizMitra.",
    "Request correction of inaccurate or incomplete profile information.",
    "Request deletion or restricted processing, subject to legal or academic record requirements.",
    "Request clarification on how AI-assisted processing applies to your data.",
]

const sessionPolicyPoints = [
    "We use cookies and secure tokens for authentication and session management.",
    "We do not use third-party advertising cookies.",
    "Session controls are used to protect account access and maintain secure sign-in continuity.",
]

const retentionPolicyPoints = [
    "Active account data is retained for the duration of the applicable institutional contract or active enrollment period.",
    "Deleted account data is purged within 90 days of a verified deletion request, unless retention is required by law.",
    `Quiz attempt and academic assessment records are retained for ${QUIZ_RECORD_RETENTION_YEARS} years for academic record purposes.`,
]

const grievanceOfficer = {
    name: "Suryansh Parashar",
    designation: "Platform Owner, QuizMitra",
    email: PRIVACY_CONTACT_EMAIL,
    responseTime: "Within 72 hours",
}

const dataLocationStatement =
    "Data is stored on servers located in India and/or the United States. Cross-border transfers, if any, are governed by standard contractual clauses and equivalent contractual safeguards."

function Section({ icon: Icon, title, children }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {title}
                </h2>
            </div>
            <div className="text-slate-700 leading-relaxed space-y-3">
                {children}
            </div>
        </section>
    )
}

export default function PrivacyPolicy() {
    return (
        <div className="qm-page min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
            <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-slate-900 font-semibold"
                    >
                        <img
                            src="/logo.png"
                            alt="QuizMitra"
                            className="w-7 h-7 rounded"
                        />
                        QuizMitra
                    </Link>
                    <Link
                        to="/"
                        className="text-sm font-medium text-blue-700 hover:text-blue-800"
                    >
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full mb-4">
                        Privacy Policy
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                        QuizMitra Privacy Policy
                    </h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Effective date: {EFFECTIVE_DATE}
                    </p>
                    <p className="text-slate-700 leading-relaxed mb-4">
                        This Privacy Policy explains how QuizMitra collects,
                        uses, stores, and protects personal data for students,
                        faculty, and administrators using the platform. This
                        policy is currently designed for India-focused
                        educational use, while incorporating GDPR-aligned data
                        rights language for transparency.
                    </p>
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
                        <p className="font-semibold text-slate-900 mb-2">
                            Plain-language summary
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
                            {summaryPoints.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                    </div>
                </section>

                <Section icon={Database} title="1. Data We Collect">
                    {dataCategories.map((category) => (
                        <div key={category.title}>
                            <h3 className="font-semibold text-slate-900 mb-1.5">
                                {category.title}
                            </h3>
                            <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                                {category.points.map((point) => (
                                    <li key={point}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </Section>

                <Section icon={UserCheck} title="2. How We Use Data">
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        {purposes.map((purpose) => (
                            <li key={purpose}>{purpose}</li>
                        ))}
                    </ul>
                </Section>

                <Section icon={Brain} title="3. AI-Assisted Processing">
                    <p>
                        QuizMitra uses AI-assisted workflows for selected
                        educational functions, including question generation,
                        subjective answer evaluation, and performance insight
                        generation.
                    </p>
                    <p>
                        We design these workflows to support academic outcomes,
                        not to make autonomous high-impact decisions without
                        human oversight in instructional contexts.
                    </p>
                </Section>

                <Section
                    icon={ShieldCheck}
                    title="4. Sharing and Service Providers"
                >
                    <p>
                        QuizMitra does not sell personal data. We may process
                        data through trusted service categories that help us run
                        platform operations.
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        {processorCategories.map((category) => (
                            <li key={category}>{category}</li>
                        ))}
                    </ul>
                    <p>
                        Data access by these services is limited to operational
                        needs such as assessment processing, content delivery,
                        email communication, and service reliability.
                    </p>
                </Section>

                <Section icon={Lock} title="5. Security">
                    <p>
                        We apply technical and organizational controls to
                        protect user data, including authentication controls,
                        role-based authorization, and secure infrastructure
                        practices.
                    </p>
                </Section>

                <Section icon={Lock} title="6. Cookies and Session Management">
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        {sessionPolicyPoints.map((point) => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>
                </Section>

                <Section icon={Database} title="7. Data Retention">
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        {retentionPolicyPoints.map((point) => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>
                </Section>

                <Section
                    icon={ShieldCheck}
                    title="8. Data Location and Cross-Border Transfers"
                >
                    <p>{dataLocationStatement}</p>
                </Section>

                <Section icon={UserCheck} title="9. Your Rights and Choices">
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        {rights.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                    <p>
                        Some rights are currently request-based and may require
                        identity verification and institutional coordination.
                    </p>
                    <p>
                        Submit privacy requests by email:{" "}
                        <a
                            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                            className="text-blue-700 hover:text-blue-800 underline"
                        >
                            {PRIVACY_CONTACT_EMAIL}
                        </a>
                    </p>
                </Section>

                <Section
                    icon={ShieldCheck}
                    title="10. Grievance Officer (India)"
                >
                    <p>
                        For grievances under applicable India data-protection
                        and IT-law frameworks, contact:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        <li>Grievance Officer: {grievanceOfficer.name}</li>
                        <li>
                            Designation:{" "}
                            {grievanceOfficer.designation}
                        </li>
                        <li>
                            Email:{" "}
                            <a
                                href={`mailto:${grievanceOfficer.email}`}
                                className="text-blue-700 hover:text-blue-800 underline"
                            >
                                {grievanceOfficer.email}
                            </a>
                        </li>
                        <li>
                            Response time target:{" "}
                            {grievanceOfficer.responseTime}
                        </li>
                    </ul>
                </Section>

                <Section
                    icon={ShieldCheck}
                    title="11. Minors, Policy Updates, and Contact"
                >
                    <p>
                        QuizMitra is intended for educational institutions and
                        supervised classroom contexts. If institutional policy
                        requires guardian or school-level coordination for
                        student data rights, we will align request handling with
                        those requirements.
                    </p>
                    <p>
                        We may update this Privacy Policy as the product
                        evolves. Material changes will be reflected by updating
                        the effective date and publishing the revised text here.
                    </p>
                    <p>
                        For privacy questions, corrections, or data-related
                        concerns, please email{" "}
                        <a
                            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                            className="text-blue-700 hover:text-blue-800 underline"
                        >
                            {PRIVACY_CONTACT_EMAIL}
                        </a>
                        .
                    </p>
                </Section>
            </main>
        </div>
    )
}
