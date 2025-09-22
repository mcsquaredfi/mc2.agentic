import { Agent } from "agents";
import type { Connection, WSMessage, AgentContext } from "agents";
import type { Env } from "../types";
import { AIProcessor } from "./ai-processor";
import { MCPToolManager } from "./mcp-tool-manager";

export class SimpleMCPAgent extends Agent<Env> {
  private aiProcessor: AIProcessor;
  private mcpToolManager: MCPToolManager;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.aiProcessor = new AIProcessor();
    this.mcpToolManager = new MCPToolManager(env);
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle AI SDK requests
    if (url.pathname.includes('/get-messages')) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Simple MCP Agent is running', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message === 'string') {
      const data = JSON.parse(message);
      
      if (data.type === "chat") {
        console.log(`Simple MCP Agent: processing "${data.content}"`);
        
        try {
          // Get MCP tools
          const tools = await this.mcpToolManager.getMCPTools();
          
          // Process with existing AIProcessor
          const result = await this.aiProcessor.processMessage(
            [{ role: 'user', content: data.content }],
            tools,
            this.env
          );

          // Send simple response
          connection.send(JSON.stringify({
            type: "response",
            content: result.text,
            timestamp: Date.now(),
          }));

        } catch (error) {
          console.error("Error processing message:", error);
          connection.send(JSON.stringify({
            type: "error",
            content: "Error processing your request",
            timestamp: Date.now(),
          }));
        }
      }
    }
  }
}
