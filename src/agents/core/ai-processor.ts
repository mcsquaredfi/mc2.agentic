import { streamText, convertToModelMessages, type ToolSet } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { Env } from "../types";
import { systemPrompt } from "../system-prompt";

export class AIProcessor {
  private getModel(env: Env) {
    return createOpenAI({
      baseURL: "https://gateway.ai.cloudflare.com/v1/9e6fbc31e203e0af03a5f03a21368cf6/agents2/openai",
    })("gpt-4o-2024-11-20");
  }

  async processMessage(
    messages: any[],
    tools: ToolSet,
    env: Env
  ): Promise<{ text: string; toolCalls: any[]; toolResults: any[] }> {
    const model = this.getModel(env);
    // Convert messages to proper format
    const coreMessages = messages.map(msg => {
      if (typeof msg === 'string') {
        return { role: 'user', content: msg };
      }
      return msg;
    });
    
    console.log("Processing messages:", { messageCount: coreMessages.length, messages: coreMessages });
    
    // Validate we have messages
    if (coreMessages.length === 0) {
      throw new Error("No messages provided to AIProcessor");
    }
    
    const enhancedPrompt = systemPrompt + `
IMPORTANT: When users ask about yield strategies, stablecoin opportunities, or DeFi data, you MUST use the available tools to gather real-time data before providing your response. Do not provide generic advice - always use the tools to get current market data and specific opportunities.

Available tools for yield strategies:
- getStablecoinYieldData: Get current stablecoin yield opportunities
- getStableYieldVaults: Find stablecoin yield vaults
- getTopApyVaults: Get highest APY vaults
- getYieldFarmingOpportunities: Find yield farming opportunities
- searchVaults: Search for specific vaults
- getVaultsByRiskScore: Find vaults by risk level

Always use these tools when discussing yield strategies to provide accurate, current data.

**RESPONSE FORMATTING REQUIREMENTS:**
- Structure your response with clear markdown headers using ### for main sections
- Use risk-level headers: ### 🔵 **Low-Risk Strategies**, ### 🟠 **Moderate-Risk Strategies**, ### 🔴 **High-Risk Strategies**
- Include comparison tables for yields, TVL, and risk metrics
- Use bullet points with **bold subheadings** for easy scanning
- Add **blockquotes** for important risk warnings
- Keep each section concise (2-3 paragraphs max)
- Use emojis strategically for visual appeal
- Include specific APY percentages, TVL amounts, and protocol names in **bold**
- End with a clear call-to-action or next steps`;

    const result = await streamText({
      model: model as any,
      system: enhancedPrompt,
      messages: coreMessages,
      tools,
      onFinish: async (result) => {
        const toolCalls = await result.toolCalls;
        const toolResults = await result.toolResults;
        
        console.info("AI model finished:", {
          finishReason: result.finishReason,
          usage: result.usage,
          toolCalls: toolCalls?.length || 0,
          toolResults: toolResults?.length || 0
        });
        
        if (toolCalls && toolCalls.length > 0) {
          console.info("Tool calls made:", toolCalls.map((call: any) => ({
            toolName: call.toolName,
            args: call.args
          })));
        }
        
        if (toolResults && toolResults.length > 0) {
          console.info("Tool results received:", toolResults.map((result: any) => ({
            toolCallId: result.toolCallId,
            resultType: typeof result.result,
            resultLength: result.result ? JSON.stringify(result.result).length : 0,
            resultPreview: result.result ? JSON.stringify(result.result).substring(0, 200) : "null/undefined"
          })));
        }
      },
      onError: (error) => {
        console.error("AI model error:", error);
      }
    });
    
    const { text, toolCalls, toolResults } = await result;
    let finalText = await text;
    const toolCallsArray = await toolCalls;
    const toolResultsArray = await toolResults;
    
    // If no text response but tool calls were made, make a follow-up call
    if ((!finalText || finalText.trim() === "") && toolCallsArray && toolCallsArray.length > 0) {
      console.info("Model made tool calls but no final response, making follow-up call...");
      
      const followUpMessages = [
        ...coreMessages,
        {
          role: "assistant" as const,
          content: "I've gathered the data using the available tools. Let me provide you with a comprehensive analysis."
        }
      ];
      
      const followUpResult = await streamText({
        model: model as any,
        system: systemPrompt + "\n\nBased on the tool results above, provide a comprehensive analysis and recommendations.",
        messages: followUpMessages,
        tools: {},
      });
      
      const { text: followUpText } = await followUpResult;
      finalText = await followUpText;
    }
    
    return {
      text: finalText || "I'm sorry, I couldn't generate a response.",
      toolCalls: toolCallsArray || [],
      toolResults: toolResultsArray || []
    };
  }
}
