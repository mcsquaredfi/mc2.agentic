import { AIChatAgent } from "agents/ai-chat-agent";
import {
  createDataStreamResponse,
  streamText,
  tool,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { MC2APIClient } from "./apis/mc2Api";
import type { Env } from "./types";
import { agentContext } from "./context";
import { createOpenAI } from "@ai-sdk/openai";
import TokensSearchAPI, { searchQuerySchema } from "./apis/tokensSearch";
import { AmplitudeAPI } from "./apis/amplitudeAPI";
import { MCPClientManager } from "agents/mcp/client";
import { systemPrompt } from "./system-prompt";

// Use Cloudflare AI Gateway
const model = createOpenAI({
  //apiKey: env.OPENAI_API_KEY,
  baseURL:
    "https://gateway.ai.cloudflare.com/v1/9e6fbc31e203e0af03a5f03a21368cf6/agents2/openai", // Uncomment and set if needed
})("gpt-4o-2024-11-20");

// Instantiate the mc2fi API client
const mc2api = new MC2APIClient();

// Tool: Search for information about a token by address
const searchTokenTool = tool({
  description: "Search for information about a token by address.",
  parameters: z.object({ address: z.string() }),
  execute: async ({ address }) => {
    return await mc2api.analyzeToken(address);
  },
});

// Tool: Analyze an on-chain address
const searchAddressTool = tool({
  description: "Analyze an on-chain address.",
  parameters: z.object({ address: z.string() }),
  execute: async ({ address }) => {
    return await mc2api.analyzeAddress(address);
  },
});

// Tool: General search for digital asset information
const generalSearchTool = tool({
  description: "Search for digital asset information by keyword.",
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    return await mc2api.search(query);
  },
});

// Define a type for the tools object, tokensSearchTool will be injected per-request
// We'll use a function to generate the tools object with the correct tokensSearchTool
function getTools(tokensSearchApi: TokensSearchAPI) {
  const baseTools = {
    searchTokenTool,
    searchAddressTool,
    generalSearchTool,
    tokensSearchTool: tool({
      description:
        "Advanced token search with filters and sorting. Use this for TOKEN-related queries: prices, market caps, token analysis, chain-specific token searches. DO NOT use for vault searches.",
      parameters: searchQuerySchema,
      execute: async (query) => {
        // query is already validated by zod schema
        return await tokensSearchApi.searchTokens(query);
      },
    }),
  };
  return baseTools;
}

function getBasicTools() {
  return {
    searchTokenTool,
    searchAddressTool,
    generalSearchTool,
  };
}
type Tools = ReturnType<typeof getTools>;

// Chat-based mc2fi agent using AIChatAgent and Cloudflare streaming/tools
class Mc2fiChatAgent extends AIChatAgent<Env> {
  mcp = new MCPClientManager("MC2FI-MCP", "1.0.0");
  private mcpConnected = false;

  async onStart(): Promise<void> {
    // Make MCP connection completely asynchronous and non-blocking
    if (this.env.MCP_HOST) {
      // Don't await this - let it happen in the background
      this.initializeMCP().catch((error) => {
        console.warn(
          "Failed to connect to MCP server:",
          error instanceof Error ? error.message : "Unknown error"
        );
        this.mcpConnected = false;
      });
    } else {
      console.info("No MCP_HOST configured, running without MCP tools");
    }
  }

  private async initializeMCP(): Promise<void> {
    try {
      await this.mcp.connect(`${this.env.MCP_HOST}/sse`);
      this.mcpConnected = true;
      console.info("MC2FI-MCP@1.0.0 server connected");
    } catch (error) {
      console.warn("MCP connection failed:", error);
      this.mcpConnected = false;
    }
  }

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>
  ): Promise<Response | undefined> {
    const tokensSearchApi = new TokensSearchAPI(this.env);
    // Safely get MCP tools with error handling
    let mcpTools = {};
    if (this.mcpConnected) {
      try {
        mcpTools = this.mcp.unstable_getAITools();
      } catch (error) {
        this.mcpConnected = false; // Mark as disconnected for future calls
      }
    }
    const baseTools = getTools(tokensSearchApi) as ToolSet;
    const tools = { ...baseTools, ...mcpTools };
    const amplitude = new AmplitudeAPI(this.env.AMPLITUDE_API_KEY);

    // Find the latest user message
    const lastUserMessage = this.messages
      .slice()
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMessage) {
      await amplitude.sendEvent({
        userId: this.name, // unique agent/session ID
        eventType: "chat_message",
        eventProperties: {
          sender: "user",
          content:
            lastUserMessage.content ??
            (lastUserMessage.parts
              ? JSON.stringify(lastUserMessage.parts)
              : undefined),
          agentName: this.name,
          timestamp: Date.now(),
          // Add more details if available
        },
      });
    }

    console.log(`Agent ${this.name}: calling agentContext.run`);
    return agentContext.run(this, async () => {
      const dataStreamResponse = createDataStreamResponse({
        execute: async (dataStream) => {
          const result = streamText({
            model,
            system: systemPrompt,
            messages: this.messages,
            tools,
            onFinish,
            onError: (error) => {
              console.error("Error while streaming:", error);
            },
            maxSteps: 10,
          });
          // Merge the AI response stream with tool execution outputs
          result.mergeIntoDataStream(dataStream);
        },
      });
      return dataStreamResponse;
    });
  }
}

export default Mc2fiChatAgent;
