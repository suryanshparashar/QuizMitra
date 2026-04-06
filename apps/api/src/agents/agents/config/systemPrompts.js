import { getPrompt, PROMPT_KEYS } from "../../../utils/promptStore.js"

export const getObjectiveSystemPrompt = () => {
    return getPrompt(PROMPT_KEYS.OBJECTIVE_QUESTION_SYSTEM)
}

export const getSubjectiveSystemPrompt = () => {
    return getPrompt(PROMPT_KEYS.SUBJECTIVE_QUESTION_SYSTEM)
}
