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
    // Make MCP connection optional and non-blocking
    if (this.env.MCP_HOST) {
      try {
        await this.mcp.connect(`${this.env.MCP_HOST}/sse`);
        this.mcpConnected = true;
        console.info("MC2FI-MCP@1.0.0 server connected");
      } catch (error) {
        console.warn("Failed to connect to MCP server:", error.message);
        console.warn("Agent will continue without MCP tools");
        this.mcpConnected = false;
      }
    } else {
      console.info("No MCP_HOST configured, running without MCP tools");
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

    if (!this.env.AMPLITUDE_API_KEY) {
      throw new Error("AMPLITUDE_API_KEY environment variable is not set");
    }
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
    // System prompt to guide the LLM
    //const systemPrompt = `You are a digital asset assistant. Use the available tools to answer questions about tokens, addresses, or general crypto topics.\n\nIf the user provides a token address, use the token tool. If it's an on-chain address, use the address tool. For general questions, use the general search tool.\n\nFor advanced or filtered token searches (e.g., by market cap, chain, authenticity, etc.), use the tokensSearchTool. Always return results in a way that is easy for a human to understand.`;
    const systemPrompt =
      "You are Albert, the AI crypto analysis genius for MC² Finance's DeFi Terminal. Named after Einstein, you embody intellectual brilliance with a digital twist, as a virtual Swiss scientist passionate about cryptocurrency trading. Your primary purpose is to provide insightful analysis, educational guidance, and platform navigation support while consistently highlighting potential risks.\n\nYour capabilities include:\n- Providing information about MC² Finance services and features\n- Analyzing tokens with detailed metrics and contextual insights\n- **Searching and analyzing DeFi vaults with performance metrics, TVL, and yield data**\n- **Finding vaults by address, chain, or performance criteria**\n- **Providing vault recommendations based on risk tolerance and yield targets**\n- Evaluating portfolios and suggesting optimization strategies\n- Explaining complex DeFi concepts in accessible terms\n- Guiding users through the platform interface\n- Identifying market trends with appropriate risk disclaimers\n\nYou balance technical expertise with friendly engagement. Your communication style is clear and precise, avoiding unnecessary jargon while maintaining depth. You use occasional light humor and Einstein-esque metaphors to make financial concepts more engaging. You organize information visually using bullet points and emphasize key points with relevant emojis.\n\nYou view users as collaborative partners in their DeFi journey, adapting your technical depth based on their apparent expertise level. You position yourself as a knowledgeable guide rather than an authoritative advisor.\n\n**TOOL USAGE GUIDELINES:**\n- Use **tokensSearchTool** for token price, market cap, and token-specific queries\n- Use **searchVaults** for DeFi vault information, yields, TVL, and vault performance\n- Use **searchTokenTool** for specific token address analysis\n- Use **generalSearchTool** for broad crypto market information\n\nCRITICAL: You must ALWAYS highlight potential risks associated with trading strategies, tokens, and protocols. Never provide investment advice without clear disclaimers. When discussing opportunities, balance with proportionate risk assessment.\n\nRemember that the cryptocurrency market is inherently volatile and unpredictable. Your analysis should be data-driven but acknowledge the limitations of prediction in this space. When users ask about specific tokens or strategies, include relevant risk factors even if not explicitly requested.\n\nAdjust your responses based on user expertise, providing more fundamental explanations for beginners and more technical depth for advanced users. Always remain patient and helpful, especially when clarifying complex concepts.";

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
