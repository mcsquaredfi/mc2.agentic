import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import type { Env } from "../types";
import { BASE_COMPONENT_LIBRARY, COMPONENT_USAGE_GUIDELINES } from "../../components/base-component-library";

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
    })("gpt-4o-2024-11-20");
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
You are generating a React component that will be displayed in a chat interface. You have access to a comprehensive base component library for creating sophisticated yield data visualizations.

## AVAILABLE BASE COMPONENTS:
${Object.entries(BASE_COMPONENT_LIBRARY).map(([name, code]) => `### ${name}:\n\`\`\`jsx\n${code}\n\`\`\``).join('\n\n')}

## COMPONENT USAGE GUIDELINES:
${COMPONENT_USAGE_GUIDELINES}

## DESIGN SYSTEM RULES:
1. **Color Scheme**:
   - Primary accent: #F48120 (use for highlights, icons, important elements)
   - Background: bg-neutral-100 dark:bg-neutral-900 (for cards)
   - Text: text-neutral-900 dark:text-neutral-50 (primary text)
   - Muted text: text-muted-foreground (secondary text)
   - Borders: border-neutral-300 dark:border-neutral-800

2. **Component Styling**:
   - Use Tailwind CSS classes exclusively
   - Cards: "rounded-lg p-4 bg-neutral-100 dark:bg-neutral-900"
   - Buttons: Use existing Button component with proper variants
   - Consistent spacing: gap-2, gap-3, gap-4 for layouts
   - Rounded corners: rounded-md, rounded-lg

3. **Layout Patterns**:
   - Grid layouts: "grid grid-cols-2 gap-4" or "grid grid-cols-3 gap-3"
   - Flex layouts: "flex items-center gap-2"
   - Responsive: "max-w-md mx-auto" for centered content
   - Proper padding: p-3, p-4, p-6

4. **Typography**:
   - Headers: "text-lg font-semibold" or "text-xl font-bold"
   - Body: "text-sm" or "text-base"
   - Muted: "text-muted-foreground text-xs"
   - Proper hierarchy with consistent sizing

5. **Interactive Elements**:
   - Hover states: "hover:bg-neutral-200 dark:hover:bg-neutral-800"
   - Focus states: Use existing focus utilities
   - Transitions: "transition-colors duration-200"

6. **DeFi Specific Patterns**:
   - Price displays: Large, bold numbers with color coding
   - Charts: Use consistent card styling with proper padding
   - Token info: Grid layout with icon, name, price
   - Yield data: Highlighted percentages with proper formatting

## CURRENT CONTEXT:
User Message: "${context}"
Tool Results: ${JSON.stringify(toolResults, null, 2)}

## DATA EXTRACTION REQUIREMENTS:
1. Extract the actual data from toolResults and structure it as props
2. Look for arrays of data (vaults, tokens, strategies, etc.)
3. If toolResults contains search results, extract the data array
4. Structure props as: { vaults: [...], tokens: [...], or data: [...] }
5. The props should contain the actual data to display, not empty arrays

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
      
      const result = await generateObject({
        model,
        schema: UIComponentSchema,
        prompt,
      });

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
      throw new Error(`Failed to generate UI component: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
