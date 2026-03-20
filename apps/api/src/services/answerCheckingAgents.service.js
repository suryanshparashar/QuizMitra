import { createChatModel } from "../utils/llmClient.js"
import { createDevLogger } from "../utils/devLogger.js"

const devLog = createDevLogger("answer-check.agent")

const getEvaluationModel = () => {
    return createChatModel({
        purpose: "evaluation",
        maxOutputTokens: 1024,
        temperature: 0.1,
    })
}

const normalizeString = (value) => String(value || "").trim()

const clampNumber = (value, min, max) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return min
    return Math.min(max, Math.max(min, numeric))
}

const roundTo2 = (value) => Number(Number(value || 0).toFixed(2))

const normalizeCorrectnessScore = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return 0

    // Accept [0,1] or [0,100].
    if (numeric > 1) {
        return clampNumber(numeric / 100, 0, 1)
    }

    return clampNumber(numeric, 0, 1)
}

const parseJsonObjectFromText = (rawText) => {
    const cleaned = String(rawText || "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()

    try {
        return JSON.parse(cleaned)
    } catch {
        const objectMatch = cleaned.match(/\{[\s\S]*\}/)
        if (!objectMatch) {
            throw new Error("No JSON object found in model response")
        }
        return JSON.parse(objectMatch[0])
    }
}

const tokenize = (value) => {
    return normalizeString(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 4)
}

const fallbackSubjectiveEvaluation = (question, givenAnswer, maxMarks) => {
    const rubricText = normalizeString(
        question?.correctAnswer ||
            question?.explanation ||
            "Evaluate relevance, correctness, and completeness."
    )

    const rubricTokens = tokenize(rubricText)
    const answerTokens = tokenize(givenAnswer)

    const rubricSet = new Set(rubricTokens)
    const answerSet = new Set(answerTokens)

    let overlap = 0
    for (const token of answerSet) {
        if (rubricSet.has(token)) {
            overlap += 1
        }
    }

    const coverage = rubricSet.size > 0 ? overlap / rubricSet.size : 0

    let scoreRatio = coverage
    if (coverage >= 0.75) scoreRatio = 1
    else if (coverage >= 0.5) scoreRatio = 0.75
    else if (coverage >= 0.3) scoreRatio = 0.5
    else if (answerSet.size >= 8) scoreRatio = 0.25
    else scoreRatio = 0

    const marksAwarded = Number((maxMarks * scoreRatio).toFixed(2))
    const isCorrect = scoreRatio >= 0.5

    const feedback =
        scoreRatio >= 0.75
            ? "Strong answer covering most required rubric points."
            : scoreRatio >= 0.5
              ? "Partially correct answer; some rubric points are missing."
              : scoreRatio > 0
                ? "Answer shows limited alignment with the expected rubric."
                : "Answer does not sufficiently match the expected rubric."

    return {
        marksAwarded,
        correctnessScore: roundTo2(scoreRatio),
        isCorrect,
        feedback,
        checkedByAgent: "subjective",
        manuallyGraded: false,
        gradingNotes: `Fallback rubric overlap score: ${coverage.toFixed(2)}`,
    }
}

const parseMultiSelectAnswer = (givenAnswer) => {
    if (Array.isArray(givenAnswer)) {
        return givenAnswer
            .map((entry) => normalizeString(entry))
            .filter(Boolean)
    }

    if (typeof givenAnswer !== "string") {
        return [normalizeString(givenAnswer)].filter(Boolean)
    }

    const raw = givenAnswer.trim()
    if (!raw) return []

    try {
        if (raw.startsWith("[")) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
                return parsed
                    .map((entry) => normalizeString(entry))
                    .filter(Boolean)
            }
        }
    } catch {
        // fallback below
    }

    if (raw.includes(",")) {
        return raw
            .split(",")
            .map((entry) => normalizeString(entry))
            .filter(Boolean)
    }

    return [normalizeString(raw)].filter(Boolean)
}

