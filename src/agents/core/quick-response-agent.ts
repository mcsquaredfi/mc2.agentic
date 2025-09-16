import { UIAwareMc2fiAgent } from './ui-aware-agent';
import type { Connection, WSMessage, AgentContext } from "agents";
import type { Env } from "../types";
import { AIProcessor } from './ai-processor';
import { ToolCacheManager } from './tool-cache-manager';

export class QuickResponseAgent extends UIAwareMc2fiAgent {
  private pendingRequests = new Map<string, { startTime: number; userMessage: string; preWarmPromises?: Map<string, Promise<any>> }>();
  private toolCacheManager: ToolCacheManager;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.toolCacheManager = new ToolCacheManager(env);
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
        
        // Start pre-warming tool calls immediately
        const preWarmStart = Date.now();
        const preWarmPromises = await this.toolCacheManager.preWarmToolCalls(data.content);
        const preWarmTime = Date.now() - preWarmStart;
        
        console.log(`🚀 Tool pre-warming started in ${preWarmTime}ms`);
        
        // Store pre-warm promises for later use
        this.pendingRequests.set(requestId, { 
          startTime, 
          userMessage: data.content, 
          preWarmPromises 
        });
        
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

        // Generate detailed response in background (with pre-warmed tools)
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
3. Mentions that you're gathering real-time data with tools

Keep it conversational and encouraging. Focus on the main topic they're asking about.
Use markdown formatting: **bold** for emphasis, emojis for engagement.

Examples:
- "Great question! **Yield strategies** can offer 5-40% APY depending on risk tolerance. I'm gathering current market data for you! 🚀"
- "Excellent! **Stablecoin yields** are particularly attractive right now. Let me fetch the latest rates and opportunities! 💰"
- "Perfect timing! I'm pulling real-time **DeFi data** to show you the best current opportunities. 🔍"
`;

    try {
      const aiProcessor = new AIProcessor();
      const messages = [{ role: 'user', content: quickPrompt }];
      const result = await aiProcessor.processMessage(messages, {} as any, this.env);
      return result.text;
    } catch (error) {
      return "Great question! I'm gathering real-time data for you and will provide detailed insights shortly. 🤔";
    }
  }

  private async generateDetailedResponse(
    connection: Connection, 
    requestId: string, 
    userMessage: string, 
    startTime: number
  ) {
    try {
      // Get pre-warmed tool results
      const pendingRequest = this.pendingRequests.get(requestId);
      const preWarmPromises = pendingRequest?.preWarmPromises;
      
      if (preWarmPromises && preWarmPromises.size > 0) {
        console.log(`🔄 Waiting for ${preWarmPromises.size} pre-warmed tool results...`);
        const preWarmedResults = await this.toolCacheManager.getPreWarmedResults(preWarmPromises);
        console.log(`✅ Retrieved ${preWarmedResults.size} pre-warmed results`);
      }
      
      // Remove from pending requests
      this.pendingRequests.delete(requestId);
      
      console.log(`🚀 Starting detailed response generation for request ${requestId}`);
      
      // Generate full detailed response with UI (will use cached tool results)
      let result = await this.processMessageWithUI(userMessage);
      
      // If no tools were called or results are empty, force a follow-up call
      if (!result.toolCalls || result.toolCalls.length === 0 || 
          !result.toolResults || result.toolResults.length === 0 ||
          result.toolResults.every(r => !r.result || r.result === null || r.result === undefined)) {
        
        console.log(`🔄 No tools used or empty results, forcing follow-up call...`);
        
        // Make a follow-up call that explicitly requires tool usage
        const followUpPrompt = `The previous response didn't use any tools or returned empty results. 
        You MUST use the available tools to gather real-time data for this query: "${userMessage}"
        
        Available tools:
        - searchTokens: Search for token information
        - searchDigitalAsset: Search for digital asset information
        - searchAddress: Analyze blockchain addresses
        - getStablecoinYieldData: Get stablecoin yield opportunities
        - getTopApyVaults: Get highest APY vaults
        - getYieldFarmingOpportunities: Find yield farming opportunities
        
        Use at least one of these tools to provide current, specific data.`;
        
        const followUpResult = await this.processMessageWithUI(followUpPrompt);
        
        // Use the follow-up result if it has better data
        if (followUpResult.toolCalls && followUpResult.toolCalls.length > 0) {
          console.log(`✅ Follow-up call succeeded with ${followUpResult.toolCalls.length} tool calls`);
          result = followUpResult;
        }
      }
      
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
