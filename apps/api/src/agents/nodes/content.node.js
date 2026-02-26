// apps/api/src/agents/nodes/content.node.js
import pdfParse from "pdf-parse";

export const contentNode = async (state) => {
  const { input } = state;

  if (state.sourceContent) {
    return { sourceContent: state.sourceContent };
  }

  try {
    let content = "";

    if (input.type === "pdf") {
      // Input data is expected to be a Buffer
      const data = await pdfParse(input.data);
      content = data.text;
    } else if (input.type === "topic") {
      // Fallback for topic-based generation (placeholder for search tool)
      content = `The user wants a quiz about: ${input.data}. Generate questions based on general knowledge about this topic.`;
    }

    // specific cleanup for PDF text could go here
    const cleanedContent = content.replace(/\n\s*\n/g, "\n").trim();

    return { sourceContent: cleanedContent };
  } catch (error) {
    console.error("Content extraction error:", error);
    return { 
        errors: [`Failed to extract content: ${error.message}`],
        status: "failed" 
    };
  }
};
