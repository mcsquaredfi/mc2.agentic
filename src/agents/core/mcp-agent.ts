import { Agent } from "agents";
import type { Connection, WSMessage, AgentContext } from "agents";
import type { Env } from "../types";
import { MCPToolManager } from "./mcp-tool-manager";

export class MCPAgent extends Agent<Env> {
  private mcpToolManager: MCPToolManager;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.mcpToolManager = new MCPToolManager(env);
  }

  async onMessage(connection: Connection, message: WSMessage) {
    console.log(`MCP Agent ${this.name || "default"}: received message:`, message);
    
    if (typeof message === 'string') {
      try {
        const data = JSON.parse(message);
        
        if (data.type === "chat") {
          console.log(`Processing MCP chat message: ${data.content}`);
          
          // Stream MCP-optimized response
          await this.streamMCPResponse(connection, data.content);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
        connection.send(JSON.stringify({
          type: "error",
          content: "Error processing message",
          timestamp: Date.now(),
        }));
      }
    }
  }

  private async streamMCPResponse(connection: Connection, userMessage: string) {
    try {
      // Get MCP tools
      const tools = await this.mcpToolManager.getMCPTools();
      console.log(`Retrieved ${Object.keys(tools).length} MCP tools`);

      // Send initial response
      connection.send(JSON.stringify({
        type: "response_start",
        content: "Processing your request with MCP tools...",
        timestamp: Date.now(),
      }));

      // Simulate streaming response (will be replaced with real AI processing)
      const response = await this.generateMCPResponse(userMessage, tools);
      
      // Stream the response
      await this.streamResponse(connection, response);

      // Send completion
      connection.send(JSON.stringify({
        type: "response_complete",
        content: "Response completed",
        timestamp: Date.now(),
      }));

    } catch (error) {
      console.error("Error in streamMCPResponse:", error);
      connection.send(JSON.stringify({
        type: "error",
        content: "Error generating response",
        timestamp: Date.now(),
      }));
    }
  }

  private async generateMCPResponse(userMessage: string, tools: any): Promise<string> {
    // Simple response generation for now
    // This will be enhanced with real AI processing and tool usage
    
    const toolNames = Object.keys(tools);
    
    return `I received your message: "${userMessage}"

Available MCP tools: ${toolNames.join(', ')}

This is a focused MCP agent response. The system is working and ready for enhanced AI processing with tool integration.`;
  }

  private async streamResponse(connection: Connection, response: string) {
    // Simulate streaming by sending chunks
    const chunkSize = 10;
    
    for (let i = 0; i < response.length; i += chunkSize) {
      const chunk = response.slice(i, i + chunkSize);
      
      connection.send(JSON.stringify({
        type: "chunk",
        content: chunk,
        timestamp: Date.now(),
      }));

      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}