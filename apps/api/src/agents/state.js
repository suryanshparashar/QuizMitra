// apps/api/src/agents/state.js
import { Annotation } from "@langchain/langgraph";

export const QuizState = Annotation.Root({
  // Input: The raw input provided by the user
  input: Annotation(), // { type: 'pdf' | 'topic', data: Buffer | string, originalName?: string }

  // Requirements: Validated requirements object
  requirements: Annotation(), // { numQuestions, difficultyLevel, etc. }

  // Context: Extracted or searched content
  sourceContent: Annotation(), // string

  // Generated Content: Intermediate and final questions
  draftQuestions: Annotation(), // Array of partial questions
  verifiedQuestions: Annotation(), // Array of complete, verified questions

  // Status: Tracking progress and errors
  status: Annotation(), // 'generating' | 'reviewing' | 'completed' | 'failed'
  errors: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});
