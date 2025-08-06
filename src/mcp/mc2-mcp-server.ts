import { MC2APIClient } from "../agents/apis/mc2Api";
import type { Env } from "../agents/types";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import TokensSearchAPI, {
  searchQuerySchema,
} from "../agents/apis/tokensSearch";
import { AmplitudeAPI } from "../agents/apis/amplitudeAPI";
import { z } from "zod";

// state interface for the MCP server
interface MC2MCPState {
  sessionId: string;
  userId?: string;
  lastAnalysis?: {
    tokenAddress?: string;
    walletAddress?: string;
    timestamp: number;
    results: any;
  };
  userPreference?: {
    riskTolerance: "low" | "medium" | "high";
    preferredChains: string[];
    analyticsEnabled: boolean;
  };
  conversationHistory: Array<{
    type: "user_query" | "tool_call" | "analysis_result";
    content: string;
    timestamp: number;
  }>;
}

export class MC2MCPServer extends McpAgent<Env, MC2MCPState, {}> {
  server = new McpServer({
    name: "MC² Finance DeFi Terminal",
    version: "1.0.0",
  });

  initialState: MC2MCPState = {
    sessionId: crypto.randomUUID(),
    conversationHistory: [],
  };

  private mc2api!: MC2APIClient;
  private tokensSearchAPI!: TokensSearchAPI;
  private amplitude!: AmplitudeAPI;

  async init() {
    // initialize api client
    this.mc2api = new MC2APIClient();
    this.tokensSearchAPI = new TokensSearchAPI(this.env);
    this.amplitude = new AmplitudeAPI(this.env.AMPLITUDE_API_KEY);

    // register MCP resources
    await this.registerResources();

    // register MCP tools
    await this.registerTools();

    // await MCP prompts
    await this.registerPrompts();
  }

  private async registerResources() {
    // session state resource
    this.server.resource(
      "Current session state and preferences",
      "mcp://mc2/session/state",
      () => ({
        contents: [
          {
            uri: "mcp://mc2/session/state",
            text: JSON.stringify(this.state, null, 2),
            mimeType: "application/json",
          },
        ],
      })
    );

    // analysis history resource
    this.server.resource(
      "Recent analysis history",
      "mcp://mc2/analysis/history",
      () => ({
        contents: [
          {
            uri: "mcp://mc2/analysis/history",
            text: JSON.stringify(
              this.state.conversationHistory.slice(-10),
              null,
              2
            ),
            mimeType: "application/json",
          },
        ],
      })
    );

    // user preference resource
    this.server.resource(
      "User preferences for MC² Finance",
      "mcp://mc2/user/preferences",
      () => ({
        contents: [
          {
            uri: "mcp://mc2/user/preferences",
            text: JSON.stringify(this.state.userPreference, null, 2),
          },
        ],
      })
    );
  }

