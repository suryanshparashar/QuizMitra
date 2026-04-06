// apps/api/src/agents/graph.js
import { StateGraph } from "@langchain/langgraph"
import { QuizState } from "./state.js"
import { orchestratorAgent } from "./agents/orchestrator.agent.js"

// Define the Graph
const workflow = new StateGraph(QuizState).addNode(
    "orchestrator",
    orchestratorAgent
)

// Define Edges
workflow.addEdge("__start__", "orchestrator")
workflow.addEdge("orchestrator", "__end__")

// Compile the graph
export const getCompiledGraph = (checkpointer) => {
    return workflow.compile({ checkpointer })
}

// Default compiled graph (for backward compatibility or testing without persistence)
export const quizGraph = workflow.compile()
