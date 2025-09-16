import { Mc2fiChatAgent } from './mc2fi-agent-clean';
import { ComponentGenerator } from './component-generator';
import type { Connection, WSMessage, AgentContext } from "agents";
import type { Env } from "../types";
import { getTools } from "../tools";
import { DebugLogger } from "../testing/debug-logger";

export class UIAwareMc2fiAgent extends Mc2fiChatAgent {
  private componentGenerator: ComponentGenerator;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.componentGenerator = new ComponentGenerator(env);
  }

  async onMessage(connection: Connection, message: WSMessage) {
    console.log(`UI-Aware Agent ${this.name || "unknown"}: received message:`, message);
    
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
          
          // Process the message with UI generation capabilities
          try {
            const result = await this.processMessageWithUI(data.content);
            
            // Add AI response to conversation
            const aiMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant" as const,
              parts: [{ type: "text" as const, text: result.text }],
            };
            
            this.messages.push(aiMessage);
            
            // Send enhanced response with UI component if generated
            const responseData: any = {
              type: "response",
              content: result.text,
              timestamp: Date.now(),
            };

            // Add UI component if generated
            if (result.uiComponent) {
              responseData.uiComponent = result.uiComponent;
              console.log("Generated UI component:", result.uiComponent.componentType);
            }
            
            connection.send(JSON.stringify(responseData));
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

  protected async processMessageWithUI(userMessage: string): Promise<{
    text: string;
    uiComponent?: any;
    toolCalls: any[];
    toolResults: any[];
  }> {
    try {
      // Get base tools
      const baseTools = getTools(this.env);
      
      // Get MCP tools
      const mcpTools = this.mcpManager.getTools();
      
      // Combine tools
      const tools = { ...baseTools, ...mcpTools };
      
      DebugLogger.info("Total tools available:", Object.keys(tools));
      
      // Prepare messages for AI processing
      const messagesForAI = [
        ...this.messages,
        { role: 'user', content: userMessage }
      ];
      
      console.log("Messages for AI:", { 
        totalMessages: messagesForAI.length, 
        lastMessage: userMessage 
      });
      
      // Process with AI (existing logic)
      const result = await this.aiProcessor.processMessage(
        messagesForAI,
        tools,
        this.env
      );
      
      // Generate UI component if appropriate
      if (this.shouldGenerateUI(result.toolResults, userMessage)) {
        console.log("Generating UI component for tool results:", result.toolResults.length);
        
        try {
          const uiComponent = await this.componentGenerator.generateStyledComponent(
            result.toolResults,
            userMessage
          );
          
          return {
            ...result,
            uiComponent
          };
        } catch (uiError) {
          console.error("Error generating UI component:", uiError);
          // Continue without UI component if generation fails
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error in processMessageWithUI:", error);
      return {
        text: "I'm sorry, there was an error processing your message.",
        toolCalls: [],
        toolResults: []
      };
    }
  }

  private shouldGenerateUI(toolResults: any[], userMessage: string): boolean {
    // Don't generate UI if no tool results
    if (!toolResults || toolResults.length === 0) {
      return false;
    }

    // UI triggers based on content
    const uiTriggers = [
      'price', 'token', 'yield', 'portfolio', 'chart', 'data',
      'analysis', 'comparison', 'stats', 'metrics', 'vault',
      'apy', 'apr', 'liquidity', 'volume', 'market cap'
    ];
    
    const messageLower = userMessage.toLowerCase();
    const hasUITrigger = uiTriggers.some(trigger => messageLower.includes(trigger));
    
    // Check if tool results contain visualizable data
    const hasVisualizableData = toolResults.some(result => {
      const resultStr = JSON.stringify(result).toLowerCase();
      return uiTriggers.some(trigger => resultStr.includes(trigger)) ||
             // Check for common data structures
             (typeof result === 'object' && result !== null && 
              (Array.isArray(result) || Object.keys(result).length > 0));
    });
    
    const shouldGenerate = hasUITrigger || hasVisualizableData;
    console.log("UI Generation Decision:", {
      hasUITrigger,
      hasVisualizableData,
      shouldGenerate,
      toolResultsCount: toolResults.length
    });
    
    return shouldGenerate;
  }
}
