import { Agent } from "agents";
import type { Connection, WSMessage, AgentContext } from "agents";
import type { Env } from "../types";
import { MCPClientManager } from "agents/mcp/client";
import { AIProcessor } from "./ai-processor";

export class SimpleMCPAgent extends Agent<Env> {
  private aiProcessor: AIProcessor;
  mcp = new MCPClientManager("MC2FI-MCP", "1.0.0");

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.aiProcessor = new AIProcessor();
  }

  async onStart() {
    // Initialize MCP server connection after the agent is fully initialized
    await this.initializeMCP();
  }

  private async initializeMCP() {
    if (this.env.MCP_HOST) {
      try {
        console.info("Initializing MCP server connection:", this.env.MCP_HOST);
        
        // Try SSE first as the primary connection method
        // The server advertises /mcp, /sse, and /sse/message endpoints
        const sseEndpoint = `${this.env.MCP_HOST}/sse`;
        console.info("Connecting to SSE endpoint (primary):", sseEndpoint);
        
        await this.mcp.connect(sseEndpoint);
        
        console.info("MCP server connected successfully via SSE");
        console.log("Available MCP servers:", this.getMcpServers());
        
        // Check if tools are available
        const tools = this.mcp.getAITools();
        console.log("Available MCP tools:", Object.keys(tools));
        
      } catch (error) {
        console.warn("Failed to connect to SSE endpoint, trying Streamable HTTP:", error);
        
        // Fallback to Streamable HTTP endpoint
        try {
          const mcpEndpoint = `${this.env.MCP_HOST}/mcp`;
          console.info("Trying Streamable HTTP endpoint:", mcpEndpoint);
          
          await this.mcp.connect(mcpEndpoint);
          
          console.info("MCP server connected successfully via Streamable HTTP");
          console.log("Available MCP servers:", this.getMcpServers());
          
          // Check if tools are available
          const tools = this.mcp.getAITools();
          console.log("Available MCP tools:", Object.keys(tools));
          
        } catch (mcpError) {
          console.warn("Failed to connect to Streamable HTTP endpoint as well:", mcpError);
          console.warn("Will continue without MCP tools, falling back to API calls");
        }
      }
    } else {
      console.info("No MCP_HOST configured, running without MCP tools");
    }
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle AI SDK requests
    if (url.pathname.includes('/get-messages')) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle MCP server management
    if (url.pathname.endsWith('/add-mcp') && request.method === 'POST') {
      try {
        const mcpServer = (await request.json()) as { url: string; name: string };
        
        // Try SSE first, then fallback to /mcp
        try {
          const sseUrl = mcpServer.url.endsWith('/sse') ? mcpServer.url : `${mcpServer.url}/sse`;
          await this.mcp.connect(sseUrl);
          return new Response("MCP server connected successfully via SSE", { status: 200 });
        } catch (sseError) {
          const mcpUrl = mcpServer.url.endsWith('/mcp') ? mcpServer.url : `${mcpServer.url}/mcp`;
          await this.mcp.connect(mcpUrl);
          return new Response("MCP server connected successfully via Streamable HTTP", { status: 200 });
        }
      } catch (error) {
        return new Response(`Error connecting to MCP server: ${error}`, { status: 500 });
      }
    }

    // Handle MCP server status
    if (url.pathname.endsWith('/mcp-status')) {
      return new Response(JSON.stringify({
        servers: this.getMcpServers(),
        tools: Object.keys(this.mcp.getAITools())
      }), {
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
          // Send initial response
          connection.send(JSON.stringify({
            type: "response_start",
            content: "Processing your request with MCP tools...",
            timestamp: Date.now(),
          }));

          // Get MCP tools directly from the client manager
          // Ensure MCP is initialized if not already done
          if (Object.keys(this.mcp.getAITools()).length === 0 && this.env.MCP_HOST) {
            console.log("MCP tools not available, attempting to initialize...");
            await this.initializeMCP();
          }
          
          const mcpTools = this.mcp.getAITools();
          console.log("Available MCP tools:", Object.keys(mcpTools));
          
          // Validate that MCP tools are properly formatted for AI SDK
          if (Object.keys(mcpTools).length === 0) {
            console.warn("No MCP tools available, processing without tools");
            const result = await this.aiProcessor.processMessage(
              [{ role: 'user', content: data.content }],
              {}, // Empty tools object
              this.env
            );
            
            // Send the final response
            connection.send(JSON.stringify({
              type: "response",
              content: result.text,
              timestamp: Date.now(),
            }));
            return;
          }
          
          // Process with existing AIProcessor
          console.log("Processing with MCP tools:", Object.keys(mcpTools));
          const result = await this.aiProcessor.processMessage(
            [{ role: 'user', content: data.content }],
            mcpTools as any, // Cast to bypass AI SDK version mismatch
            this.env
          );
          
          // Log tool execution results for debugging
          if (result.toolCalls && result.toolCalls.length > 0) {
            console.log("🔧 Tool calls made:", result.toolCalls.map(call => ({
              toolName: call.toolName,
              args: call.args
            })));
          }
          
          if (result.toolResults && result.toolResults.length > 0) {
            console.log("📊 Tool results received:", result.toolResults.map(result => ({
              toolCallId: result.toolCallId,
              toolName: result.toolName,
              resultPreview: result.result ? JSON.stringify(result.result).substring(0, 100) : "null"
            })));
          }

          // Send the final response
          connection.send(JSON.stringify({
            type: "response",
            content: result.text,
            timestamp: Date.now(),
          }));

          // Send completion signal
          connection.send(JSON.stringify({
            type: "response_complete",
            content: "Response completed",
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
