import { AnswerCheckingAgent } from "./answerCheckingAgents.service.js"

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
        return AnswerCheckingAgent.evaluate(question, studentAnswer, maxMarks)
    },
}
