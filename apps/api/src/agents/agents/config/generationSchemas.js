import { z } from "zod"
import { StructuredOutputParser } from "@langchain/core/output_parsers"

export const objectiveQuestionParser = StructuredOutputParser.fromZodSchema(
    z.array(
        z.object({
            questionText: z.string(),
            correctAnswer: z.string(),
            topic: z.string(),
            difficulty: z.enum(["Easy", "Medium", "Hard"]),
            questionType: z.enum([
                "multiple-choice",
                "multiple-select",
                "true-false",
            ]),
        })
    )
)

export const subjectiveQuestionParser = StructuredOutputParser.fromZodSchema(
    z.array(
        z.object({
            questionText: z.string(),
            correctAnswer: z.string(),
            topic: z.string(),
            difficulty: z.enum(["Easy", "Medium", "Hard"]),
            questionType: z.enum(["short-answer", "long-answer"]),
        })
    )
)
