import { MCPClientManager } from "agents/mcp/client";
import type { Env } from "../types";

export class MCPManager {
  private mcp = new MCPClientManager("MC2FI-MCP", "1.0.0");
  private mcpConnected = false;
  private connectionType: 'sse' | 'http' | null = null;

  constructor(private env: Env) {}

  async initialize(): Promise<void> {
    if (!this.env.MCP_HOST) {
      console.info("No MCP_HOST configured, running without MCP tools");
      return;
    }

    try {
      console.info("Connecting to MCP server:", this.env.MCP_HOST);
      
      // Try SSE connection first for real-time streaming
      const sseEndpoint = `${this.env.MCP_HOST}/sse`;
      console.info("Trying SSE connection to:", sseEndpoint);
      
      // For SSE, we need to use a different approach since MCPClientManager
      // seems to be POSTing instead of GETting for SSE endpoints
      // Let's try the /sse/message endpoint which might be more compatible
      const sseMessageEndpoint = `${this.env.MCP_HOST}/sse/message`;
      console.info("Trying SSE message endpoint:", sseMessageEndpoint);
      
      await this.mcp.connect(sseMessageEndpoint);
      
      this.mcpConnected = true;
      this.connectionType = 'sse';
      console.info("MC2FI-MCP@1.0.0 server connected via SSE");
      
    } catch (error) {
      console.warn("SSE connection failed, trying Streamable HTTP:", error);
      
      // Fallback to Streamable HTTP if SSE fails
      try {
        const streamableEndpoint = `${this.env.MCP_HOST}/mcp`;
        console.info("Trying Streamable HTTP endpoint:", streamableEndpoint);
        
        await this.mcp.connect(streamableEndpoint);
        
        this.mcpConnected = true;
        this.connectionType = 'http';
        console.info("MC2FI-MCP@1.0.0 server connected via Streamable HTTP");
        
      } catch (fallbackError) {
        console.error("All connection attempts failed:", fallbackError);
        this.mcpConnected = false;
        this.connectionType = null;
      }
    }
  }

  isConnected(): boolean {
    return this.mcpConnected;
  }

  getConnectionType(): 'sse' | 'http' | null {
    return this.connectionType;
  }

  getTools(): Record<string, any> {
    if (!this.mcpConnected) {
      console.warn("MCP not connected, returning empty tools");
      return {};
    }

    try {
      const tools = this.mcp.getAITools();
      console.log("MCP tools retrieved:", Object.keys(tools));
      return tools;
    } catch (error) {
      console.error("Error getting MCP tools:", error);
      this.mcpConnected = false;
      return {};
    }
  }

  async testTool(toolName: string, args: any): Promise<any> {
    if (!this.mcpConnected) {
      throw new Error("MCP not connected");
    }

    const tools = this.getTools();
    const tool = tools[toolName];
    
    if (!tool || typeof tool.execute !== 'function') {
      throw new Error(`Tool ${toolName} not found or not executable`);
    }

    return await tool.execute(args);
  }
}