  private async registerTools() {
    // Entity Analysis Tool (tokens and addresses)
    this.server.tool(
      "ENTITY_INSIGHTS_ACTION",
      "Analyze tokens or wallet addresses with detailed insights",
      {
        address: z
          .string()
          .describe("Token contract address or wallet address to analyze"),
        analysisType: z
          .enum(["token", "wallet", "auto"])
          .optional()
          .default("auto")
          .describe("Type of analysis to perform"),
      },
      async ({ address, analysisType = "auto" }) => {
        try {
          // Track the analysis request
          await this.trackAnalysis("entity_analysis", {
            address,
            analysisType,
          });

          let result;
          if (
            analysisType === "token" ||
            (analysisType === "auto" && this.isTokenAddress(address))
          ) {
            result = await this.mc2api.analyzeToken(address);
            this.setState({
              ...this.state,
              lastAnalysis: {
                tokenAddress: address,
                timestamp: Date.now(),
                results: result,
              },
            });
          } else {
            result = await this.mc2api.analyzeAddress(address);
            this.setState({
              ...this.state,
              lastAnalysis: {
                walletAddress: address,
                timestamp: Date.now(),
                results: result,
              },
            });
          }

          return {
            content: [
              {
                type: "text",
                text: this.formatEntityAnalysis(result, address, analysisType),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Analysis failed for ${address}: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      }
    );

    // Advanced Token Search Tool
    this.server.tool(
      "TOKEN_SEARCH",
      "Advanced token search with filters and sorting",
      searchQuerySchema,
      async (query) => {
        try {
          await this.trackAnalysis("token_search", query);

          const results = await this.tokensSearchApi.searchTokens(query);

          this.addToHistory(
            "tool_call",
            `Token search: ${JSON.stringify(query)}`
          );

          return {
            content: [
              {
                type: "text",
                text: this.formatTokenSearchResults(results, query),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Token search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      }
    );

    // General Search Tool
    this.server.tool(
      "GENERAL_SEARCH",
      "General search for DeFi and crypto information",
      {
        query: z
          .string()
          .describe("Search query for general crypto/DeFi information"),
        category: z
          .enum(["protocols", "news", "trends", "education"])
          .optional()
          .describe("Search category"),
      },
      async ({ query, category }) => {
        try {
          await this.trackAnalysis("general_search", { query, category });

          const results = await this.mc2api.search(query);

          this.addToHistory("tool_call", `General search: ${query}`);

          return {
            content: [
              {
                type: "text",
                text: this.formatGeneralSearchResults(results, query, category),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Search failed for "${query}": ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      }
    );

    // Portfolio Analysis Tool
    this.server.tool(
      "PORTFOLIO_ANALYSIS",
      "Analyze a wallet's portfolio composition and performance",
      {
        walletAddress: z.string().describe("Wallet address to analyze"),
        includeNFTs: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include NFT analysis"),
        timeframe: z
          .enum(["24h", "7d", "30d", "90d"])
          .optional()
          .default("30d")
          .describe("Analysis timeframe"),
      },
      async ({ walletAddress, includeNFTs, timeframe }) => {
        try {
          await this.trackAnalysis("portfolio_analysis", {
            walletAddress,
            includeNFTs,
            timeframe,
          });

          const addressData = await this.mc2api.analyzeAddress(walletAddress);

          this.setState({
            ...this.state,
            lastAnalysis: {
              walletAddress,
              timestamp: Date.now(),
              results: addressData,
            },
          });

          return {
            content: [
              {
                type: "text",
                text: this.formatPortfolioAnalysis(
                  addressData,
                  walletAddress,
                  timeframe
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Portfolio analysis failed for ${walletAddress}: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      }
    );

    // Risk Assessment Tool
    this.server.tool(
      "RISK_ASSESSMENT",
      "Assess risk factors for tokens, protocols, or strategies",
      {
        entityAddress: z
          .string()
          .describe("Token or protocol address to assess"),
        assessmentType: z
          .enum(["token", "protocol", "strategy"])
          .describe("Type of risk assessment"),
        userRiskProfile: z
          .enum(["conservative", "moderate", "aggressive"])
          .optional()
          .describe("User's risk profile"),
      },
      async ({ entityAddress, assessmentType, userRiskProfile }) => {
        try {
          await this.trackAnalysis("risk_assessment", {
            entityAddress,
            assessmentType,
            userRiskProfile,
          });

          const analysisResult = await this.mc2api.analyzeToken(entityAddress);

          return {
            content: [
              {
                type: "text",
                text: this.formatRiskAssessment(
                  analysisResult,
                  assessmentType,
                  userRiskProfile
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Risk assessment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      }
    );
  }

  private async registerPrompts() {
    this.server.prompt(
      "defi_analysis_prompt",
      "Generate a comprehensive DeFi analysis prompt",
      {
        entity: z
          .string()
          .describe("Token address, wallet address, or protocol name"),
        analysisDepth: z
          .enum(["basic", "intermediate", "advanced"])
          .default("intermediate"),
        focusAreas: z
          .array(z.string())
          .optional()
          .describe("Specific areas to focus on"),
      },
      async ({ entity, analysisDepth, focusAreas }) => {
        const prompt = this.generateAnalysisPrompt(
          entity,
          analysisDepth,
          focusAreas
        );
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: prompt,
              },
            },
          ],
        };
      }
    );
  }

  // Helper methods for formatting and data processing
  private isTokenAddress(address: string): boolean {
    // Simple heuristic: if it's a valid Ethereum address, assume it could be a token
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private formatEntityAnalysis(
    result: any,
    address: string,
    type: string
  ): string {
    // Format the entity analysis result for display
    const emoji = type === "token" ? "🪙" : "👛";
    return `${emoji} **Analysis for ${address}**\n\n${JSON.stringify(result, null, 2)}`;
  }

  private formatTokenSearchResults(results: any, query: any): string {
    return `🔍 **Token Search Results**\nQuery: ${JSON.stringify(query)}\n\n${JSON.stringify(results, null, 2)}`;
  }

  private formatGeneralSearchResults(
    results: any,
    query: string,
    category?: string
  ): string {
    const categoryEmoji =
      category === "protocols" ? "🏛️" : category === "news" ? "📰" : "🔍";
    return `${categoryEmoji} **Search Results for "${query}"**\n${category ? `Category: ${category}\n` : ""}\n${JSON.stringify(results, null, 2)}`;
  }

  private formatPortfolioAnalysis(
    data: any,
    address: string,
    timeframe: string
  ): string {
    return `📊 **Portfolio Analysis for ${address}**\nTimeframe: ${timeframe}\n\n${JSON.stringify(data, null, 2)}`;
  }

  private formatRiskAssessment(
    data: any,
    type: string,
    profile?: string
  ): string {
    return `⚠️ **Risk Assessment (${type})**\n${profile ? `User Profile: ${profile}\n` : ""}\n${JSON.stringify(data, null, 2)}`;
  }

  private generateAnalysisPrompt(
    entity: string,
    depth: string,
    focusAreas?: string[]
  ): string {
    const basePrompt = `Please analyze ${entity} with a ${depth} level of analysis.`;
    const focusPrompt = focusAreas?.length
      ? `\nFocus on: ${focusAreas.join(", ")}`
      : "";
    return basePrompt + focusPrompt;
  }

  private async trackAnalysis(eventType: string, data: any): Promise<void> {
    try {
      await this.amplitude.sendEvent({
        userId: this.state.sessionId,
        eventType: `mcp_${eventType}`,
        eventProperties: {
          ...data,
          timestamp: Date.now(),
          sessionId: this.state.sessionId,
        },
      });
    } catch (error) {
      console.warn("Analytics tracking failed:", error);
    }
  }

  private addToHistory(
    type: MC2MCPState["conversationHistory"][0]["type"],
    content: string
  ): void {
    const history = [
      ...this.state.conversationHistory,
      {
        type,
        content,
        timestamp: Date.now(),
      },
    ].slice(-50); // Keep last 50 entries

    this.setState({
      ...this.state,
      conversationHistory: history,
    });
  }

  onStateUpdate(state: MC2MCPState) {
    console.log("MC² MCP Server state updated:", {
      sessionId: state.sessionId,
      historyLength: state.conversationHistory.length,
    });
  }
}
