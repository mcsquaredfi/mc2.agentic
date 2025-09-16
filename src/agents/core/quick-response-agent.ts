import { UIAwareMc2fiAgent } from './ui-aware-agent';
import type { Connection, WSMessage, AgentContext } from "agents";
import type { Env } from "../types";
import { AIProcessor } from './ai-processor';

export class QuickResponseAgent extends UIAwareMc2fiAgent {
  private pendingRequests = new Map<string, { startTime: number; userMessage: string }>();

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
  }

  async onMessage(connection: Connection, message: WSMessage) {
    try {
      // Handle WSMessage which can be string or object
      let data;
      if (typeof message === 'string') {
        data = JSON.parse(message);
      } else {
        console.log("Received non-string message:", message);
        return;
      }
      
      if (data.type === "chat") {
        const requestId = Date.now().toString();
        const startTime = Date.now();
        
        console.log(`🚀 New chat request received: ${requestId}`);
        
        // Send immediate quick response
        const quickResponseStart = Date.now();
        const quickResponse = await this.generateQuickResponse(data.content);
        const quickResponseTime = Date.now() - quickResponseStart;
        
        connection.send(JSON.stringify({
          type: "response",
          content: quickResponse,
          isQuickResponse: true,
          requestId,
          timestamp: Date.now(),
        }));

        console.log(`⚡ Quick response sent in ${quickResponseTime}ms, generating detailed response...`);

        // Generate detailed response in background
        this.generateDetailedResponse(connection, requestId, data.content, startTime);
      }
    } catch (error) {
      console.error("Error in QuickResponseAgent:", error);
      connection.send(JSON.stringify({
        type: "error",
        content: "Sorry, I encountered an error processing your request.",
        timestamp: Date.now(),
      }));
    }
  }

  private async generateQuickResponse(userMessage: string): Promise<string> {
    // Generate a brief, immediate response
    const quickPrompt = `
User asked: "${userMessage}"

Generate a brief, helpful response (2-3 sentences max) that:
1. Acknowledges their question with enthusiasm
2. Provides a quick insight or general direction
3. Mentions that detailed analysis is coming

Keep it conversational and encouraging. Focus on the main topic they're asking about.
Use markdown formatting: **bold** for emphasis, emojis for engagement.

Examples:
- "Great question! **Yield strategies** can offer 5-40% APY depending on risk tolerance. I'm analyzing current opportunities for you! 🚀"
- "Excellent! **Stablecoin yields** are particularly attractive right now. Let me find the best current rates! 💰"
`;

    try {
      const aiProcessor = new AIProcessor();
      const messages = [{ role: 'user', content: quickPrompt }];
      const result = await aiProcessor.processMessage(messages, {} as any, this.env);
      return result.text;
    } catch (error) {
      return "Great question! I'm analyzing that for you and will provide detailed insights shortly. 🤔";
    }
  }

  private async generateDetailedResponse(
    connection: Connection, 
    requestId: string, 
    userMessage: string, 
    startTime: number
  ) {
    try {
      // Remove from pending requests
      this.pendingRequests.delete(requestId);
      
      console.log(`🚀 Starting detailed response generation for request ${requestId}`);
      
      // Generate full detailed response with UI
      const result = await this.processMessageWithUI(userMessage);
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      // Send detailed response with timing info
      connection.send(JSON.stringify({
        type: "response",
        content: result.text,
        uiComponent: result.uiComponent,
        isQuickResponse: false,
        requestId,
        processingTimeMs: processingTime,
        timestamp: Date.now(),
      }));

      // Log performance metrics
      console.log(`📊 Total response generated in ${processingTime}ms for request ${requestId}`);
      
    } catch (error) {
      const errorProcessingTime = Date.now() - startTime;
      console.error(`❌ Error generating detailed response after ${errorProcessingTime}ms:`, error);
      connection.send(JSON.stringify({
        type: "error",
        content: "I encountered an issue generating the detailed response. Please try again.",
        requestId,
        timestamp: Date.now(),
      }));
    }
  }

  // Override to add timing measurements
  protected async processMessageWithUI(userMessage: string) {
    const uiStartTime = Date.now();
    console.log(`🚀 Starting UI generation process...`);
    
    try {
      const result = await super.processMessageWithUI(userMessage);
      
      const uiProcessingTime = Date.now() - uiStartTime;
      console.log(`⚡ UI generation completed in ${uiProcessingTime}ms`);
      
      return result;
    } catch (error) {
      const uiProcessingTime = Date.now() - uiStartTime;
      console.error(`❌ UI generation failed after ${uiProcessingTime}ms:`, error);
      throw error;
    }
  }
}
