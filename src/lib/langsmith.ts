import { Client } from "langsmith";
import { traceable } from "langsmith/traceable";

const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY;
const LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT;
const LANGSMITH_TRACING = process.env.LANGSMITH_TRACING === "true";
const LANGSMITH_BASE_URL = process.env.LANGSMITH_BASE_URL || "https://api.smith.langchain.com";

export const langsmithClient = new Client({
  apiUrl: LANGSMITH_BASE_URL,
  apiKey: LANGSMITH_API_KEY,
});
/**
 * Fetch a prompt from LangSmith by name, optionally injecting variables.
 * Throws if the prompt is not found or is empty.
 */
export async function getPrompt(promptName: string, variables?: Record<string, any>): Promise<string> {
  if (!LANGSMITH_API_KEY || !LANGSMITH_PROJECT) {
    throw new Error("LangSmith API key or project not set");
  }
  // Use the SDK to fetch the prompt (by name)
  const promptObj = await langsmithClient.getPrompt(promptName);
  let prompt = (promptObj as any)?.template ?? (promptObj as any)?.text ?? "";
  if (!prompt) {
    console.log("promptObj", promptObj);
    throw new Error(`Prompt '${promptName}' not found or is empty in LangSmith`);
  }
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`{{\s*${key}\s*}}`, "g"), String(value));
    }
  }
  console.log("prompt used", prompt);
  return prompt;
}

/**
 * Trace an LLM call to LangSmith (if tracing is enabled).
 */
export async function traceLLMCall({
  prompt,
  response,
  metadata,
}: {
  prompt: string;
  response: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  if (!LANGSMITH_TRACING || !LANGSMITH_API_KEY || !LANGSMITH_PROJECT) return;
  const url = `${LANGSMITH_BASE_URL}/api/projects/${encodeURIComponent(LANGSMITH_PROJECT)}/traces`;
  const body = {
    prompt,
    response,
    metadata,
    timestamp: Date.now(),
  };
  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LANGSMITH_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Export the correct tracing helper
export { traceable }; 