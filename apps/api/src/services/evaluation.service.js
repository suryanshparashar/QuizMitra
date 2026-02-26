import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { z } from "zod"

// Initialize Gemini model for evaluation
const evaluationModel = new ChatGoogleGenerativeAI({
    model: process.env.GOOGLE_LLM_ADVANCED_MODEL,
    maxOutputTokens: 1024,
    temperature: 0.1, // Low temperature for consistent grading
    apiKey: process.env.GOOGLE_API_KEY,
})

/**
 * Service to handle quiz evaluation strategies
 */
export const EvaluationService = {
    /**
     * Evaluate a single answer based on its type
     * @param {Object} question - The question object
     * @param {Object} studentAnswer - The student's answer object
     * @param {number} maxMarks - Maximum marks for this question
     * @returns {Promise<Object>} - { marksAwarded, isCorrect, feedback }
     */
    async evaluateAnswer(question, studentAnswer, maxMarks) {
        const type = question.questionType
        const givenAnswer = studentAnswer.selectedAnswer

        switch (type) {
            case "multiple-choice":
            case "true-false":
                return this.evaluateExactMatch(question, givenAnswer, maxMarks)

            case "fill-in-blank":
                return this.evaluateFuzzyMatch(question, givenAnswer, maxMarks)

            case "multiple-select":
                return this.evaluateMultiSelect(question, givenAnswer, maxMarks)

            case "short-answer":
            case "long-answer":
                return await this.evaluateSubjective(
                    question,
                    givenAnswer,
                    maxMarks
                )

            default:
                return {
                    marksAwarded: 0,
                    isCorrect: false,
                    feedback: "Unknown question type",
                }
        }
    },

    /**
     * Exact match evaluation (Case sensitive for MCQs usually, but we can be strict)
     */
    evaluateExactMatch(question, givenAnswer, maxMarks) {
        const isCorrect = givenAnswer === question.correctAnswer
        return {
            marksAwarded: isCorrect ? maxMarks : 0,
            isCorrect,
            feedback: isCorrect ? "Correct" : "Incorrect",
        }
    },

    /**
     * Fuzzy match for fill-in-the-blank (Trimmed, Case-insensitive)
     */
    evaluateFuzzyMatch(question, givenAnswer, maxMarks) {
        if (!givenAnswer)
            return { marksAwarded: 0, isCorrect: false, feedback: "No answer" }

        const normalizedGiven = givenAnswer.trim().toLowerCase()
        const normalizedCorrect = question.correctAnswer.trim().toLowerCase()
        const isCorrect = normalizedGiven === normalizedCorrect

        return {
            marksAwarded: isCorrect ? maxMarks : 0,
            isCorrect,
            feedback: isCorrect
                ? "Correct"
                : `Incorrect. Expected: ${question.correctAnswer}`,
        }
    },

    /**
     * Multiple Select Evaluation
     * Checks if the student selected specific options.
     * Strategy: All or nothing, or partial credit?
     * For now: Full credit only if EXACT set matches.
     */
    evaluateMultiSelect(question, givenAnswer, maxMarks) {
        // givenAnswer should be an array or comma-separated string based on storage
        // Assuming array or JSON string. detailed implementation depends on frontend data format.
        // Let's assume it comes as an array of strings in `selectedAnswer` field if we change schema,
        // but schema says `selectedAnswer` is String. So frontend probably sends JSON string or comma separated.

        let userSelected = []
        try {
            // Attempt to parse if it's a JSON string
            userSelected =
                typeof givenAnswer === "string" && givenAnswer.startsWith("[")
                    ? JSON.parse(givenAnswer)
                    : [givenAnswer]
        } catch (e) {
            userSelected = [givenAnswer]
        }

        // Normalize
        const normalizedUser = userSelected.map((a) => a.trim())
        const normalizedCorrect = question.correctOptions.map((a) => a.trim())

        // Check lengths
        if (normalizedUser.length !== normalizedCorrect.length) {
            return {
                marksAwarded: 0,
                isCorrect: false,
                feedback: "Incorrect. Count of options does not match.",
            }
        }

        // Sort and compare
        normalizedUser.sort()
        normalizedCorrect.sort()

        const isCorrect = normalizedUser.every(
            (val, index) => val === normalizedCorrect[index]
        )

        return {
            marksAwarded: isCorrect ? maxMarks : 0,
            isCorrect,
            feedback: isCorrect ? "Correct" : "Incorrect options selected.",
        }
    },

    /**
     * Subjective Evaluation using AI (Gemini)
     */
    async evaluateSubjective(question, givenAnswer, maxMarks) {
        if (!givenAnswer || givenAnswer.trim().length === 0) {
            return {
                marksAwarded: 0,
                isCorrect: false,
                feedback: "No answer provided.",
            }
        }

        try {
            const prompt = `
            You are an expert academic grader. Evaluate the following student answer based on the question and the rubric/correct answer provided.
            
            Question: "${question.questionText}"
            Max Marks: ${maxMarks}
            Model Answer / Rubric: "${question.correctAnswer || question.explanation || "Evaluate based on general knowledge and relevance."}"
            
            Student Answer: "${givenAnswer}"
            
            Instructions:
            1. Assign a score between 0 and ${maxMarks} (can be decimal).
            2. Provide brief, constructive feedback explaining the score.
            3. Be strict but fair. Logic and accuracy are paramount.
            
            Output JSON only:
            {
                "score": number,
                "feedback": "string",
                "isCorrect": boolean
            }
            `

            const response = await evaluationModel.invoke(prompt)
            const content = response.content.replace(/```json|```/g, "").trim()
            const result = JSON.parse(content)

            return {
                marksAwarded: Math.min(Math.max(0, result.score), maxMarks),
                isCorrect: result.isCorrect || result.score > 0,
                feedback: result.feedback,
                manuallyGraded: false, // AI graded
            }
        } catch (error) {
            console.error("AI Evaluation Error:", error)
            // Fallback to manual grading required
            return {
                marksAwarded: 0,
                isCorrect: false,
                feedback: "AI Grading failed. Marked for manual review.",
                gradingNotes: "AI Error: " + error.message,
                manuallyGraded: true, // Needs manual review
            }
        }
    },
}