export const ObjectiveCheckingAgent = {
    evaluate(question, studentAnswer, maxMarks) {
        const questionType = String(question?.questionType || "multiple-choice")
            .trim()
            .toLowerCase()

        const givenAnswer = studentAnswer?.selectedAnswer

        if (questionType === "multiple-select") {
            const userSelected = parseMultiSelectAnswer(givenAnswer).sort()
            const correctSelected = (
                Array.isArray(question?.correctOptions)
                    ? question.correctOptions
                    : []
            )
                .map((entry) => normalizeString(entry))
                .filter(Boolean)
                .sort()

            if (userSelected.length !== correctSelected.length) {
                return {
                    marksAwarded: 0,
                    correctnessScore: 0,
                    isCorrect: false,
                    feedback: "Incorrect options selected.",
                    checkedByAgent: "objective",
                }
            }

            const isCorrect = userSelected.every(
                (entry, index) => entry === correctSelected[index]
            )

            return {
                marksAwarded: isCorrect ? maxMarks : 0,
                correctnessScore: isCorrect ? 1 : 0,
                isCorrect,
                feedback: isCorrect
                    ? "Correct options selected"
                    : "Incorrect options selected.",
                checkedByAgent: "objective",
            }
        }

        if (questionType === "fill-in-blank") {
            const normalizedGiven = normalizeString(givenAnswer).toLowerCase()
            const normalizedCorrect = normalizeString(
                question?.correctAnswer
            ).toLowerCase()
            const isCorrect = normalizedGiven === normalizedCorrect

            return {
                marksAwarded: isCorrect ? maxMarks : 0,
                correctnessScore: isCorrect ? 1 : 0,
                isCorrect,
                feedback: isCorrect
                    ? "Correct"
                    : `Incorrect. Expected: ${question?.correctAnswer || "N/A"}`,
                checkedByAgent: "objective",
            }
        }

        if (questionType === "true-false") {
            const normalizedGiven =
                normalizeString(givenAnswer).toLowerCase() === "true"
                    ? "true"
                    : "false"
            const normalizedCorrect =
                normalizeString(question?.correctAnswer).toLowerCase() ===
                "true"
                    ? "true"
                    : "false"

            const isCorrect = normalizedGiven === normalizedCorrect

            return {
                marksAwarded: isCorrect ? maxMarks : 0,
                correctnessScore: isCorrect ? 1 : 0,
                isCorrect,
                feedback: isCorrect ? "Correct" : "Incorrect",
                checkedByAgent: "objective",
            }
        }

        // Default: multiple-choice and other objective single-answer types.
        const isCorrect =
            normalizeString(givenAnswer) ===
            normalizeString(question?.correctAnswer)

        return {
            marksAwarded: isCorrect ? maxMarks : 0,
            correctnessScore: isCorrect ? 1 : 0,
            isCorrect,
            feedback: isCorrect ? "Correct" : "Incorrect",
            checkedByAgent: "objective",
        }
    },
}

export const SubjectiveCheckingAgent = {
    async evaluate(question, studentAnswer, maxMarks) {
        const givenAnswer = normalizeString(studentAnswer?.selectedAnswer)

        if (!givenAnswer) {
            return {
                marksAwarded: 0,
                correctnessScore: 0,
                isCorrect: false,
                feedback: "No answer provided.",
                checkedByAgent: "subjective",
                manuallyGraded: false,
            }
        }

        try {
            const prompt = `
You are the Subjective Answer Checking Agent for QuizMitra.
Evaluate the student's answer strictly against the rubric/model answer.

Question: "${question?.questionText || ""}"
Question Type: "${question?.questionType || "short-answer"}"
Max Marks: ${maxMarks}
Model Answer / Rubric: "${question?.correctAnswer || question?.explanation || "Evaluate relevance, correctness, and completeness."}"
Student Answer: "${givenAnswer}"

Return ONLY valid JSON:
{
    "correctnessScore": number,
  "feedback": "string",
  "isCorrect": boolean
}
Rules:
- correctnessScore must be between 0 and 1, where 0.2 means 20% correctness
- if you compute percentage, convert to fraction before returning (e.g., 20% -> 0.2)
- feedback must be concise and constructive
- isCorrect can be true only if answer meets core rubric expectations
- do not include markdown, backticks, commentary, or chain-of-thought
`.trim()

            const response = await getEvaluationModel().invoke(prompt)
            const parsed = parseJsonObjectFromText(response?.content)

            const correctnessScore = normalizeCorrectnessScore(
                parsed?.correctnessScore ?? parsed?.score ?? parsed?.percentage
            )
            const boundedScore = roundTo2(maxMarks * correctnessScore)

            return {
                marksAwarded: boundedScore,
                correctnessScore,
                isCorrect:
                    typeof parsed?.isCorrect === "boolean"
                        ? parsed.isCorrect
                        : correctnessScore >= 0.5,
                feedback:
                    normalizeString(parsed?.feedback) ||
                    "Evaluated by subjective checking agent.",
                checkedByAgent: "subjective",
                manuallyGraded: false,
            }
        } catch (error) {
            devLog.warn("Subjective model parsing failed, using fallback", {
                message: error?.message,
                questionType: question?.questionType,
            })

            return fallbackSubjectiveEvaluation(question, givenAnswer, maxMarks)
        }
    },
}

export const AnswerCheckingAgent = {
    async evaluate(question, studentAnswer, maxMarks) {
        const questionType = String(question?.questionType || "multiple-choice")
            .trim()
            .toLowerCase()

        if (questionType === "short-answer" || questionType === "long-answer") {
            const result = await SubjectiveCheckingAgent.evaluate(
                question,
                studentAnswer,
                maxMarks
            )

            devLog.info("Subjective answer evaluated", {
                questionType,
                maxMarks,
                marksAwarded: result.marksAwarded,
                checkedByAgent: result.checkedByAgent,
            })

            return result
        }

        const result = ObjectiveCheckingAgent.evaluate(
            question,
            studentAnswer,
            maxMarks
        )

        devLog.info("Objective answer evaluated", {
            questionType,
            maxMarks,
            marksAwarded: result.marksAwarded,
            checkedByAgent: result.checkedByAgent,
        })

        return result
    },
}
