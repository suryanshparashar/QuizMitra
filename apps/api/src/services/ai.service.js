// class AIService {
//     constructor() {
//         this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
//     }

//     async generateQuestions(imput, requirements) {
//         try {

//         } catch (error) {

//         }
//     }
// }

import { GoogleGenerativeAI } from "@google/generative-ai"
import { ApiError } from "../utils/index.js"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const generateQuestionsFromPDF = async (pdfBuffer, requirements) => {
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
        },
    })

    const pdfPart = {
        inlineData: {
            data: pdfBuffer.toString("base64"),
            mimeType: "application/pdf",
        },
    }

    const prompt = `
    Analyze the provided PDF document and generate ${requirements.numQuestions} high-quality educational questions.

    REQUIREMENTS:
    - Difficulty Level: ${requirements.difficultyLevel}
    - Question Types: ${requirements.questionTypes.join(", ")}
    - Topics to Focus: ${requirements.topics.join(", ")}
    - Marks per Question: ${requirements.marksPerQuestion}
    - Total Marks: ${requirements.totalMarks}

    IMPORTANT: Return ONLY a valid JSON array with NO additional text, explanations, or markdown formatting.

    Use this EXACT format:
    [
        {
            "questionText": "Clear, specific question based on PDF content",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "Exact text of the correct option",
            "difficulty": "${requirements.difficultyLevel}",
            "explanation": "Brief explanation of why this answer is correct",
            "topic": "Specific topic from the PDF content"
        }
    ]

    RULES:
    1. Each question must be directly related to the PDF content
    2. All options must be plausible but only one correct
    3. correctAnswer must exactly match one of the options
    4. Questions should test understanding, not just memorization
    5. Vary question difficulty within the specified level
    6. Ensure questions cover different sections of the PDF
    `

    let rawResponseText = ""
    
    try {
        const result = await model.generateContent([prompt, pdfPart])
        rawResponseText = result.response.text()

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
        console.warn(`Expected ${requirements.numQuestions} questions, but got ${questions.length}`)
    }

    return questions.map((q, index) => {
        if (!q.questionText || !q.options || !Array.isArray(q.options) || !q.correctAnswer) {
            throw new ApiError(500, `Question at index ${index} is missing required fields`)
        }

        if (q.options.length < 2) {
            throw new ApiError(500, `Question at index ${index} must have at least two options`)
        }

        if (!q.options.includes(q.correctAnswer)) {
            console.warn(`Question at index ${index} has a correctAnswer that does not match any option`)
            q.correctAnswer = q.options[0]
        }

        return {
            questionText: q.questionText.trim(),
            options: q.options.map(opt => opt.trim()),
            correctAnswer: q.correctAnswer.trim(),
            correctOptions: q.correctOptions?.map(opt => opt.trim()) || [],
            _metadata: {
                difficulty: q.difficulty || requirements.difficultyLevel,
                explanation: q.explanation?.trim() || "No explanation provided",
                topic: q.topic || "General",
                marks: requirements.marksPerQuestion,
            }
        }
    })
}

export { generateQuestionsFromPDF }
