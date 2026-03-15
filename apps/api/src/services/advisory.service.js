import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { createChatModel } from "../utils/llmClient.js"

const getAdvisoryModel = () => {
    return createChatModel({
        purpose: "advisory",
        temperature: 0.7,
        maxOutputTokens: 2048,
    })
}

const extractJsonObject = (content) => {
    if (typeof content !== "string") {
        throw new Error("Advisory model did not return text content")
    }

    const cleanedContent = content
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/```json|```/gi, "")
        .trim()

    const firstBraceIndex = cleanedContent.indexOf("{")
    const lastBraceIndex = cleanedContent.lastIndexOf("}")

    if (firstBraceIndex === -1 || lastBraceIndex === -1) {
        throw new Error("No JSON object found in advisory response")
    }

    return cleanedContent.slice(firstBraceIndex, lastBraceIndex + 1)
}

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
            const quizTopics = Array.isArray(quiz.requirements?.topics)
                ? quiz.requirements.topics.filter(Boolean)
                : []

            const topicPerformance = attempt.answers.map((answer) => {
                const question = quiz.questions?.[answer.questionIndex]

                return {
                    topic:
                        question?.topic ||
                        question?.difficulty ||
                        "General understanding",
                    question: answer.questionText,
                    isCorrect: answer.isCorrect,
                    marksAwarded: answer.marksAwarded,
                    maxMarks: answer.maxMarks,
                    questionType: question?.questionType || "unknown",
                }
            })

            const weakAreas = attempt.answers
                .filter((a) => !a.isCorrect)
                .map((a) => ({
                    topic:
                        quiz.questions?.[a.questionIndex]?.topic ||
                        "General understanding",
                    question: a.questionText,
                    studentAnswer: a.selectedAnswer,
                    correctAnswer: a.correctAnswer,
                    concern: "Needs stronger conceptual preparation",
                }))

            const strongAreas = attempt.answers
                .filter((a) => a.isCorrect)
                .map((a) => ({
                    topic:
                        quiz.questions?.[a.questionIndex]?.topic ||
                        "General understanding",
                    question: a.questionText,
                    signal: "Shows good preparation",
                }))

            const performanceSummary = `
                Student Name: ${student.fullName}
                Quiz Title: ${quiz.title}
                Score: ${attempt.marksObtained} / ${attempt.maxMarks}
                Percentage: ${attempt.percentage}%
                Total Questions: ${attempt.totalQuestions}
                Correct: ${attempt.correctAnswers}
                Incorrect: ${attempt.incorrectAnswers}
                Available Quiz Topics: ${quizTopics.join(", ") || "Not explicitly tagged"}
            `

            // 2. Construct Prompt
            const prompt = `
                You are an empathetic and expert academic advisor (QuizMitra). 
                Analyze the student's overall preparation level for this quiz and generate a preparation review.
                This is NOT answer-by-answer grading feedback. Do not explain whether a specific answer was right or wrong.
                Focus on knowledge readiness, strong topics, weak topics, and how the student should improve before the next assessment.

                **Performance Summary:**
                ${performanceSummary}

                **Topic-Level Performance Signals:**
                ${JSON.stringify(topicPerformance, null, 2)}

                **Potential Strong Areas:**
                ${JSON.stringify(strongAreas, null, 2)}

                **Potential Weak Areas:**
                ${JSON.stringify(weakAreas, null, 2)}

                **Requirements:**
                1. Identify 2-3 specific Strengths in the student's preparation, preferably in terms of topics or skills.
                2. Identify 2-3 specific Weaknesses or knowledge gaps, preferably in terms of topics or concepts needing revision.
                3. Provide 2-3 actionable Recommendations focused on improving preparation for the next quiz.
                4. Write a short, encouraging Motivational Message (2 sentences max).
                5. Use preparation language such as "well prepared in", "needs revision in", "should practice", "should review".
                6. Avoid phrasing like "you got this answer wrong" or detailed answer-correction commentary.

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
            const result = await getAdvisoryModel().invoke([
                new SystemMessage(
                    "You are a helpful AI academic advisor. Always output valid JSON."
                ),
                new HumanMessage(prompt),
            ])

            // 4. Parse Response
            const rawContent = Array.isArray(result.content)
                ? result.content
                      .map((part) =>
                          typeof part === "string" ? part : part?.text || ""
                      )
                      .join("\n")
                : result.content

            const report = JSON.parse(extractJsonObject(rawContent))

            return report
        } catch (error) {
            console.error("Advisory Generation Error:", error)
            // Fallback in case of error
            return {
                strengths: [
                    "You completed the quiz and attempted the material.",
                ],
                weaknesses: [
                    "Detailed topic-wise preparation analysis is unavailable right now.",
                ],
                recommendations: [
                    "Review the quiz topic areas and revisit the concepts that felt less confident.",
                ],
                motivationalMessage:
                    "Keep building your preparation steadily; consistent revision will improve your performance.",
            }
        }
    },
}
