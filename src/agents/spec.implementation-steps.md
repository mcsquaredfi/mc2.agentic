# Step-by-Step Implementation Guide

## Phase 1: Backend Integration (Week 1-2)

### Step 1: Create UI-Aware Agent
```typescript
// src/agents/core/ui-aware-agent.ts
import { Mc2fiChatAgent } from './mc2fi-agent-clean';
import { ComponentGenerator } from './component-generator';

export class UIAwareMc2fiAgent extends Mc2fiChatAgent {
  private componentGenerator: ComponentGenerator;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.componentGenerator = new ComponentGenerator(env);
  }

  async onMessage(connection: Connection, message: WSMessage) {
    // ... existing message handling
    
    if (data.type === "chat") {
      const result = await this.processMessageWithUI(data.content);
      
      // Send enhanced response with UI component
      connection.send(JSON.stringify({
        type: "response",
        content: result.text,
        uiComponent: result.uiComponent,
        timestamp: Date.now(),
      }));
    }
  }

  private async processMessageWithUI(userMessage: string) {
    // Process with existing AI pipeline
    const result = await this.processMessageWithAI(userMessage);
    
    // Generate UI if appropriate
    if (this.shouldGenerateUI(result.toolResults, userMessage)) {
      const uiComponent = await this.componentGenerator.generateStyledComponent(
        result.toolResults,
        userMessage
      );
      result.uiComponent = uiComponent;
    }
    
    return result;
  }
}
```

### Step 2: Component Generator
```typescript
// src/agents/core/component-generator.ts
import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";

const UIComponentSchema = z.object({
  componentCode: z.string(),
  props: z.record(z.any()),
  explanation: z.string(),
  componentType: z.enum(['chart', 'data-display', 'interactive', 'comparison'])
});

export class ComponentGenerator {
  constructor(private env: Env) {}

  async generateStyledComponent(
    toolResults: any[],
    context: string
  ): Promise<z.infer<typeof UIComponentSchema>> {
    const model = createOpenAI({
      baseURL: "https://gateway.ai.cloudflare.com/v1/9e6fbc31e203e0af03a5f03a21368cf6/agents2/openai",
    })("gpt-4o-2024-11-20");

    const prompt = `
Generate a React component that displays this data in our chat interface:

Data: ${JSON.stringify(toolResults, null, 2)}
Context: ${context}

Design System Rules:
- Use Tailwind CSS classes
- Cards: "rounded-lg p-4 bg-neutral-100 dark:bg-neutral-900"
- Primary color: #F48120
- Text: "text-neutral-900 dark:text-neutral-50"
- Muted text: "text-muted-foreground"
- Consistent spacing and typography
- Make it look like it belongs in our chat interface

Return ONLY the JSX component code.
`;

    const result = await generateObject({
      model,
      schema: UIComponentSchema,
      prompt,
    });

    return result.object;
  }
}
```

### Step 3: Update Agent Export
```typescript
// src/agents/mc2fi-agent.ts
export { UIAwareMc2fiAgent as Mc2fiChatAgent } from "./core/ui-aware-agent";
```

## Phase 2: Frontend Integration (Week 3-4)

