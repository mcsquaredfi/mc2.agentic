# Vercel AI SDK v5 Integration Specification

## Overview

This document outlines the detailed integration plan for incorporating Vercel AI SDK v5's generative UI capabilities into our existing MC2 Agentic architecture. The integration will enhance our current Cloudflare Agents SDK implementation with dynamic UI generation capabilities.

## Current Architecture Analysis

### Existing Components
- **Agent**: `Mc2fiChatAgent` extending `AIChatAgent`
- **AI Processing**: `AIProcessor` class with OpenAI integration
- **Frontend**: React app with `useAgent` and `useAgentChat` hooks
- **Tools**: MCP integration for external API access
- **State Management**: Agent-based state with WebSocket communication

### Integration Points
1. **Agent Layer**: Enhance message processing with UI generation
2. **Frontend Layer**: Add dynamic component rendering
3. **Communication Layer**: Extend WebSocket protocol for UI components
4. **Tool Layer**: Integrate UI generation with existing tools

## Detailed Integration Plan

### 1. Agent Layer Enhancements

#### 1.1 Enhanced AI Processor
```typescript
// src/agents/core/enhanced-ai-processor.ts
import { streamText, generateObject } from "ai";
import { z } from "zod";

const UIComponentSchema = z.object({
  type: z.enum(['chart', 'form', 'card', 'table', 'interactive']),
  props: z.record(z.any()),
  children: z.array(z.any()).optional(),
  metadata: z.object({
    toolResult: z.any().optional(),
    context: z.string().optional(),
  }).optional(),
});

export class EnhancedAIProcessor extends AIProcessor {
  async processMessageWithUI(
    messages: any[],
    tools: ToolSet,
    env: Env
  ): Promise<{
    text: string;
    uiComponents: z.infer<typeof UIComponentSchema>[];
    toolCalls: any[];
    toolResults: any[];
  }> {
    // Enhanced processing with UI generation
    const model = this.getModel(env);
    
    // First, process with tools
    const toolResult = await streamText({
      model,
      messages: convertToModelMessages(messages),
      tools,
      // ... existing configuration
    });
    
    // Then generate UI components based on tool results
    const uiResult = await generateObject({
      model,
      schema: z.object({
        components: z.array(UIComponentSchema),
        explanation: z.string(),
      }),
      prompt: `Based on the tool results, generate appropriate UI components for: ${messages[messages.length - 1].content}`,
    });
    
    return {
      text: await toolResult.text,
      uiComponents: uiResult.object.components,
      toolCalls: await toolResult.toolCalls,
      toolResults: await toolResult.toolResults,
    };
  }
}
```

#### 1.2 UI-Aware Agent
```typescript
// src/agents/core/ui-aware-agent.ts
export class UIAwareMc2fiAgent extends Mc2fiChatAgent {
  private enhancedProcessor: EnhancedAIProcessor;
  
  async onMessage(connection: Connection, message: WSMessage) {
    // ... existing message handling
    
    if (data.type === "chat") {
      const result = await this.enhancedProcessor.processMessageWithUI(
        this.messages,
        this.getCombinedTools(),
        this.env
      );
      
      // Send both text and UI components
      connection.send(JSON.stringify({
        type: "response",
        content: result.text,
        uiComponents: result.uiComponents,
        timestamp: Date.now(),
      }));
    }
  }
}
```

### 2. Frontend Integration

#### 2.1 Enhanced Chat Hook
```typescript
// src/hooks/useEnhancedAgentChat.tsx
import { useAgentChat } from "agents/ai-react";
import { useState, useCallback } from "react";

interface UIComponent {
  type: string;
  props: Record<string, any>;
  children?: any[];
  metadata?: {
    toolResult?: any;
    context?: string;
  };
}

export function useEnhancedAgentChat(options: any) {
  const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
  const agentChat = useAgentChat(options);
  
  const handleMessage = useCallback((message: any) => {
    if (message.uiComponents) {
      setUIComponents(prev => [...prev, ...message.uiComponents]);
    }
  }, []);
  
  return {
    ...agentChat,
    uiComponents,
    setUIComponents,
    handleMessage,
  };
}
```

#### 2.2 Dynamic Component System
```typescript
// src/components/generative-ui/ComponentRegistry.tsx
import { z } from "zod";

const componentSchemas = {
  chart: z.object({
    type: z.literal('chart'),
    props: z.object({
      data: z.array(z.any()),
      chartType: z.enum(['line', 'bar', 'pie', 'area']),
      title: z.string().optional(),
    }),
  }),
  form: z.object({
    type: z.literal('form'),
    props: z.object({
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        label: z.string(),
        required: z.boolean().optional(),
      })),
      onSubmit: z.string().optional(),
    }),
  }),
  // ... more component schemas
};

export class ComponentRegistry {
  private components = new Map<string, React.ComponentType<any>>();
  
  register(name: string, component: React.ComponentType<any>) {
    this.components.set(name, component);
  }
  
  render(component: UIComponent) {
    const Component = this.components.get(component.type);
    if (!Component) {
      return <div>Unknown component: {component.type}</div>;
    }
    
    return <Component {...component.props} />;
  }
}
```

