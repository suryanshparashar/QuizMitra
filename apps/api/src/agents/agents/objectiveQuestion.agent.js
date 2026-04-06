import { createDevLogger } from "../../utils/devLogger.js"
import { runQuestionGenerationAgent } from "./utils/generationAgentRunner.js"
import { getObjectiveSystemPrompt } from "./config/systemPrompts.js"
import { objectiveQuestionParser } from "./config/generationSchemas.js"

const devLog = createDevLogger("agent.objective-question")

export const objectiveQuestionAgent = async (state) => {
    return runQuestionGenerationAgent({
        state,
        parser: objectiveQuestionParser,
        systemPrompt: getObjectiveSystemPrompt(),
        kind: "objective",
        responseKey: "objectiveDraftQuestions",
        devLog,
        agentLabel: "Objective question agent",
    })
}
