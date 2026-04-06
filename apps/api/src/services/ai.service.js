import pdfParse from "pdf-parse"
import { ApiError } from "../utils/index.js"
import { createChatModel } from "../utils/llmClient.js"
import {
    getPrompt,
    PROMPT_KEYS,
    renderPromptTemplate,
} from "../utils/promptStore.js"

const generateQuestionsFromPDF = async (pdfBuffer, requirements) => {
    const model = createChatModel({
        purpose: "quizGeneration",
        temperature: 0.2,
        maxOutputTokens: 8192,
        topP: 0.8,
    })
    const pdfData = await pdfParse(pdfBuffer)
    const extractedContent = pdfData.text.replace(/\n\s*\n/g, "\n").trim()

    const prompt = renderPromptTemplate(
        getPrompt(PROMPT_KEYS.PDF_QUESTION_GENERATION_TEMPLATE),
        {
            numQuestions: requirements.numQuestions,
            difficultyLevel: requirements.difficultyLevel,
            questionTypes: requirements.questionTypes.join(", "),
            topics: requirements.topics.join(", "),
            marksPerQuestion: requirements.marksPerQuestion,
            totalMarks: requirements.totalMarks,
            sourceContent: extractedContent.slice(0, 30000),
        }
    )

    let rawResponseText = ""

    try {
        const result = await model.invoke(prompt)
        rawResponseText = result.content

        const cleanedResponse = rawResponseText
            .replace(/``````/g, "")
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .replace(/^[^[]*\[/, "[")
            .replace(/\][^\]]*$/, "]")
            .trim()

        if (
            !cleanedResponse.startsWith("[") ||
            !cleanedResponse.endsWith("]")
        ) {
            throw new ApiError(500, "Response is not a valid JSON array")
        }

        const questions = JSON.parse(cleanedResponse)

        const validatedQuestions = validateAndTransformQuestions(
            questions,
            requirements
        )

        return validatedQuestions
    } catch (parseError) {
        console.error("Error parsing AI response:", parseError)
        console.error("Raw AI response:", rawResponseText)

        try {
            const jsonMatch = rawResponseText.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
                const questions = JSON.parse(jsonMatch[0])
                const validatedQuestions = validateAndTransformQuestions(
                    questions,
                    requirements
                )

                return validatedQuestions
            }
        } catch (fallbackError) {
            console.error("Fallback parsing also failed:", fallbackError)
        }

        throw new ApiError(500, "Failed to generate questions in proper format")
    }
}

const validateAndTransformQuestions = (questions, requirements) => {
    if (!Array.isArray(questions)) {
        throw new ApiError(500, "Questions is not an array")
    }

    if (questions.length !== requirements.numQuestions) {
        console.warn(
            `Expected ${requirements.numQuestions} questions, but got ${questions.length}`
        )
    }

    return questions.map((q, index) => {
        if (
            !q.questionText ||
            !q.options ||
            !Array.isArray(q.options) ||
            !q.correctAnswer
        ) {
            throw new ApiError(
                500,
                `Question at index ${index} is missing required fields`
            )
        }

        if (q.options.length < 2) {
            throw new ApiError(
                500,
                `Question at index ${index} must have at least two options`
            )
        }

        if (!q.options.includes(q.correctAnswer)) {
            console.warn(
                `Question at index ${index} has a correctAnswer that does not match any option`
            )
            q.correctAnswer = q.options[0]
        }

        return {
            questionText: q.questionText.trim(),
            options: q.options.map((opt) => opt.trim()),
            correctAnswer: q.correctAnswer.trim(),
            correctOptions: q.correctOptions?.map((opt) => opt.trim()) || [],
            _metadata: {
                difficulty: q.difficulty || requirements.difficultyLevel,
                explanation: q.explanation?.trim() || "No explanation provided",
                topic: q.topic || "General",
                marks: requirements.marksPerQuestion,
            },
        }
    })
}

export { generateQuestionsFromPDF }
