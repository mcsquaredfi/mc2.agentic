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
    const totalStartTime = Date.now();
    const model = this.getModel(env);
    
    console.log(`🚀 AIProcessor starting message processing...`);
    
    // Convert messages to proper format
    const messageConversionStart = Date.now();
    const coreMessages = messages.map(msg => {
      if (typeof msg === 'string') {
        return { role: 'user', content: msg };
      }
      return msg;
    });
    const messageConversionTime = Date.now() - messageConversionStart;
    
    console.log(`📝 Message conversion completed in ${messageConversionTime}ms`, { messageCount: coreMessages.length });
    
    // Validate we have messages
    if (coreMessages.length === 0) {
      throw new Error("No messages provided to AIProcessor");
    }
    
    const enhancedPrompt = systemPrompt + `

🚨 CRITICAL INSTRUCTION: YOU MUST USE TOOLS FOR EVERY RESPONSE! 🚨

When users ask about yield strategies, stablecoin opportunities, DeFi data, tokens, or any financial information, you are REQUIRED to use the available tools to gather real-time data. Do NOT provide generic advice without using tools first.

**MANDATORY TOOL USAGE RULES:**
1. ALWAYS call at least one relevant tool before responding
2. If you don't use tools, your response will be considered incomplete
3. Use tools even for simple questions to provide current data
4. Combine multiple tools for comprehensive analysis

**AVAILABLE TOOLS (USE THEM!):**
- searchTokens: Search for token information and data
- searchDigitalAsset: Search for digital asset information  
- searchAddress: Analyze blockchain addresses
- getStablecoinYieldData: Get current stablecoin yield opportunities
- getStableYieldVaults: Find stablecoin yield vaults
- getTopApyVaults: Get highest APY vaults
- getYieldFarmingOpportunities: Find yield farming opportunities
- searchVaults: Search for specific vaults
- getVaultsByRiskScore: Find vaults by risk level

**EXAMPLE TOOL USAGE:**
User: "What's the best yield strategy?"
You: [MUST call getStablecoinYieldData, getTopApyVaults, and getYieldFarmingOpportunities tools first, then provide analysis based on results]

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

    const aiCallStart = Date.now();
    console.log(`🤖 Starting AI model call with ${Object.keys(tools).length} available tools:`, Object.keys(tools));
    
    const result = await streamText({
      model: model as any,
      system: enhancedPrompt,
      messages: coreMessages,
      tools,
      onFinish: async (result) => {
        const toolCalls = await result.toolCalls;
        const toolResults = await result.toolResults;
        const aiCallTime = Date.now() - aiCallStart;
        
        console.info(`🤖 AI model call completed in ${aiCallTime}ms:`, {
          finishReason: result.finishReason,
          usage: result.usage,
          toolCalls: toolCalls?.length || 0,
          toolResults: toolResults?.length || 0
        });
        
        if (toolCalls && toolCalls.length > 0) {
          console.info("🔧 Tool calls made:", toolCalls.map((call: any) => ({
            toolName: call.toolName,
            args: call.args
          })));
        }
        
        if (toolResults && toolResults.length > 0) {
          console.info("📊 Tool results received:", toolResults.map((result: any) => ({
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            resultType: typeof result.result,
            resultLength: result.result ? JSON.stringify(result.result).length : 0,
            resultPreview: result.result ? JSON.stringify(result.result).substring(0, 200) : "null/undefined",
            fullResult: result.result
          })));
        }
      },
      onError: (error) => {
        const aiCallTime = Date.now() - aiCallStart;
        console.error(`❌ AI model error after ${aiCallTime}ms:`, error);
      }
    });
    
    const resultProcessingStart = Date.now();
    const { text, toolCalls, toolResults } = await result;
    let finalText = await text;
    const toolCallsArray = await toolCalls;
    const toolResultsArray = await toolResults;
    const resultProcessingTime = Date.now() - resultProcessingStart;
    
        // If no text response but tool calls were made, make a follow-up call
        if ((!finalText || finalText.trim() === "") && toolCallsArray && toolCallsArray.length > 0) {
          const followUpStart = Date.now();
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
          const followUpTime = Date.now() - followUpStart;
          console.log(`🔄 Follow-up call completed in ${followUpTime}ms`);
        }
    
    const totalProcessingTime = Date.now() - totalStartTime;
    
    console.log(`📊 AIProcessor total processing completed in ${totalProcessingTime}ms:`, {
      messageConversion: `${messageConversionTime}ms`,
      aiCall: `${Date.now() - aiCallStart}ms`,
      resultProcessing: `${resultProcessingTime}ms`,
      textLength: finalText?.length || 0,
      toolCallsCount: toolCallsArray?.length || 0,
      toolResultsCount: toolResultsArray?.length || 0
    });
    
    return {
      text: finalText || "I'm sorry, I couldn't generate a response.",
      toolCalls: toolCallsArray || [],
      toolResults: toolResultsArray || []
    };
  }
}
