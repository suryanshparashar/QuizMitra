import { createDevLogger } from "../../utils/devLogger.js"
import { contentAgent } from "./content.agent.js"
import { objectiveQuestionAgent } from "./objectiveQuestion.agent.js"
import { subjectiveQuestionAgent } from "./subjectiveQuestion.agent.js"
import { mergeQuestionsAgent } from "./mergeQuestions.agent.js"
import { optionsAgent } from "./options.agent.js"
import { reviewAgent } from "./review.agent.js"
import { formattingAgent } from "./formatting.agent.js"

const devLog = createDevLogger("agent.orchestrator")

const isSubjectiveType = (questionType) => {
    const type = String(questionType || "")
        .trim()
        .toLowerCase()
    return type === "short-answer" || type === "long-answer"
}

const hasMissingObjectiveOptions = (questions = []) => {
    return (Array.isArray(questions) ? questions : []).some((question) => {
        if (isSubjectiveType(question?.questionType)) {
            return false
        }

        const options = Array.isArray(question?.options) ? question.options : []
        return options.length < 2
    })
}

export const orchestratorAgent = async (state) => {
    const pipelineRunId = state?.input?.pipelineRunId || "unknown"

    const runStep = async (label, fn, currentState) => {
        devLog.info(`Running ${label}`, {
            pipelineRunId,
            status: currentState?.status,
        })

        try {
            const result = await fn(currentState)
            const nextState = { ...currentState, ...(result || {}) }

            if (nextState?.status === "failed") {
                devLog.warn(`${label} failed`, {
                    pipelineRunId,
                    errors: nextState?.errors || [],
                })
            }

            return nextState
        } catch (error) {
            const message = `${label} failed: ${error?.message || "Unknown error"}`
            devLog.error(message, {
                pipelineRunId,
                stack: error?.stack,
            })

            return {
                ...currentState,
                status: "failed",
                errors: [...(currentState?.errors || []), message],
            }
        }
    }

    if (state?.status === "failed") {
        devLog.warn("Orchestrator ending graph due to failure status", {
            pipelineRunId,
            errors: state?.errors || [],
        })
        return state
    }

    if (state?.status === "completed") {
        return state
    }

    let workingState = { ...state }

    if (!workingState?.sourceContent) {
        workingState = await runStep("content", contentAgent, workingState)
        if (workingState?.status === "failed") return workingState
    }

    workingState = await runStep(
        "generateObjectiveQuestions",
        objectiveQuestionAgent,
        workingState
    )
    if (workingState?.status === "failed") return workingState

    workingState = await runStep(
        "generateSubjectiveQuestions",
        subjectiveQuestionAgent,
        workingState
    )
    if (workingState?.status === "failed") return workingState

    workingState = await runStep(
        "mergeGeneratedQuestions",
        mergeQuestionsAgent,
        workingState
    )
    if (workingState?.status === "failed") return workingState

    if (hasMissingObjectiveOptions(workingState?.draftQuestions)) {
        workingState = await runStep(
            "generateOptions",
            optionsAgent,
            workingState
        )
        if (workingState?.status === "failed") return workingState
    }

    workingState = await runStep("review", reviewAgent, workingState)
    if (workingState?.status === "failed") return workingState

    if (
        workingState?.status !== "completed" &&
        Array.isArray(workingState?.verifiedQuestions) &&
        workingState.verifiedQuestions.length > 0
    ) {
        workingState = await runStep(
            "formatting",
            formattingAgent,
            workingState
        )
    }

    return workingState
}
