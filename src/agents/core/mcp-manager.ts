import { MCPClientManager } from "agents/mcp/client";
import type { Env } from "../types";

export class MCPManager {
  private mcp = new MCPClientManager("MC2FI-MCP", "1.0.0");
  private mcpConnected = false;

  constructor(private env: Env) {}

  async initialize(): Promise<void> {
    if (!this.env.MCP_HOST) {
      console.info("No MCP_HOST configured, running without MCP tools");
      return;
    }

    try {
      console.info("Connecting to MCP server:", this.env.MCP_HOST);
      const possibleEndpoints = [
        `${this.env.MCP_HOST}/sse`,
        `${this.env.MCP_HOST}/mcp`,
        `${this.env.MCP_HOST}/`,
        this.env.MCP_HOST
      ];
      
      let connected = false;
      for (const endpoint of possibleEndpoints) {
        try {
          console.info("Trying MCP endpoint:", endpoint);
          await this.mcp.connect(endpoint);
          this.mcpConnected = true;
          console.info("MC2FI-MCP@1.0.0 server connected at:", endpoint);
          connected = true;
          break;
        } catch (endpointError) {
          console.warn(`Failed to connect to ${endpoint}:`, endpointError);
        }
      }
      
      if (!connected) {
        throw new Error("Failed to connect to any MCP endpoint");
      }
    } catch (error) {
      console.warn("MCP connection failed:", error);
      this.mcpConnected = false;
    }
  }

  isConnected(): boolean {
    return this.mcpConnected;
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
