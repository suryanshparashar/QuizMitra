// apps/api/src/agents/nodes/question.node.js
import { createModel } from "../utils/modelFactory.js";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

export const questionNode = async (state) => {
  const { sourceContent, requirements, input } = state;
  const model = createModel({ apiKey: input.apiKey });

  // Define the output schema for just the stems and correct answers
  const parser = StructuredOutputParser.fromZodSchema(
    z.array(
      z.object({
        questionText: z.string().describe("The question stem"),
        correctAnswer: z.string().describe("The correct answer text"),
        topic: z.string().describe("Topic derived from content"),
        difficulty: z.enum(["Easy", "Medium", "Hard"]).describe("Difficulty level"),
      })
    )
  );

  const prompt = PromptTemplate.fromTemplate(`
    Analyze the provided content and generate {numQuestions} high-quality quiz questions.
    
    REQUIREMENTS:
    - Difficulty: {difficulty}
    - Topics: {topics}
    - Focus on explicit facts found in the text.
    
    CONTENT:
    {content}
    
    OUTPUT FORMAT:
    {format_instructions}
  `);

  try {
    const formattedPrompt = await prompt.format({
      numQuestions: requirements.numQuestions,
      difficulty: requirements.difficultyLevel,
      topics: requirements.topics.join(", "),
      content: sourceContent.slice(0, 30000), // Token limit safety
      format_instructions: parser.getFormatInstructions(),
    });

    const response = await model.invoke(formattedPrompt);
    const questions = await parser.parse(response.content);

    return { draftQuestions: questions };
  } catch (error) {
    console.error("Question generation error:", error);
    return {
        errors: [`Failed to generate questions: ${error.message}`]
    };
  }
};
