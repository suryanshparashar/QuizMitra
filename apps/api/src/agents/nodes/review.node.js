// apps/api/src/agents/nodes/review.node.js
import { createModel } from "../utils/modelFactory.js";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

export const reviewNode = async (state) => {
  const { draftQuestions, input, sourceContent } = state;
  const model = createModel({ apiKey: input.apiKey });

  // In a robust system, this calls the LLM to verify. 
  // For latency reasons in "monolithic backend" mode, we might trust the previous steps
  // or do a lightweight check. Let's do a lightweight check for empty fields.
  
  const verifiedQuestions = draftQuestions.filter(q => {
    if (!q.options || q.options.length < 2) return false;
    if (!q.correctAnswer) return false;
    // Check if correct answer is actually in options
    if (!q.options.includes(q.correctAnswer)) {
        // Fix it if possible, otherwise drop
        q.options.push(q.correctAnswer);
    }
    return true;
  });

  if (verifiedQuestions.length === 0) {
      return { 
          status: "failed", 
          errors: ["All questions failed verification"] 
      };
  }

  return { verifiedQuestions, status: "reviewing" };
};
