import { Link } from "react-router-dom"
import {
    FileText,
    UserCheck,
    Brain,
    Copyright,
    Ban,
    AlertTriangle,
    Lock,
    ShieldCheck,
} from "lucide-react"

const EFFECTIVE_DATE = "April 10, 2026"
const LEGAL_CONTACT_EMAIL = "sparashar2002@zohomail.in"
const LIABILITY_CAP_INR = "1,000"
const GRIEVANCE_RESPONSE_TARGET = "Within 72 hours"

const summaryPoints = [
    "QuizMitra is currently provided as a beta educational platform.",
    "You must use the platform only for lawful academic purposes.",
    "AI-assisted outputs support academic workflows but may require faculty or institutional review.",
    "We use a grievance-first support model for resolving service and legal concerns.",
]

const acceptableUsePoints = [
    "Use the platform only for legitimate academic and institutional purposes.",
    "Do not reverse engineer, scrape, probe, or exploit platform vulnerabilities.",
    "Do not upload unlawful, infringing, harmful, or abusive content.",
    "Do not attempt impersonation, unauthorized account access, or multi-account misuse.",
    "Do not use automation or tooling that disrupts platform reliability or fairness.",
]

const aiNoticePoints = [
    "QuizMitra uses AI-assisted workflows for quiz generation, subjective evaluation, and performance insight support.",
    "AI-assisted outputs are intended to support instructional and academic decision-making, not replace institutional authority.",
    "Users are responsible for reviewing and validating educational content before high-stakes use.",
]

const limitationPoints = [
    'To the maximum extent permitted by applicable law, QuizMitra is provided on an "as is" and "as available" basis without warranties of uninterrupted operation.',
    "QuizMitra disclaims implied warranties including merchantability, fitness for a particular purpose, and non-infringement.",
    "QuizMitra will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages.",
    `Total aggregate liability, where legally enforceable, is limited to the greater of fees paid by the user in the 12 months preceding the claim or INR ${LIABILITY_CAP_INR}.`,
]

const indemnityPoints = [
    "Users agree to indemnify and hold QuizMitra harmless from claims arising out of misuse of the platform.",
    "This includes claims related to unlawful uploads, intellectual-property infringement, policy violations, or unauthorized access attempts.",
    "Institutions remain responsible for ensuring lawful and policy-compliant use by their authorized members.",
]

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

export default function TermsOfService() {
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
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <Link
                            to="/privacy"
                            className="text-blue-700 hover:text-blue-800"
                        >
                            Privacy
                        </Link>
                        <Link
                            to="/"
                            className="text-blue-700 hover:text-blue-800"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full mb-4">
                        Terms of Service
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                        QuizMitra Terms of Service
                    </h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Effective date: {EFFECTIVE_DATE}
                    </p>
                    <p className="text-slate-700 leading-relaxed mb-4">
                        These Terms of Service govern access to and use of
                        QuizMitra. By using the platform, you agree to these
                        terms. If you do not agree, you must discontinue use of
                        the service.
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

                <Section icon={UserCheck} title="1. Eligibility and Accounts">
                    <p>
                        QuizMitra is intended for institutional educational use,
                        including students, faculty, administrators, and
                        authorized reviewers.
                    </p>
                    <p>
                        You are responsible for maintaining the confidentiality
                        of your account credentials and for all activities
                        occurring under your account.
                    </p>
                </Section>

                <Section
                    icon={Ban}
                    title="2. Acceptable Use and Prohibited Conduct"
                >
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        {acceptableUsePoints.map((point) => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>
                </Section>

                <Section icon={Brain} title="3. AI-Assisted Platform Notice">
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        {aiNoticePoints.map((point) => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>
                </Section>

                <Section
                    icon={Copyright}
                    title="4. User Content and Intellectual Property"
                >
                    <p>
                        Users retain rights in content they upload, submit, or
                        create through QuizMitra. By using the service, users
                        grant QuizMitra a limited license to store, process,
                        display, and transmit such content solely for operating
                        and improving platform functionality.
                    </p>
                    <p>
                        QuizMitra platform code, branding, design, and service
                        materials remain protected intellectual property of the
                        platform owner unless explicitly stated otherwise.
                    </p>
                </Section>

                <Section
                    icon={Lock}
                    title="5. Suspension, Restriction, and Termination"
                >
                    <p>
                        QuizMitra may suspend, restrict, or terminate access for
                        policy violations, security risks, suspected abuse,
                        repeated misconduct, or legal compliance reasons.
                    </p>
                    <p>
                        Where feasible, users may contact support for
                        clarification or remediation through the grievance
                        channel.
                    </p>
                </Section>

                <Section icon={FileText} title="6. Beta Service and Fees">
                    <p>
                        QuizMitra is currently offered in beta. Features may
                        change, be limited, or be discontinued without prior
                        notice.
                    </p>
                    <p>
                        The beta service is currently free to use for approved
                        educational participants. Paid features or plans may be
                        introduced in future versions with updated notice.
                    </p>
                </Section>

                <Section
                    icon={AlertTriangle}
                    title="7. Disclaimer and Limitation of Liability"
                >
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        {limitationPoints.map((point) => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>
                </Section>

                <Section icon={ShieldCheck} title="8. Indemnification">
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
                        {indemnityPoints.map((point) => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>
                </Section>

                <Section
                    icon={ShieldCheck}
                    title="9. Support and Grievance Resolution"
                >
                    <p>
                        QuizMitra follows a grievance-first resolution approach.
                        Users should first submit concerns through the contact
                        channel below to allow review and resolution.
                    </p>
                    <p>
                        Grievance contact email:{" "}
                        <a
                            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                            className="text-blue-700 hover:text-blue-800 underline"
                        >
                            {LEGAL_CONTACT_EMAIL}
                        </a>
                    </p>
                    <p>Response time target: {GRIEVANCE_RESPONSE_TARGET}</p>
                </Section>

                <Section
                    icon={FileText}
                    title="10. Governing Framework and Updates"
                >
                    <p>
                        These terms are designed for India-focused educational
                        operations and should be interpreted in accordance with
                        applicable Indian legal and regulatory frameworks.
                    </p>
                    <p>
                        QuizMitra may update these Terms of Service as product
                        capabilities, legal requirements, or institutional
                        expectations evolve. Continued use after updates
                        constitutes acceptance of the revised terms.
                    </p>
                </Section>

                <Section icon={ShieldCheck} title="11. Contact">
                    <p>
                        For legal, terms, or grievance-related concerns,
                        contact:{" "}
                        <a
                            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                            className="text-blue-700 hover:text-blue-800 underline"
                        >
                            {LEGAL_CONTACT_EMAIL}
                        </a>
                        .
                    </p>
                </Section>
            </main>
        </div>
    )
}
