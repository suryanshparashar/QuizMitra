export const OBJECTIVE_TYPES = [
    "multiple-choice",
    "multiple-select",
    "true-false",
]

export const SUBJECTIVE_TYPES = ["short-answer", "long-answer"]

const CANONICAL_QUESTION_TYPES = [
    "multiple-choice",
    "multiple-select",
    "true-false",
    "short-answer",
    "long-answer",
]

export const normalizeQuestionTypeValue = (value) => {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()

    if (
        ["mcq", "multiple choice", "multiple-choice", "single-choice"].includes(
            normalized
        )
    ) {
        return "multiple-choice"
    }

    if (["msq", "multiple-select", "multiple select"].includes(normalized)) {
        return "multiple-select"
    }

    if (["true-false", "true/false", "tf"].includes(normalized)) {
        return "true-false"
    }

    if (["short-answer", "short answer", "short"].includes(normalized)) {
        return "short-answer"
    }

    if (["long-answer", "long answer", "long"].includes(normalized)) {
        return "long-answer"
    }

    return "multiple-choice"
}

export const normalizeQuestionTypesList = (types) => {
    const normalized = (Array.isArray(types) ? types : [])
        .map((entry) => normalizeQuestionTypeValue(entry))
        .filter((entry) => CANONICAL_QUESTION_TYPES.includes(entry))

    return normalized.length > 0
        ? [...new Set(normalized)]
        : ["multiple-choice"]
}

export const getQuestionTypeAllocation = (total, selectedTypes) => {
    const requestedCount = Number(total || 0)
    const normalizedTypes = normalizeQuestionTypesList(selectedTypes)

    const objectiveSelected = normalizedTypes.filter((entry) =>
        OBJECTIVE_TYPES.includes(entry)
    )
    const subjectiveSelected = normalizedTypes.filter((entry) =>
        SUBJECTIVE_TYPES.includes(entry)
    )

    if (objectiveSelected.length === 0) {
        return {
            objectiveCount: 0,
            subjectiveCount: requestedCount,
            objectiveTypes: [],
            subjectiveTypes: subjectiveSelected,
        }
    }

    if (subjectiveSelected.length === 0) {
        return {
            objectiveCount: requestedCount,
            subjectiveCount: 0,
            objectiveTypes: objectiveSelected,
            subjectiveTypes: [],
        }
    }

    const objectiveCount = Math.floor(
        (requestedCount * objectiveSelected.length) / normalizedTypes.length
    )

    return {
        objectiveCount,
        subjectiveCount: requestedCount - objectiveCount,
        objectiveTypes: objectiveSelected,
        subjectiveTypes: subjectiveSelected,
    }
}
