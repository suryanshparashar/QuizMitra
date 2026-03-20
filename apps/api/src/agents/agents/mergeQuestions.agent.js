import { createDevLogger } from "../../utils/devLogger.js"

const devLog = createDevLogger("agent.merge-questions")

const dedupeByStem = (questions = []) => {
    const seen = new Set()
    const unique = []

    for (const q of questions) {
        const stem = String(q?.questionText || "")
            .trim()
            .toLowerCase()
        if (!stem || seen.has(stem)) continue
        seen.add(stem)
        unique.push(q)
    }

    return unique
}

export const mergeQuestionsAgent = async (state) => {
    const {
        objectiveDraftQuestions = [],
        subjectiveDraftQuestions = [],
        requirements,
        input,
    } = state
    const pipelineRunId = input?.pipelineRunId || "unknown"
    const requestedCount = Number(requirements?.numQuestions || 0)

    const merged = dedupeByStem([
        ...(Array.isArray(objectiveDraftQuestions)
            ? objectiveDraftQuestions
            : []),
        ...(Array.isArray(subjectiveDraftQuestions)
            ? subjectiveDraftQuestions
            : []),
    ])

    devLog.info("Merging generated questions", {
        pipelineRunId,
        objectiveCount: objectiveDraftQuestions?.length || 0,
        subjectiveCount: subjectiveDraftQuestions?.length || 0,
        mergedCount: merged.length,
        requestedCount,
    })

    if (merged.length < requestedCount) {
        return {
            draftQuestions: merged,
            status: "failed",
            errors: [
                `Insufficient generated questions before options step: expected ${requestedCount}, got ${merged.length}`,
            ],
        }
    }

    return {
        draftQuestions: merged.slice(0, requestedCount),
        status: "generating",
    }
}
