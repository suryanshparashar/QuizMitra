// apps/api/src/agents/nodes/options.node.js
import { createModel } from "../utils/modelFactory.js";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

export const optionsNode = async (state) => {
  const { draftQuestions, input } = state;
  const model = createModel({ apiKey: input.apiKey });

  const parser = StructuredOutputParser.fromZodSchema(
    z.array(z.string()).length(3).describe("Three incorrect but plausible options")
  );

  const prompt = PromptTemplate.fromTemplate(`
    For the following question, generate 3 incorrect but plausible distractors (wrong answers).
    
    Question: {question}
    Correct Answer: {correctAnswer}
    Difficulty: {difficulty}
    
    Ensure distractors are not ambiguous.
    {format_instructions}
  `);

  const updatedQuestions = [];

  // Parallel processing for speed
  const promises = draftQuestions.map(async (q) => {
    try {
      const formattedPrompt = await prompt.format({
        question: q.questionText,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
        format_instructions: parser.getFormatInstructions(),
      });

      const response = await model.invoke(formattedPrompt);
      const distractors = await parser.parse(response.content);
      
      const allOptions = [q.correctAnswer, ...distractors];
      // Simple shuffle
      const shuffled = allOptions.sort(() => Math.random() - 0.5);

      return {
        ...q,
        options: shuffled,
        correctOptions: [q.correctAnswer], // Schema compatibility
      };
    } catch (e) {
      console.error(`Failed to generate options for question: ${q.questionText}`, e);
      return null; // Will filter out later
    }
  });

  const results = await Promise.all(promises);
  return { draftQuestions: results.filter(q => q !== null) };
};
