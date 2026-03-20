// apps/api/src/agents/graph.js
import { StateGraph } from "@langchain/langgraph"
import { QuizState } from "./state.js"
import { contentAgent } from "./agents/content.agent.js"
import { objectiveQuestionAgent } from "./agents/objectiveQuestion.agent.js"
import { subjectiveQuestionAgent } from "./agents/subjectiveQuestion.agent.js"
import { mergeQuestionsAgent } from "./agents/mergeQuestions.agent.js"
import { optionsAgent } from "./agents/options.agent.js"
import { reviewAgent } from "./agents/review.agent.js"
import { formattingAgent } from "./agents/formatting.agent.js"

// Define the Graph
const workflow = new StateGraph(QuizState)
    .addNode("content", contentAgent)
    .addNode("generateObjectiveQuestions", objectiveQuestionAgent)
    .addNode("generateSubjectiveQuestions", subjectiveQuestionAgent)
    .addNode("mergeGeneratedQuestions", mergeQuestionsAgent)
    .addNode("generateOptions", optionsAgent)
    .addNode("review", reviewAgent)
    .addNode("formatting", formattingAgent)

// Define Edges
workflow.addEdge("__start__", "content")
workflow.addEdge("content", "generateObjectiveQuestions")
workflow.addEdge("generateObjectiveQuestions", "generateSubjectiveQuestions")
workflow.addEdge("generateSubjectiveQuestions", "mergeGeneratedQuestions")
workflow.addConditionalEdges(
    "mergeGeneratedQuestions",
    (state) => {
        if (state.status === "failed") {
            return "__end__"
        }
        return "generateOptions"
    },
    {
        __end__: "__end__",
        generateOptions: "generateOptions",
    }
)
workflow.addEdge("generateOptions", "review")

// Conditional Edge for Review
workflow.addConditionalEdges(
    "review",
    (state) => {
        if (state.status === "failed") {
            return "__end__"
        }
        return "formatting"
    },
    {
        __end__: "__end__",
        formatting: "formatting",
    }
)

workflow.addEdge("formatting", "__end__")

// Compile the graph
export const getCompiledGraph = (checkpointer) => {
    return workflow.compile({ checkpointer })
}

// Default compiled graph (for backward compatibility or testing without persistence)
export const quizGraph = workflow.compile()
