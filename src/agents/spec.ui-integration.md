# AI-Generated UI Integration with Existing Design System

## Current Design System Analysis

### Key Design Elements
- **Color Scheme**: 
  - Primary accent: `#F48120` (orange)
  - Neutral grays with dark/light theme support
  - Custom CSS variables for consistent theming
- **Component Style**: 
  - Rounded corners (`rounded-md`, `rounded-lg`)
  - Subtle shadows and borders
  - Consistent padding and spacing
- **Layout**: 
  - Chat interface with message bubbles
  - Cards with `bg-neutral-100 dark:bg-neutral-900`
  - Responsive design with proper spacing

### Existing Components
- `Card` with variants: primary, secondary, ghost, destructive
- `Button` with sizes: sm, md, base, lg and shapes: square, circular
- Consistent typography and spacing
- Dark/light theme support

## AI Generation Prompt Strategy

### Style Guidelines for AI
```typescript
const UI_GENERATION_PROMPT = `
You are generating React components that must match this exact design system:

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

## COMPONENT GENERATION RULES:
- Always wrap content in a Card component
- Use consistent spacing and padding
- Include proper dark/light theme support
- Make components responsive
- Use semantic HTML elements
- Include proper accessibility attributes

Generate components that look like they belong in this chat interface.
`;
```

## Enhanced Agent Implementation

### 1. UI-Aware Agent with Style Context
```typescript
// src/agents/core/ui-aware-agent.ts
export class UIAwareMc2fiAgent extends Mc2fiChatAgent {
  private componentGenerator: ComponentGenerator;

  async processMessageWithUI(userMessage: string): Promise<{
    text: string;
    uiComponent?: GeneratedComponent;
    toolCalls: any[];
    toolResults: any[];
  }> {
    // Process with existing tools
    const result = await this.processMessageWithAI(userMessage);
    
    // Generate UI component if tool results contain visualizable data
    if (this.shouldGenerateUI(result.toolResults, userMessage)) {
      const uiComponent = await this.componentGenerator.generateStyledComponent(
        result.toolResults,
        userMessage,
        this.getStyleContext()
      );
      
      return {
        ...result,
        uiComponent
      };
    }
    
    return result;
  }

  private shouldGenerateUI(toolResults: any[], userMessage: string): boolean {
    // Generate UI for specific data types
    const uiTriggers = [
      'price', 'token', 'yield', 'portfolio', 'chart', 'data',
      'analysis', 'comparison', 'stats', 'metrics'
    ];
    
    return uiTriggers.some(trigger => 
      userMessage.toLowerCase().includes(trigger) ||
      toolResults.some(result => 
        JSON.stringify(result).toLowerCase().includes(trigger)
      )
    );
  }

  private getStyleContext(): StyleContext {
    return {
      theme: 'dark', // Could be dynamic based on user preference
      accentColor: '#F48120',
      designSystem: 'orbit-site', // Your design system name
      componentLibrary: ['Card', 'Button', 'Avatar'],
      spacing: 'consistent',
      typography: 'system-default'
    };
  }
}
```

### 2. Style-Aware Component Generator
```typescript
// src/agents/core/component-generator.ts
interface StyleContext {
  theme: 'dark' | 'light';
  accentColor: string;
  designSystem: string;
  componentLibrary: string[];
  spacing: string;
  typography: string;
}

export class ComponentGenerator {
  async generateStyledComponent(
    toolResults: any[],
    context: string,
    styleContext: StyleContext
  ): Promise<GeneratedComponent> {
    const prompt = `${UI_GENERATION_PROMPT}

## CURRENT CONTEXT:
User Message: "${context}"
Tool Results: ${JSON.stringify(toolResults, null, 2)}

## STYLE CONTEXT:
${JSON.stringify(styleContext, null, 2)}

## REQUIREMENTS:
1. Generate a React component that displays the tool results effectively
2. Use the exact design system rules above
3. Make it look like it belongs in the existing chat interface
4. Include proper dark/light theme support
5. Use semantic HTML and accessibility attributes
6. Make it responsive and mobile-friendly

## OUTPUT FORMAT:
Return ONLY the JSX component code, no imports or exports.
Use Tailwind CSS classes that match the design system.
Wrap everything in a Card component with proper styling.
`;

    const result = await generateObject({
      model: this.getModel(),
      schema: z.object({
        componentCode: z.string().describe('The React JSX component code'),
        props: z.record(z.any()).describe('Props to pass to the component'),
        explanation: z.string().describe('What this component displays'),
        componentType: z.enum(['chart', 'data-display', 'interactive', 'comparison']).describe('Type of component generated')
      }),
      prompt,
    });

    return result.object;
  }
}
```

## Frontend Integration

### 1. Enhanced Message Handling
```typescript
// src/app.tsx - Updated message handling
const handleAgentMessage = (message: any) => {
  try {
    const data = JSON.parse(message.data);
    
    if (data.type === "response") {
      // Handle text response
      const agentMessage = {
        id: Date.now().toString(),
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: data.content }],
      };
      setMessages(prev => [...prev, agentMessage]);
      
      // Handle generated UI component
      if (data.uiComponent) {
        setGeneratedComponents(prev => [...prev, {
          id: Date.now().toString(),
          component: data.uiComponent,
          messageId: agentMessage.id
        }]);
      }
    }
  } catch (error) {
    console.error("Error parsing agent message:", error);
  }
};
```

