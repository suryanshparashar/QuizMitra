import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

const model = new ChatGoogleGenerativeAI({
    model: process.env.GOOGLE_LLM_ADVANCED_MODEL,
    temperature: 0.7,
    maxOutputTokens: 2048,
    apiKey: process.env.GEMINI_API_KEY,
})

export const AdvisoryService = {
    /**
     * Generates a personalized advisory report based on quiz performance.
     * @param {Object} quiz - The quiz object
     * @param {Object} attempt - The quiz attempt object with answers
     * @param {Object} student - The student user object
     * @returns {Promise<Object>} - The advisory report { strengths, weaknesses, recommendations, motivationalMessage }
     */
    generateAdvisoryReport: async (quiz, attempt, student) => {
        try {
            // 1. Prepare Data Context
            const incorrectAnswers = attempt.answers
                .filter((a) => !a.isCorrect)
                .map((a) => ({
                    question: a.questionText,
                    studentAnswer: a.selectedAnswer,
                    correctAnswer: a.correctAnswer,
                    type: "Incorrect",
                }))

            const correctTopics = attempt.answers
                .filter((a) => a.isCorrect)
                .map((a) => ({
                    question: a.questionText,
                    type: "Correct",
                }))

            const performanceSummary = `
                Student Name: ${student.fullName}
                Quiz Title: ${quiz.title}
                Score: ${attempt.marksObtained} / ${attempt.maxMarks}
                Percentage: ${attempt.percentage}%
                Total Questions: ${attempt.totalQuestions}
                Correct: ${attempt.correctAnswers}
                Incorrect: ${attempt.incorrectAnswers}
            `

            // 2. Construct Prompt
            const prompt = `
                You are an empathetic and expert academic advisor (QuizMitra). 
                Analyze the following student's quiz performance and generate a personalized advisory report.

                **Performance Summary:**
                ${performanceSummary}

                **Incorrect Answers (Analyze for weaknesses/misconceptions):**
                ${JSON.stringify(incorrectAnswers, null, 2)}

                **Correct Answers (Analyze for strengths):**
                ${JSON.stringify(correctTopics, null, 2)}

                **Requirements:**
                1. Identify 2-3 specific Strengths based on correctly answered questions.
                2. Identify 2-3 specific Weaknesses or knowledge gaps based on incorrect answers.
                3. Provide 2-3 actionable Recommendations (study tips, topics to review).
                4. Write a short, encouraging Motivational Message (2 sentences max).

                **Output Format:**
                Return ONLY a valid JSON object with the following structure:
                {
                    "strengths": ["string", "string"],
                    "weaknesses": ["string", "string"],
                    "recommendations": ["string", "string"],
                    "motivationalMessage": "string"
                }
            `

            // 3. Call AI Model
            const result = await model.invoke([
                new SystemMessage(
                    "You are a helpful AI academic advisor. Always output valid JSON."
                ),
                new HumanMessage(prompt),
            ])

            // 4. Parse Response
            const content = result.content.replace(/```json|```/g, "").trim()
            const report = JSON.parse(content)

            return report
        } catch (error) {
            console.error("Advisory Generation Error:", error)
            // Fallback in case of error
            return {
                strengths: ["Completed the quiz attempt."],
                weaknesses: [
                    "Unable to analyze specific weaknesses at this time.",
                ],
                recommendations: [
                    "Review the quiz answers manually to identify gaps.",
                ],
                motivationalMessage: "Keep practicing and you will improve!",
            }
        }
    },
}
