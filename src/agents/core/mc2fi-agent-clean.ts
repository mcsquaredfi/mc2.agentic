import { AIChatAgent } from "agents/ai-chat-agent";
import type { Connection, WSMessage, AgentContext } from "agents";
import type { StreamTextOnFinishCallback, ToolSet } from "ai";
import type { Env } from "../types";
import { MCPManager } from "./mcp-manager";
import { AIProcessor } from "./ai-processor";
import { MCPTester } from "../testing/mcp-tester";
import { DebugLogger } from "../testing/debug-logger";
import { getTools } from "../tools";

export class Mc2fiChatAgent extends AIChatAgent<Env> {
  protected mcpManager: MCPManager;
  protected aiProcessor: AIProcessor;
  protected mcpTester: MCPTester;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.mcpManager = new MCPManager(env);
    this.aiProcessor = new AIProcessor();
    this.mcpTester = new MCPTester(this.mcpManager);
  }

  async onStart(): Promise<void> {
    await this.mcpManager.initialize();
  }

  async onMessage(connection: Connection, message: WSMessage) {
    console.log(`Agent ${this.name || "unknown"}: received message:`, message);
    
    if (typeof message === 'string') {
      try {
        const data = JSON.parse(message);
        if (data.type === "chat") {
          // Check for test command
          if (data.content === "test mcp") {
            await this.mcpTester.runFullTest(connection);
            return;
          }

          // Add user message to the conversation
          const userMessage = {
            id: Date.now().toString(),
            role: "user" as const,
            parts: [{ type: "text" as const, text: data.content }],
          };
          
          this.messages.push(userMessage);
          
          // Process the message through the AI system
          try {
            const response = await this.processMessageWithAI(data.content);
            
            // Add AI response to conversation
            const aiMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant" as const,
              parts: [{ type: "text" as const, text: response }],
            };
            
            this.messages.push(aiMessage);
            
            // Send response back to client
            connection.send(JSON.stringify({
              type: "response",
              content: response,
              timestamp: Date.now(),
            }));
          } catch (aiError) {
            console.error("Error processing message with AI:", aiError);
            connection.send(JSON.stringify({
              type: "error",
              content: "Error processing message with AI",
              timestamp: Date.now(),
            }));
          }
        }
      } catch (error) {
        console.error("Error parsing message:", error);
        connection.send(JSON.stringify({
          type: "error",
          content: "Error parsing message",
          timestamp: Date.now(),
        }));
      }
    }
  }

  private async processMessageWithAI(userMessage: string): Promise<string> {
    try {
      // Get base tools
      const baseTools = getTools(this.env);
      
      // Get MCP tools
      const mcpTools = this.mcpManager.getTools();
      
      // Combine tools
      const tools = { ...baseTools, ...mcpTools };
      
      DebugLogger.info("Total tools available:", Object.keys(tools));
      
      // Process with AI
      const result = await this.aiProcessor.processMessage(
        this.messages,
        tools,
        this.env
      );
      
      return result.text;
    } catch (error) {
      console.error("Error in processMessageWithAI:", error);
      return "I'm sorry, there was an error processing your message.";
    }
  }

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>
  ): Promise<Response | undefined> {
    // This method is required by AIChatAgent but we're using onMessage instead
    return undefined;
  }
}