### 2. Styled Component Renderer
```typescript
// src/components/generative-ui/StyledComponentRenderer.tsx
import { Card } from "@/components/card/Card";
import { Button } from "@/components/button/Button";

interface GeneratedComponent {
  componentCode: string;
  props: Record<string, any>;
  explanation: string;
  componentType: string;
}

export function StyledComponentRenderer({ 
  component, 
  className = "" 
}: { 
  component: GeneratedComponent;
  className?: string;
}) {
  const [renderedComponent, setRenderedComponent] = useState<React.ReactNode>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      setIsLoading(true);
      
      // Create a safe execution context with your design system
      const safeContext = {
        React,
        Card,
        Button,
        // Add other components from your design system
        props: component.props,
        // Add utility functions
        formatPrice: (price: number) => `$${price.toLocaleString()}`,
        formatPercentage: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
        getChangeColor: (value: number) => value >= 0 ? 'text-green-600' : 'text-red-600',
      };
      
      // Execute the generated component
      const componentElement = executeGeneratedComponent(
        component.componentCode, 
        safeContext
      );
      
      setRenderedComponent(componentElement);
      setError(null);
    } catch (err) {
      setError(`Failed to render component: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [component]);

  if (isLoading) {
    return (
      <Card className={`p-4 bg-neutral-100 dark:bg-neutral-900 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-[#F48120] border-t-transparent rounded-full"></div>
          <span className="text-sm text-muted-foreground">Generating component...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-sm font-medium text-red-700 dark:text-red-300">Component Error</span>
        </div>
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>
        <details className="text-xs">
          <summary className="cursor-pointer text-red-600 dark:text-red-400">Show generated code</summary>
          <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs overflow-auto">
            {component.componentCode}
          </pre>
        </details>
      </Card>
    );
  }

  return (
    <div className={`generated-component ${className}`}>
      {renderedComponent}
    </div>
  );
}

// Safe component execution with your design system
function executeGeneratedComponent(code: string, context: any): React.ReactNode {
  // Sanitize the code
  const sanitizedCode = sanitizeGeneratedCode(code);
  
  // Create a function that has access to your design system
  const componentFunction = new Function(
    'React', 'Card', 'Button', 'props', 'formatPrice', 'formatPercentage', 'getChangeColor',
    `return ${sanitizedCode};`
  );
  
  return componentFunction(
    context.React,
    context.Card,
    context.Button,
    context.props,
    context.formatPrice,
    context.formatPercentage,
    context.getChangeColor
  );
}
```

### 3. Integration in Chat Interface
```typescript
// src/app.tsx - Add to message rendering
{agentMessages.map((m: Message, index: number) => {
  const isUser = m.role === "user";
  const showAvatar = index === 0 || agentMessages[index - 1]?.role !== m.role;

  return (
    <div key={m.id}>
      {/* Existing message rendering */}
      
      {/* Add generated component after assistant messages */}
      {!isUser && generatedComponents
        .filter(comp => comp.messageId === m.id)
        .map(comp => (
          <div className="flex justify-start mt-2">
            <div className="w-8" /> {/* Spacer for alignment */}
            <div className="max-w-[85%]">
              <StyledComponentRenderer 
                component={comp.component}
                className="mt-2"
              />
            </div>
          </div>
        ))
      }
    </div>
  );
})}
```

## Example Generated Components

### Token Price Display
```jsx
// AI would generate something like this:
<Card className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-10 h-10 bg-[#F48120]/10 rounded-full flex items-center justify-center">
      <span className="text-[#F48120] font-bold text-lg">A</span>
    </div>
    <div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">AERO</h3>
      <p className="text-sm text-muted-foreground">Base Chain</p>
    </div>
  </div>
  
  <div className="grid grid-cols-2 gap-4">
    <div>
      <p className="text-xs text-muted-foreground mb-1">Current Price</p>
      <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
        {formatPrice(props.currentPrice)}
      </p>
    </div>
    <div>
      <p className="text-xs text-muted-foreground mb-1">24h Change</p>
      <p className={`text-xl font-bold ${getChangeColor(props.change24h)}`}>
        {formatPercentage(props.change24h)}
      </p>
    </div>
  </div>
</Card>
```

### Yield Calculator
```jsx
<Card className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
  <div className="flex items-center gap-2 mb-4">
    <div className="w-6 h-6 bg-[#F48120]/10 rounded-full flex items-center justify-center">
      <span className="text-[#F48120] text-sm">📊</span>
    </div>
    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
      Yield Analysis
    </h3>
  </div>
  
  <div className="space-y-3">
    {props.vaults.map(vault => (
      <div key={vault.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-md">
        <div>
          <p className="font-medium text-neutral-900 dark:text-neutral-50">{vault.name}</p>
          <p className="text-sm text-muted-foreground">{vault.protocol}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[#F48120]">{vault.apy}% APY</p>
          <p className="text-xs text-muted-foreground">Risk: {vault.risk}</p>
        </div>
      </div>
    ))}
  </div>
</Card>
```

## Implementation Checklist

### Backend (Agent)
- [ ] Create `UIAwareMc2fiAgent` extending existing agent
- [ ] Implement `ComponentGenerator` with style context
- [ ] Add UI generation to message processing pipeline
- [ ] Update WebSocket message format for UI components

### Frontend
- [ ] Create `StyledComponentRenderer` component
- [ ] Add generated component state management
- [ ] Integrate with existing chat interface
- [ ] Add error handling and loading states
- [ ] Implement component sanitization

### Styling
- [ ] Ensure all generated components match design system
- [ ] Test dark/light theme compatibility
- [ ] Verify responsive design
- [ ] Add proper accessibility attributes

This approach ensures that AI-generated components will seamlessly integrate with your existing design system and look like they were built specifically for your application!
