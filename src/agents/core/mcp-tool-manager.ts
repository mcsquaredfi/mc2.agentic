import type { Env } from "../types";
import { tool } from "ai";
import { z } from "zod";
import { MCPManager } from "./mcp-manager";
import { MC2APIClient } from "../apis/mc2Api";

export class MCPToolManager {
  private mcpManager: MCPManager;
  private mc2ApiClient: MC2APIClient;

  constructor(private env: Env) {
    this.mcpManager = new MCPManager(env);
    this.mc2ApiClient = new MC2APIClient();
  }

  /**
   * Helper method to execute MCP tools with fallback to API
   */
  private async executeMCPToolWithFallback(
    toolName: string,
    args: any,
    fallbackQuery: string,
    resultKey: string
  ): Promise<any> {
    try {
      // Initialize MCP connection if not already connected
      if (!this.mcpManager.isConnected()) {
        await this.mcpManager.initialize();
        console.log(`MCP connection type: ${this.mcpManager.getConnectionType()}`);
      }
      
      // Try to use MCP server
      if (this.mcpManager.isConnected()) {
        try {
          const mcpTools = this.mcpManager.getTools();
          const actualToolName = Object.keys(mcpTools).find(name => name.includes(toolName));
          
          if (actualToolName) {
            const mcpResult = await this.mcpManager.testTool(actualToolName, args);
            return {
              ...args,
              [resultKey]: mcpResult,
              source: 'MC2 MCP Server'
            };
          } else {
            console.warn(`${toolName} tool not found in MCP server`);
          }
        } catch (mcpError) {
          console.warn('MCP server call failed, falling back to API:', mcpError);
        }
      }
      
      // Fallback to API search
      const searchResults = await this.mc2ApiClient.search(fallbackQuery);
      return {
        ...args,
        [resultKey]: searchResults.results || [],
        source: 'MC2 Search API (Fallback)'
      };
    } catch (error) {
      console.error(`Error executing ${toolName}:`, error);
      return {
        ...args,
        [resultKey]: [],
        error: `Failed to execute ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
        source: 'MC2 API Error'
      };
    }
  }

  /**
   * Helper method to create simple API-based tools
   */
  private createAPITool(description: string, inputSchema: any, executeFn: (args: any) => Promise<any>) {
    return tool({
      description,
      inputSchema,
      execute: executeFn
    });
  }

  async getMCPTools(): Promise<any> {
    // Return MCP tools optimized for DeFi/yield applications using AI SDK format
    
    // Token search tool with address analysis
    const searchTokens = this.createAPITool(
      'Search for token information and metadata',
      z.object({
        query: z.string().describe('Search query for token name, symbol, or address')
      }),
      async ({ query }: { query: string }) => {
        console.log(`🔍 MCP Tool: Searching for tokens with query: ${query}`);
        try {
          const searchResults = await this.mc2ApiClient.search(query);
          
          // If query looks like an address, try to analyze it as a token
          if (query.startsWith('0x') && query.length === 42) {
            try {
              const tokenAnalysis = await this.mc2ApiClient.analyzeToken(query);
              return {
                query,
                results: [tokenAnalysis],
                source: 'MC2 Token Analysis API'
              };
            } catch (tokenError) {
              console.warn(`Failed to analyze token address ${query}:`, tokenError);
            }
          }
          
          return {
            query,
            results: searchResults.results || [],
            source: 'MC2 Search API'
          };
        } catch (error) {
          console.error(`Error searching for tokens:`, error);
          return {
            query,
            results: [],
            error: `Failed to search for tokens: ${error instanceof Error ? error.message : String(error)}`,
            source: 'MC2 API Error'
          };
        }
      }
    );

    // Digital asset search tool
    const searchDigitalAsset = this.createAPITool(
      'Search for digital asset information including prices and market data',
      z.object({
        query: z.string().describe('Search query for digital asset')
      }),
      async ({ query }: { query: string }) => {
        console.log(`📊 MCP Tool: Searching for digital asset: ${query}`);
        try {
          const searchResults = await this.mc2ApiClient.search(query);
          return {
            query,
            results: searchResults.results || [],
            source: 'MC2 Digital Asset Search API'
          };
        } catch (error) {
          console.error(`Error searching for digital asset:`, error);
          return {
            query,
            results: [],
            error: `Failed to search for digital asset: ${error instanceof Error ? error.message : String(error)}`,
            source: 'MC2 API Error'
          };
        }
      }
    );

    // Address analysis tool
    const searchAddress = this.createAPITool(
      'Analyze blockchain addresses for transactions and balances',
      z.object({
        address: z.string().describe('Blockchain address to analyze')
      }),
      async ({ address }: { address: string }) => {
        console.log(`🔗 MCP Tool: Analyzing address: ${address}`);
        try {
          const addressAnalysis = await this.mc2ApiClient.analyzeAddress(address);
          return {
            address,
            analysis: addressAnalysis,
            source: 'MC2 Address Analysis API'
          };
        } catch (error) {
          console.error(`Error analyzing address:`, error);
          return {
            address,
            error: `Failed to analyze address: ${error instanceof Error ? error.message : String(error)}`,
            source: 'MC2 API Error'
          };
        }
      }
    );

    // DeFi yield tools using MCP with API fallback
    const getStablecoinYieldData = tool({
      description: 'Get current stablecoin yield opportunities and APY rates',
      inputSchema: z.object({
        risk_level: z.enum(['low', 'medium', 'high']).optional().describe('Risk tolerance level for yield strategies')
      }),
      execute: async ({ risk_level = 'medium' }: { risk_level?: 'low' | 'medium' | 'high' }) => {
        console.log(`💰 MCP Tool: Getting stablecoin yield data for risk level: ${risk_level}`);
        return await this.executeMCPToolWithFallback(
          'getStablecoinYieldData',
          { risk_level },
          `stablecoin yield ${risk_level} risk`,
          'opportunities'
        );
      }
    });

    const getTopApyVaults = tool({
      description: 'Get highest APY vaults across different protocols',
      inputSchema: z.object({
        limit: z.number().optional().describe('Maximum number of vaults to return (default: 10)')
      }),
      execute: async ({ limit = 10 }: { limit?: number }) => {
        console.log(`📈 MCP Tool: Getting top ${limit} APY vaults`);
        const result = await this.executeMCPToolWithFallback(
          'getTopApyVaults',
          { limit },
          'high APY vaults yield farming',
          'vaults'
        );
        // Limit results if using API fallback
        if (result.source.includes('Fallback') && result.vaults.length > limit) {
          result.vaults = result.vaults.slice(0, limit);
        }
        return result;
      }
    });

    const getYieldFarmingOpportunities = tool({
      description: 'Find yield farming opportunities and strategies',
      inputSchema: z.object({
        token: z.string().optional().describe('Token to find farming opportunities for'),
        amount: z.number().optional().describe('Amount of tokens to farm')
      }),
      execute: async ({ token, amount }: { token?: string; amount?: number }) => {
        console.log(`🌾 MCP Tool: Finding yield farming opportunities for token: ${token}, amount: ${amount}`);
        const searchQuery = `yield farming ${token || ''} ${amount ? `amount ${amount}` : ''}`.trim();
        return await this.executeMCPToolWithFallback(
          'getYieldFarmingOpportunities',
          { token, amount },
          searchQuery,
          'opportunities'
        );
      }
    });

    const tools = {
      searchTokens,
      searchDigitalAsset,
      searchAddress,
      getStablecoinYieldData,
      getTopApyVaults,
      getYieldFarmingOpportunities
    };

    console.log(`MCP Tool Manager: Returning ${Object.keys(tools).length} tools`);
    return tools;
  }
}