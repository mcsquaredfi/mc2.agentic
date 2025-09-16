import { tool } from "ai";
import { z } from "zod";
import { MC2APIClient } from "../apis/mc2Api";
import TokensSearchAPI, { searchQuerySchema } from "../apis/tokensSearch";
import { AmplitudeAPI } from "../apis/amplitudeAPI";
import { agentContext } from "../context";
import type { Env } from "../types";

// Instantiate the mc2fi API client
const mc2api = new MC2APIClient();

// Tool: Search for information about a token by address
const searchTokenTool = tool({
  description: "Search for information about a token by address.",
  inputSchema: z.object({ address: z.string() }),
  execute: async ({ address }) => {
    return await mc2api.analyzeToken(address);
  },
});

// Tool: Analyze an on-chain address
const searchAddressTool = tool({
  description: "Analyze an on-chain address.",
  inputSchema: z.object({ address: z.string() }),
  execute: async ({ address }) => {
    return await mc2api.analyzeAddress(address);
  },
});

// Tool: General search for digital asset information
const searchDigitalAssetTool = tool({
  description: "Search for digital asset information.",
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    return await mc2api.search(query);
  },
});

// Tool: Get weather information
const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  inputSchema: z.object({ city: z.string() }),
});

// Tool: Get local time
const getLocalTime = tool({
  description: "get the local time for a specified location",
  inputSchema: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    const now = new Date();
    return {
      location,
      time: now.toLocaleString("en-US", {
        timeZone: location,
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      timestamp: now.getTime(),
    };
  },
});

// Tool: Schedule a task
const scheduleTask = tool({
  description: "A tool to schedule a task to be executed at a later time",
  inputSchema: z.object({
    when: z.string().describe("When to execute the task (e.g., 'in 5 minutes', 'tomorrow at 9am')"),
    description: z.string().describe("Description of the task to be executed"),
  }),
  execute: async ({ when, description }) => {
    // This would integrate with a scheduling system
    return {
      scheduled: true,
      when,
      description,
      id: `task_${Date.now()}`,
    };
  },
});


export function getTools(env: Env) {
  // Create tools that have access to the environment
  const searchTokensToolWithEnv = tool({
    description: "Search for tokens using the Typesense search engine",
    inputSchema: searchQuerySchema,
    execute: async (args) => {
      const tokensSearchApi = new TokensSearchAPI(env);
      return await tokensSearchApi.searchTokens(args);
    },
  });

  const searchPortfoliosToolWithEnv = tool({
    description: "Search for portfolios using the Typesense search engine",
    inputSchema: searchQuerySchema,
    execute: async (args) => {
      const tokensSearchApi = new TokensSearchAPI(env);
      return await tokensSearchApi.searchTokens(args);
    },
  });

  const trackEventToolWithEnv = tool({
    description: "Track an event with Amplitude analytics",
    inputSchema: z.object({
      event: z.string().describe("The event name to track"),
      properties: z.record(z.any()).optional().describe("Event properties"),
      userId: z.string().optional().describe("User ID for tracking"),
    }),
    execute: async ({ event, properties, userId }) => {
      const amplitudeApi = new AmplitudeAPI(env.AMPLITUDE_API_KEY || "");
      return await amplitudeApi.sendEvent({
        userId: userId || "anonymous",
        eventType: event,
        eventProperties: properties || {},
      });
    },
  });

  return {
    searchToken: searchTokenTool,
    searchAddress: searchAddressTool,
    searchDigitalAsset: searchDigitalAssetTool,
    getWeatherInformation,
    getLocalTime,
    scheduleTask,
    searchTokens: searchTokensToolWithEnv,
    searchPortfolios: searchPortfoliosToolWithEnv,
    trackEvent: trackEventToolWithEnv,
  };
}
