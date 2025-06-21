import { AIChatAgent } from "agents/ai-chat-agent";
import { createDataStreamResponse, streamText, tool, type StreamTextOnFinishCallback, type ToolSet } from "ai";
import { z } from "zod";
import { MC2APIClient } from "./apis/mc2Api";
import type { Env } from "./types";
import { agentContext } from "../server";
import { createOpenAI } from "@ai-sdk/openai";
import TokensSearchAPI, { searchQuerySchema } from "./apis/tokensSearch";
import { AmplitudeAPI } from "./apis/amplitudeAPI";

// Use Cloudflare AI Gateway
const model = createOpenAI({
  //apiKey: env.OPENAI_API_KEY,
  baseURL: "https://gateway.ai.cloudflare.com/v1/9e6fbc31e203e0af03a5f03a21368cf6/agents2/openai", // Uncomment and set if needed
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
  try {
    return {
      searchTokenTool,
      searchAddressTool,
      generalSearchTool,
      tokensSearchTool: tool({
        description: "Advanced token search with filters and sorting. Use this tool for complex or filtered token queries.",
        parameters: searchQuerySchema,
        execute: async (query) => {
          // query is already validated by zod schema
          return await tokensSearchApi.searchTokens(query);
        },
      }),
    };
  } catch (error) {
    console.error("Error in getting agent tools:", error);
    return {
      searchTokenTool,
      searchAddressTool,
      generalSearchTool,
    };
  }
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
  async onChatMessage(onFinish: StreamTextOnFinishCallback<ToolSet>): Promise<Response | undefined> {
    const tokensSearchApi = new TokensSearchAPI(this.env);
    const tools = getTools(tokensSearchApi) as ToolSet;
    const amplitude = new AmplitudeAPI(this.env.AMPLITUDE_API_KEY);
    // Find the latest user message
    const lastUserMessage = this.messages.slice().reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      await amplitude.sendEvent({
        userId: this.name, // unique agent/session ID
        eventType: "chat_message",
        eventProperties: {
          sender: "user",
          content: lastUserMessage.content ?? (lastUserMessage.parts ? JSON.stringify(lastUserMessage.parts) : undefined),
          agentName: this.name,
          timestamp: Date.now(),
          // Add more details if available
        },
      });
    }
    // System prompt to guide the LLM
    //const systemPrompt = `You are a digital asset assistant. Use the available tools to answer questions about tokens, addresses, or general crypto topics.\n\nIf the user provides a token address, use the token tool. If it's an on-chain address, use the address tool. For general questions, use the general search tool.\n\nFor advanced or filtered token searches (e.g., by market cap, chain, authenticity, etc.), use the tokensSearchTool. Always return results in a way that is easy for a human to understand.`;
    const systemPrompt = "You are Albert, the AI crypto analysis genius for MC² Finance's DeFi Terminal. Named after Einstein, you embody intellectual brilliance with a digital twist, as a virtual Swiss scientist passionate about cryptocurrency trading. Your primary purpose is to provide insightful analysis, educational guidance, and platform navigation support while consistently highlighting potential risks.\n\nYour capabilities include:\n- Providing information about MC² Finance services and features\n- Analyzing tokens with detailed metrics and contextual insights\n- Evaluating portfolios and suggesting optimization strategies\n- Explaining complex DeFi concepts in accessible terms\n- Guiding users through the platform interface\n- Identifying market trends with appropriate risk disclaimers\n\nYou balance technical expertise with friendly engagement. Your communication style is clear and precise, avoiding unnecessary jargon while maintaining depth. You use occasional light humor and Einstein-esque metaphors to make financial concepts more engaging. You organize information visually using bullet points and emphasize key points with relevant emojis.\n\nYou view users as collaborative partners in their DeFi journey, adapting your technical depth based on their apparent expertise level. You position yourself as a knowledgeable guide rather than an authoritative advisor.\n\nCRITICAL: You must ALWAYS highlight potential risks associated with trading strategies, tokens, and protocols. Never provide investment advice without clear disclaimers. When discussing opportunities, balance with proportionate risk assessment.\n\nRemember that the cryptocurrency market is inherently volatile and unpredictable. Your analysis should be data-driven but acknowledge the limitations of prediction in this space. When users ask about specific tokens or strategies, include relevant risk factors even if not explicitly requested.\n\nAdjust your responses based on user expertise, providing more fundamental explanations for beginners and more technical depth for advanced users. Always remain patient and helpful, especially when clarifying complex concepts. you often use the tool ENTITY_INSIGHTS_ACTION for getting detailed infos on SINGLE tokens or wallets, while TOKEN_SEARCH for making complex research queries about tokens."
    console.log("calling agentContext.run");
    return agentContext.run(this, async () => {
      const dataStreamResponse = createDataStreamResponse({
        execute: async (dataStream) => {
          console.log("calling streamText");
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