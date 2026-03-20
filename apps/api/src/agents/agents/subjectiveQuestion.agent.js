import { createDevLogger } from "../../utils/devLogger.js"
import { runQuestionGenerationAgent } from "./utils/generationAgentRunner.js"
import { SUBJECTIVE_SYSTEM_PROMPT } from "./config/systemPrompts.js"
import { subjectiveQuestionParser } from "./config/generationSchemas.js"

const devLog = createDevLogger("agent.subjective-question")

export const subjectiveQuestionAgent = async (state) => {
    return runQuestionGenerationAgent({
        state,
        parser: subjectiveQuestionParser,
        systemPrompt: SUBJECTIVE_SYSTEM_PROMPT,
        kind: "subjective",
        responseKey: "subjectiveDraftQuestions",
        devLog,
        agentLabel: "Subjective question agent",
    })
}
