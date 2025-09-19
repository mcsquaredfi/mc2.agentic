import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import type { Env } from "../types";
import { BASE_COMPONENT_LIBRARY, COMPONENT_USAGE_GUIDELINES } from "../../components/base-component-library";

// AI Elements integration (now available!)
const AI_ELEMENTS_AVAILABLE = true;

const UIComponentSchema = z.object({
  componentCode: z.string().describe('The React JSX component code'),
  props: z.record(z.any()).describe('Props to pass to the component'),
  explanation: z.string().describe('What this component displays'),
  componentType: z.enum(['chart', 'data-display', 'interactive', 'comparison']).describe('Type of component generated')
});

export class ComponentGenerator {
  private componentCache = new Map<string, any>();

  constructor(private env: Env) {}

  private getModel() {
    return createOpenAI({
      baseURL: "https://gateway.ai.cloudflare.com/v1/9e6fbc31e203e0af03a5f03a21368cf6/agents2/openai",
    })("gpt-4o-mini"); // Much faster model for UI generation
  }

  private generateCacheKey(toolResults: any[], context: string): string {
    // Create a cache key based on context and tool result types
    const toolTypes = toolResults.map(r => r.toolName).sort().join(',');
    const contextHash = context.toLowerCase().replace(/\s+/g, '_').substring(0, 50);
    
    // Include data structure in cache key for more specific caching
    const dataStructure = toolResults.map(r => {
      if (!r.result || r.result === null || r.result === undefined) {
        return 'empty';
      }
      if (Array.isArray(r.result)) {
        return `array_${r.result.length}`;
      }
      if (typeof r.result === 'object') {
        return `object_${Object.keys(r.result).length}`;
      }
      return 'primitive';
    }).sort().join('_');
    
    return `${contextHash}_${toolTypes}_${dataStructure}`;
  }