### Step 1: Component Renderer
```typescript
// src/components/generative-ui/ComponentRenderer.tsx
import { useState, useEffect } from "react";
import { Card } from "@/components/card/Card";
import { Button } from "@/components/button/Button";

interface GeneratedComponent {
  componentCode: string;
  props: Record<string, any>;
  explanation: string;
  componentType: string;
}

export function ComponentRenderer({ 
  component, 
  className = "" 
}: { 
  component: GeneratedComponent;
  className?: string;
}) {
  const [renderedComponent, setRenderedComponent] = useState<React.ReactNode>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Create safe execution context
      const safeContext = {
        React,
        Card,
        Button,
        props: component.props,
        // Utility functions for DeFi data
        formatPrice: (price: number) => `$${price.toLocaleString()}`,
        formatPercentage: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
        getChangeColor: (value: number) => value >= 0 ? 'text-green-600' : 'text-red-600',
      };
      
      // Execute generated component
      const componentElement = executeGeneratedComponent(
        component.componentCode, 
        safeContext
      );
      
      setRenderedComponent(componentElement);
      setError(null);
    } catch (err) {
      setError(`Failed to render: ${err.message}`);
    }
  }, [component]);

  if (error) {
    return (
      <Card className={`p-4 bg-red-50 dark:bg-red-900/20 ${className}`}>
        <p className="text-red-600 text-sm">{error}</p>
      </Card>
    );
  }

  return (
    <div className={className}>
      {renderedComponent}
    </div>
  );
}

function executeGeneratedComponent(code: string, context: any): React.ReactNode {
  // Sanitize code
  const sanitizedCode = sanitizeGeneratedCode(code);
  
  // Create safe function
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

function sanitizeGeneratedCode(code: string): string {
  // Remove dangerous patterns
  const dangerousPatterns = [
    /eval\s*\(/g,
    /Function\s*\(/g,
    /window\./g,
    /document\./g,
    /localStorage/g,
    /sessionStorage/g,
  ];
  
  let sanitized = code;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '// BLOCKED');
  });
  
  return sanitized;
}
```

### Step 2: Update Chat Interface
```typescript
// src/app.tsx - Add to imports
import { ComponentRenderer } from "@/components/generative-ui/ComponentRenderer";

// Add state for generated components
const [generatedComponents, setGeneratedComponents] = useState<Array<{
  id: string;
  component: GeneratedComponent;
  messageId: string;
}>>([]);

// Update message handling
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

// Update message rendering
{agentMessages.map((m: Message, index: number) => {
  const isUser = m.role === "user";
  const showAvatar = index === 0 || agentMessages[index - 1]?.role !== m.role;

  return (
    <div key={m.id}>
      {/* Existing message rendering */}
      
      {/* Add generated components after assistant messages */}
      {!isUser && generatedComponents
        .filter(comp => comp.messageId === m.id)
        .map(comp => (
          <div className="flex justify-start mt-2">
            <div className="w-8" /> {/* Spacer for alignment */}
            <div className="max-w-[85%]">
              <ComponentRenderer 
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

## Phase 3: Testing & Optimization (Week 5-6)

### Step 1: Test with DeFi Data
```typescript
// Test prompts to try:
const testPrompts = [
  "What's the current price of AERO on Base?",
  "Show me the top yield farming opportunities",
  "Compare these tokens: AERO, USDC, ETH",
  "What's the best stablecoin yield right now?",
  "Show me a portfolio analysis"
];
```

### Step 2: Error Handling
```typescript
// Add to ComponentRenderer
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  try {
    setIsLoading(true);
    // ... component generation logic
  } catch (err) {
    setError(`Failed to render: ${err.message}`);
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
```

### Step 3: Performance Optimization
```typescript
// Add component caching
const componentCache = new Map<string, React.ReactNode>();

function executeGeneratedComponent(code: string, context: any): React.ReactNode {
  const cacheKey = `${code}-${JSON.stringify(context.props)}`;
  
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey);
  }
  
  const component = /* ... generate component ... */;
  componentCache.set(cacheKey, component);
  
  return component;
}
```

## Implementation Checklist

### Backend
- [ ] Create `UIAwareMc2fiAgent` class
- [ ] Implement `ComponentGenerator` with style prompts
- [ ] Update agent export
- [ ] Test with existing tools

### Frontend
- [ ] Create `ComponentRenderer` component
- [ ] Add component state management
- [ ] Update chat interface
- [ ] Add error handling and loading states
- [ ] Implement code sanitization

### Testing
- [ ] Test with various DeFi data types
- [ ] Verify design system compliance
- [ ] Test error scenarios
- [ ] Performance testing
- [ ] Security testing

### Deployment
- [ ] Update environment variables
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor performance
- [ ] Collect user feedback

## Success Metrics

1. **Functionality**: Generated components render correctly
2. **Design**: Components match existing design system
3. **Performance**: Component generation < 2 seconds
4. **Security**: No code injection vulnerabilities
5. **User Experience**: Seamless integration with chat interface

This step-by-step approach ensures a smooth integration while maintaining your existing functionality and design system!
