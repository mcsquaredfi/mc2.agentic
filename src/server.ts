import { routeAgentRequest, type Schedule } from "agents";

import { unstable_getSchedulePrompt } from "agents/schedule";

import { AIChatAgent } from "agents/ai-chat-agent";
import Mc2fiChatAgent from "./agents/mc2fi-agent";
import {
  createDataStreamResponse,
  generateId,
  streamText,
  type StreamTextOnFinishCallback,
} from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { processToolCalls } from "./utils";
import { tools, executions } from "./tools";
import { AsyncLocalStorage } from "node:async_hooks";
import Mc2fiMCPAgent from "./mcp/mc2fi-mcp";
// import { env } from "cloudflare:workers";

// we use ALS to expose the agent context to the tools
export const agentContext = new AsyncLocalStorage<Chat>();
/**
 * Chat Agent implementation that handles real-time AI chat interactions
 */
// --- Original Chat agent (AIChatAgent) ---
// export class Chat extends AIChatAgent<Env> {
//   /**
//    * Handles incoming chat messages and manages the response stream
//    * @param onFinish - Callback function executed when streaming completes
//    */
//   async onChatMessage(onFinish: StreamTextOnFinishCallback<{}>) {
//     return agentContext.run(this, async () => {
//       // Use a static system prompt
//       const systemPrompt = `You are a helpful assistant. If the user asks to schedule a task, use the schedule tool to schedule the task.`;
//       let streamedText = "";
//       const dataStreamResponse = createDataStreamResponse({
//         execute: async (dataStream) => {
//           // Process any pending tool calls from previous messages
//           const processedMessages = await processToolCalls({
//             messages: this.messages,
//             dataStream,
//             tools,
//             executions,
//           });
//
//           // --- Stream the AI response using GPT-4 via Cloudflare AI Gateway ---
//           const result = streamText({
//             model,
//             system: systemPrompt,
//             // @ts-ignore: toolCalls type mismatch is safe to ignore for streaming
//             messages: processedMessages,
//             tools,
//             onFinish: async (...args) => {
//               streamedText = args[0]?.text || streamedText;
//               // @ts-ignore: StepResult type mismatch is safe to ignore for tool calls
//               if (onFinish) await onFinish(...args);
//             },
//             onError: (error) => {
//               console.error("Error while streaming:", error);
//             },
//             maxSteps: 10,
//           });
//
//           // Merge the AI response stream with tool execution outputs
//           result.mergeIntoDataStream(dataStream);
//         },
//       });
//       return dataStreamResponse;
//     });
//   }
//   async executeTask(description: string, task: Schedule<string>) {
//     await this.saveMessages([
//       ...this.messages,
//       {
//         id: generateId(),
//         role: "user",
//         content: `Running scheduled task: ${description}`,
//         createdAt: new Date(),
//       },
//     ]);
//   }
// }

/**
 * To use the original Chat agent, comment out the export below and uncomment the export above.
 */
// --- Mc2fiChatAgent as the active Chat agent ---
export class Chat extends Mc2fiChatAgent {}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
      );
      return new Response("OPENAI_API_KEY is not set", { status: 500 });
    }
    const url = new URL(request.url);

    if (url.pathname.startsWith("/sse")) {
      return Mc2fiMCPAgent.serveSSE("/sse", {
        binding: "Mc2fiMCPAgent",
      }).fetch(request, env, ctx);
    }

    if (url.pathname.startsWith("/mcp")) {
      return Mc2fiMCPAgent.serve("/mcp", {
        binding: "Mc2fiMCPAgent",
      }).fetch(request, env, ctx);
    }

    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;

export { Mc2fiMCPAgent };
