import { createDevLogger } from "../../utils/devLogger.js"
import { runQuestionGenerationAgent } from "./utils/generationAgentRunner.js"
import { getSubjectiveSystemPrompt } from "./config/systemPrompts.js"
import { subjectiveQuestionParser } from "./config/generationSchemas.js"

const devLog = createDevLogger("agent.subjective-question")

export const subjectiveQuestionAgent = async (state) => {
    return runQuestionGenerationAgent({
        state,
        parser: subjectiveQuestionParser,
        systemPrompt: getSubjectiveSystemPrompt(),
        kind: "subjective",
        responseKey: "subjectiveDraftQuestions",
        devLog,
        agentLabel: "Subjective question agent",
    })
}