#### 2.3 Component Implementations
```typescript
// src/components/generative-ui/ChartComponent.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ChartComponent({ data, chartType, title }: {
  data: any[];
  chartType: 'line' | 'bar' | 'pie' | 'area';
  title?: string;
}) {
  return (
    <div className="chart-container p-4 bg-white dark:bg-gray-800 rounded-lg">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// src/components/generative-ui/FormComponent.tsx
import { useForm } from 'react-hook-form';

export function FormComponent({ fields, onSubmit }: {
  fields: Array<{
    name: string;
    type: string;
    label: string;
    required?: boolean;
  }>;
  onSubmit?: string;
}) {
  const { register, handleSubmit } = useForm();
  
  return (
    <form className="form-container p-4 bg-white dark:bg-gray-800 rounded-lg">
      {fields.map((field) => (
        <div key={field.name} className="mb-4">
          <label className="block text-sm font-medium mb-2">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <input
            type={field.type}
            {...register(field.name, { required: field.required })}
            className="w-full p-2 border rounded-md"
          />
        </div>
      ))}
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        {onSubmit || 'Submit'}
      </button>
    </form>
  );
}
```

### 3. Communication Protocol

#### 3.1 Enhanced WebSocket Messages
```typescript
// src/agents/types.ts - Enhanced message types
export interface EnhancedMessage {
  type: 'chat' | 'response' | 'ui-component' | 'error';
  content?: string;
  uiComponents?: UIComponent[];
  timestamp: number;
  metadata?: {
    toolCalls?: any[];
    toolResults?: any[];
    context?: string;
  };
}
```

#### 3.2 Message Handler Updates
```typescript
// src/app.tsx - Enhanced message handling
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
      
      // Handle UI components
      if (data.uiComponents) {
        setUIComponents(prev => [...prev, ...data.uiComponents]);
      }
    }
  } catch (error) {
    console.error("Error parsing agent message:", error);
  }
};
```

### 4. Tool Integration

#### 4.1 UI-Aware Tools
```typescript
// src/agents/tools/ui-aware-tools.ts
import { tool } from 'ai';
import { z } from 'zod';

export const yieldCalculatorTool = tool({
  description: 'Calculate yield opportunities and generate visualization',
  parameters: z.object({
    token: z.string(),
    amount: z.number(),
    timeframe: z.enum(['1d', '7d', '30d', '90d']),
  }),
  execute: async ({ token, amount, timeframe }) => {
    // Fetch yield data
    const yieldData = await fetchYieldData(token, timeframe);
    
    // Return data with UI generation hints
    return {
      data: yieldData,
      uiHint: {
        type: 'chart',
        chartType: 'line',
        title: `${token} Yield Analysis`,
        interactive: true,
      },
    };
  },
});
```

### 5. State Management

#### 5.1 UI State Integration
```typescript
// src/agents/core/ui-state-manager.ts
export class UIStateManager {
  private uiComponents: Map<string, UIComponent> = new Map();
  
  addComponent(component: UIComponent, messageId: string) {
    this.uiComponents.set(messageId, component);
  }
  
  getComponentsForMessage(messageId: string): UIComponent | undefined {
    return this.uiComponents.get(messageId);
  }
  
  updateComponent(messageId: string, updates: Partial<UIComponent>) {
    const component = this.uiComponents.get(messageId);
    if (component) {
      this.uiComponents.set(messageId, { ...component, ...updates });
    }
  }
}
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up enhanced AI processor
- [ ] Create component registry system
- [ ] Implement basic UI component schemas

### Week 2: Core Integration
- [ ] Extend agent with UI generation capabilities
- [ ] Update WebSocket communication protocol
- [ ] Create dynamic component renderer

### Week 3: Component Development
- [ ] Implement chart components for DeFi data
- [ ] Create form components for tool inputs
- [ ] Build interactive elements

### Week 4: Frontend Integration
- [ ] Update chat interface with dynamic UI
- [ ] Implement component state management
- [ ] Add error handling and fallbacks

### Week 5: Testing & Optimization
- [ ] Unit tests for component generation
- [ ] Integration tests for agent-frontend communication
- [ ] Performance optimization

### Week 6: Polish & Deployment
- [ ] UI/UX improvements
- [ ] Documentation updates
- [ ] Production deployment

## Dependencies

### New Dependencies
```json
{
  "dependencies": {
    "recharts": "^2.8.0",
    "react-hook-form": "^7.48.0",
    "framer-motion": "^10.16.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

### Updated Dependencies
```json
{
  "dependencies": {
    "@ai-sdk/react": "^2.0.44",
    "@ai-sdk/ui-utils": "^1.2.11",
    "ai": "^5.0.0"
  }
}
```

## Testing Strategy

### Unit Tests
- Component generation logic
- UI component rendering
- State management

### Integration Tests
- Agent-to-frontend communication
- Tool result to UI component conversion
- WebSocket message handling

### E2E Tests
- Complete user workflows with dynamic UI
- Interactive component functionality
- Error handling scenarios

## Success Metrics

1. **Performance**: UI generation < 2 seconds
2. **Reliability**: < 1% component generation failures
3. **User Engagement**: 30% increase in interaction with dynamic elements
4. **Developer Experience**: Reduced time to add new UI components

## Risk Mitigation

1. **Fallback Strategy**: Static UI components when generation fails
2. **Performance Monitoring**: Track generation times and memory usage
3. **Security**: Validate all generated components and props
4. **Backward Compatibility**: Maintain existing chat functionality