  async generateStyledComponent(
    toolResults: any[],
    context: string
  ): Promise<z.infer<typeof UIComponentSchema>> {
    const componentStartTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(toolResults, context);
    if (this.componentCache.has(cacheKey)) {
      const cachedTime = Date.now() - componentStartTime;
      console.log(`⚡ UI component served from cache in ${cachedTime}ms (key: ${cacheKey})`);
      return this.componentCache.get(cacheKey);
    }
    
    const model = this.getModel();
    
    console.log(`🎨 Starting UI component generation...`);
    console.log("🔧 ComponentGenerator: Processing tool results:", {
      toolResultsCount: toolResults.length,
      toolResults: toolResults,
      context: context,
      cacheKey: cacheKey
    });

    const prompt = `
You are generating a React component that will be displayed in a chat interface. Create a simple, effective data visualization.

## AVAILABLE BASE COMPONENTS (use these patterns):
- APYIndicator: <span className="text-green-500 font-bold">{value}%</span>
- RiskBadge: <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">{level}</span>
- TVLDisplay: <span className="text-blue-600 font-semibold">\${value.toLocaleString()}</span>
- Card: <div className="rounded-lg p-4 bg-neutral-100 dark:bg-neutral-900">

${AI_ELEMENTS_AVAILABLE ? `
## AI ELEMENTS COMPONENTS (preferred - use these!):
- Message: <Message from="assistant"><MessageContent><Response>Content</Response></MessageContent></Message>
- Actions: <Actions><Action onClick={handler}>Label</Action></Actions>
- Conversation: <Conversation><ConversationContent>...</ConversationContent></Conversation>
- Response: <Response>Formatted AI response content</Response>

## IMPORTANT: Always wrap AI responses in Message + MessageContent + Response components!
` : `
## NOTE: AI Elements not yet available - using base components
`}

## DESIGN SYSTEM (simplified):
- Colors: text-green-500 (positive), text-red-500 (negative), text-blue-600 (neutral)
- Cards: "rounded-lg p-4 bg-neutral-100 dark:bg-neutral-900"
- Layout: "grid grid-cols-2 gap-4" or "flex items-center gap-2"
- Typography: "text-lg font-semibold" for headers, "text-sm" for body
   - Yield data: Highlighted percentages with proper formatting

## CURRENT CONTEXT:
User Message: "${context}"
Tool Results: ${JSON.stringify(toolResults, null, 2)}

## DATA EXTRACTION:
- Extract data from toolResults and put in props
- Look for arrays in toolResults (vaults, tokens, etc.)
- Structure props as: { vaults: [...], tokens: [...], or data: [...] }

## REQUIREMENTS:
1. Generate a React component that displays the tool results effectively
2. Use the exact design system rules above
3. Make it look like it belongs in the existing chat interface
4. Include proper dark/light theme support
5. Use semantic HTML and accessibility attributes
6. Make it responsive and mobile-friendly
7. Focus on DeFi/crypto data visualization
8. CRITICAL: Extract and structure the actual data from toolResults as props

## MARKDOWN CONTENT GUIDELINES:
- Generate accompanying markdown content that works with collapsible sections
- Use ### 🔵 **Low-Risk**, ### 🟠 **Moderate-Risk**, ### 🔴 **High-Risk** headers
- Include comparison tables for yields and TVL
- Use **bold** for APY percentages, protocol names, and key metrics
- Add bullet points with **bold subheadings** for easy scanning
- Include **blockquotes** for important risk warnings
- Keep sections concise (2-3 paragraphs max)
- Use emojis strategically: 💰 for yields, ⚠️ for risks, 🚀 for opportunities

## COMPONENT GENERATION RULES:
- Always wrap content in a Card component
- Use consistent spacing and padding
- Include proper dark/light theme support
- Make components responsive
- Use semantic HTML elements
- Include proper accessibility attributes
- For price data: format as currency with proper color coding
- For percentages: show positive/negative with appropriate colors
- For token data: include icons, names, and key metrics
- For yield data: highlight APY/APR prominently

## OUTPUT FORMAT:
Return ONLY the JSX component code, no imports or exports.
Use Tailwind CSS classes that match the design system.
Wrap everything in a Card component with proper styling.
Use props for dynamic data.

## EXAMPLE PROPS STRUCTURE:
If toolResults contains vault data, structure props as:
{ "vaults": [{"name": "USDC-EURC sLP", "entity_name": "Beefy Finance", "apy_1d": 15.63, "liquidity_metrics": {"current_tvl": 2092794}, "website": "https://app.mc2.fi/strategies/..."}] }

If toolResults contains token data, structure props as:
{ "tokens": [{"name": "AERO", "symbol": "AERO", "price": 1.23, "change24h": 5.67, "marketCap": "100M"}] }

CRITICAL: Extract the actual data arrays from toolResults and put them in the props field!
`;

        try {
          const aiGenerationStart = Date.now();
          console.log(`🤖 Starting AI component generation...`);
          
          // Add timeout to prevent UI generation from taking too long
          const UI_GENERATION_TIMEOUT = 15000; // 15 seconds max
          
          const result = await Promise.race([
            generateObject({
              model,
              schema: UIComponentSchema,
              prompt,
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('UI generation timeout')), UI_GENERATION_TIMEOUT)
            )
          ]) as any;

      const aiGenerationTime = Date.now() - aiGenerationStart;
      const totalComponentTime = Date.now() - componentStartTime;

      console.log(`🎨 UI component generated in ${totalComponentTime}ms:`, {
        aiGeneration: `${aiGenerationTime}ms`,
        type: result.object.componentType,
        explanation: result.object.explanation,
        codeLength: result.object.componentCode.length,
        propsKeys: Object.keys(result.object.props || {}),
        propsData: result.object.props,
        cacheKey: cacheKey
      });

      // Cache the result for future use
      this.componentCache.set(cacheKey, result.object);
      console.log(`💾 UI component cached with key: ${cacheKey}`);

      return result.object;
        } catch (error) {
          const componentErrorTime = Date.now() - componentStartTime;
          console.error(`❌ Error generating UI component after ${componentErrorTime}ms:`, error);
          
          // Return a simple fallback component instead of throwing
          const fallbackComponent = {
            componentCode: `
<div className="rounded-lg p-4 bg-neutral-100 dark:bg-neutral-900 max-w-md mx-auto">
  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4">Data Analysis</h2>
  <div className="text-sm text-muted-foreground">
    <p>🔍 Analyzing data...</p>
    <p>📊 ${toolResults.length} tool result(s) received</p>
    <p>⚠️ UI generation took too long, showing simplified view</p>
  </div>
</div>`,
            props: { toolResults },
            explanation: "Fallback component due to UI generation timeout",
            componentType: "data-display" as const
          };
          
          console.log(`🔄 Returning fallback UI component after ${componentErrorTime}ms`);
          return fallbackComponent;
        }
  }
}
