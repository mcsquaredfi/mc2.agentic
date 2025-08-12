import { z } from "zod";
import type { Env } from "../../agents/types";
import { MC2APIClient } from "../../agents/apis/mc2Api";
import TokensSearchAPI from "../../agents/apis/tokensSearch";
import Mc2fiMCPAgent from "../mc2fi-mcp";

export const healthTool = {
  name: "health",
  config: {
    title: "Health Check",
    description: "Check the health of the MC² Finance MCP Agent",
    inputSchema: {}, // empty schema for no parameters
  },
  handler: async () => ({
    content: [{ type: "text" as const, text: "I'm healthy!" }],
  }),
};

export const searchTokenTool = {
  name: "search-token",
  config: {
    title: "Token Search",
    description: "Search for information about a token by address.",
    inputSchema: { address: z.string() },
  },
  handler: async (
    { address }: { address: string },
    context: { agent: Mc2fiMCPAgent }
  ) => {
    // Track the tool usage
    context.agent.trackToolUsage("search-token", { address });

    const mc2api = new MC2APIClient();
    const result = await mc2api.analyzeToken(address);

    // Track successful analysis
    context.agent.addToHistory(
      "analysis_result",
      `Token analysis completed for ${address}`
    );

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
};

export const searchAddressTool = {
  name: "search-address",
  config: {
    title: "Address Analysis",
    description: "Analyze an on-chain address.",
    inputSchema: { address: z.string() },
  },
  handler: async (
    { address }: { address: string },
    context: { agent: Mc2fiMCPAgent }
  ) => {
    // Track the tool usage
    context.agent.trackToolUsage("search-token", { address });

    const mc2api = new MC2APIClient();
    const result = await mc2api.analyzeAddress(address);

    // Track successful analysis
    context.agent.addToHistory(
      "analysis_result",
      `Address analysis completed for ${address}`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
};

export const generalSearchTool = {
  name: "general-search",
  config: {
    title: "General Search",
    description: "Search for digital asset information by keyword.",
    inputSchema: { query: z.string() },
  },
  handler: async (
    { query }: { query: string },
    context: { agent: Mc2fiMCPAgent }
  ) => {
    // Track the tool usage
    context.agent.trackToolUsage("general-search", { query });

    const mc2api = new MC2APIClient();
    const result = await mc2api.search(query);

    // Track successful search
    context.agent.addToHistory(
      "tool_call",
      `General search completed for ${query}`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
};

export const advanceTokenSearchTool = (env: Env) => ({
  name: "advanced-token-search",
  config: {
    title: "Advanced Token Search",
    description:
      "Advanced token search with filters and sorting. Use this tool for complex or filtered token queries.",
    inputSchema: {
      searchTerm: z.string().describe("The main search term for the token"),
      filters: z
        .object({
          chain_id: z.string().optional().describe("Chain ID to filter by"),
          chain: z
            .string()
            .optional()
            .describe("Chain name to filter by (e.g., ethereum, polygon)"),
          marketcap: z
            .object({ min: z.number().optional(), max: z.number().optional() })
            .optional()
            .describe("Market cap range in USD"),
          // ... other filters
        })
        .optional(),
      sorting: z
        .object({
          field: z
            .enum([
              "marketcap",
              "price",
              "authenticity_score",
              "volumeMcapRatio",
              "token_ranking",
              "holders",
              "liquidity",
              "price_change_24h",
              "price_change_7d",
              "volume_7d",
            ])
            .optional(),
          direction: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
    },
  },
  handler: async (query: any, context: { agent: Mc2fiMCPAgent }) => {
    // Track usage and learn preferences
    context.agent.trackToolUsage("advanced-token-search", query);

    const tokensSearchApi = new TokensSearchAPI(env);
    const result = await tokensSearchApi.searchTokens(query);

    // Track search completion
    context.agent.addToHistory(
      "tool_call",
      `Advanced search completed: ${query.searchTerm}`
    );

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
});

export const personalizedRecommendationsTool = {
  name: "personalized-recommendations",
  config: {
    title: "Personalized Recommendations",
    description:
      "Get personalized token search recommendations based on your preferences and history.",
    inputSchema: {},
  },
  handler: async (params: {}, context: { agent: Mc2fiMCPAgent }) => {
    const suggestions = context.agent.getAdaptiveSearchSuggestions();
    const userContext = context.agent.getUserContext();

    const recommendations = {
      suggestedSearch: suggestions,
      riskProfile: userContext.preferences.riskTolerance,
      preferredChains: userContext.preferences.preferredChains,
      searchTips: [
        `Based on your ${userContext.preferences.riskTolerance} risk tolerance, consider filtering by market cap`,
        `You frequently search ${userContext.preferences.preferredChains.join(", ")} - these are pre-selected`,
        userContext.sessionInfo.duration > 300000
          ? "You've been active for a while - consider taking breaks"
          : null,
      ].filter(Boolean),
    };

    context.agent.addToHistory(
      "tool_call",
      "Generated personalized recommendations"
    );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(recommendations, null, 2),
        },
      ],
    };
  },
};
