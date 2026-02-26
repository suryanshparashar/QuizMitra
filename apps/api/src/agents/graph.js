// apps/api/src/agents/graph.js
import { StateGraph } from "@langchain/langgraph"
import { QuizState } from "./state.js"
import { contentNode } from "./nodes/content.node.js"
import { questionNode } from "./nodes/question.node.js"
import { optionsNode } from "./nodes/options.node.js"
import { reviewNode } from "./nodes/review.node.js"
import { formattingNode } from "./nodes/formatting.node.js"

// Define the Graph
const workflow = new StateGraph(QuizState)
    .addNode("content", contentNode)
    .addNode("generateQuestions", questionNode)
    .addNode("generateOptions", optionsNode)
    .addNode("review", reviewNode)
    .addNode("formatting", formattingNode)

// Define Edges
workflow.addEdge("__start__", "content")
workflow.addEdge("content", "generateQuestions")
workflow.addEdge("generateQuestions", "generateOptions")
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
