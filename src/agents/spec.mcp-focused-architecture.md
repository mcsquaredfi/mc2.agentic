# MCP-Focused Architecture with AI Elements

## Goal
Enable a UI interface that focuses on an MCP server, with custom optimizations for server interaction, clean client code, AI SDK communication, AI Elements UI, streaming support, and future AxLLM integration.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP-Focused Platform                        │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (AI Elements) │  AI SDK Bridge    │  MCP Server      │
│  - Interactive UI       │  - useAgentChat   │  - Custom Tools  │
│  - Feedback Buttons     │  - Streaming      │  - Optimizations │
│  - Dynamic Components   │  - Error Handling │  - Future AxLLM  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. MCP Server Agent (Simplified)
**File**: `src/agents/core/mcp-agent.ts`
**Purpose**: Focused MCP server with custom optimizations

```typescript
export class MCPAgent extends Agent<Env> {
  private mcpTools: MCPToolManager;
  private responseOptimizer: ResponseOptimizer;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.mcpTools = new MCPToolManager(env);
    this.responseOptimizer = new ResponseOptimizer();
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message === 'string') {
      const data = JSON.parse(message);
      
      if (data.type === "chat") {
        // Stream response with MCP optimizations
        await this.streamMCPResponse(connection, data.content);
      }
    }
  }

  private async streamMCPResponse(connection: Connection, userMessage: string) {
    // Get optimized MCP tools
    const tools = await this.mcpTools.getOptimizedTools(userMessage);
    
    // Stream AI response with MCP integration
    const stream = await this.createStreamResponse(userMessage, tools);
    
    // Send streaming response
    for await (const chunk of stream) {
      connection.send(JSON.stringify({
        type: "chunk",
        content: chunk,
        timestamp: Date.now(),
      }));
    }
  }
}
```

### 2. AI SDK Bridge (Client-Side)
**File**: `src/hooks/useMCPAgent.ts`
**Purpose**: Clean AI SDK integration with streaming

```typescript
import { useAgentChat } from "agents/ai-react";
import { useChat } from "ai/react";

export function useMCPAgent() {
  // Connect to MCP agent
  const agent = useAgent({
    agent: "mcp-agent",
    name: "default",
  });

  // Use AI SDK chat with streaming
  const chat = useAgentChat({
    agent,
    onFinish: (message) => {
      // Handle completion
    },
  });

  return {
    ...chat,
    // MCP-specific methods
    sendMCPMessage: (content: string) => chat.append({ role: 'user', content }),
    isStreaming: chat.isLoading,
  };
}
```

### 3. AI Elements UI Components
**File**: `src/components/mcp-ui/MCPInterface.tsx`
**Purpose**: Interactive UI with AI Elements

```typescript
import { useMCPAgent } from "../../hooks/useMCPAgent";
import { FeedbackButtons } from "./FeedbackButtons";
import { MCPToolDisplay } from "./MCPToolDisplay";

export function MCPInterface() {
  const { messages, sendMCPMessage, isStreaming } = useMCPAgent();

  return (
    <div className="mcp-interface">
      {/* AI Elements Chat */}
      <div className="chat-container">
        {messages.map((message, index) => (
          <div key={index} className="message">
            {message.role === 'user' ? (
              <div className="user-message">{message.content}</div>
            ) : (
              <div className="assistant-message">
                <div className="content">{message.content}</div>
                <FeedbackButtons messageId={message.id} />
                <MCPToolDisplay tools={message.tools} />
              </div>
            )}
          </div>
        ))}
        
        {isStreaming && <div className="streaming-indicator">AI is thinking...</div>}
      </div>

      {/* Input with MCP optimizations */}
      <div className="input-container">
        <input
          placeholder="Ask about MCP tools, DeFi data, or yield strategies..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendMCPMessage(e.target.value);
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}
```

### 4. MCP Tool Manager (Server-Side)
**File**: `src/agents/core/mcp-tool-manager.ts`
**Purpose**: Optimized MCP tool handling

```typescript
export class MCPToolManager {
  constructor(private env: Env) {}

  async getOptimizedTools(userMessage: string): Promise<ToolSet> {
    // Analyze user intent
    const intent = await this.analyzeIntent(userMessage);
    
    // Return relevant MCP tools
    const relevantTools = this.filterToolsByIntent(intent);
    
    // Add custom optimizations
    return this.optimizeToolSet(relevantTools, intent);
  }

  private async analyzeIntent(message: string): Promise<MCPIntent> {
    // Simple intent analysis for MCP optimization
    if (message.includes('yield') || message.includes('APY')) {
      return { type: 'yield', confidence: 0.9 };
    }
    if (message.includes('risk') || message.includes('security')) {
      return { type: 'risk', confidence: 0.8 };
    }
    return { type: 'general', confidence: 0.5 };
  }

  private filterToolsByIntent(intent: MCPIntent): ToolSet {
    // Return MCP tools relevant to intent
    const baseTools = {
      searchTokens: this.createTool('searchTokens'),
      getStablecoinYieldData: this.createTool('getStablecoinYieldData'),
      getTopApyVaults: this.createTool('getTopApyVaults'),
      // ... other MCP tools
    };

    // Filter based on intent
    switch (intent.type) {
      case 'yield':
        return {
          getStablecoinYieldData: baseTools.getStablecoinYieldData,
          getTopApyVaults: baseTools.getTopApyVaults,
        };
      case 'risk':
        return {
          searchTokens: baseTools.searchTokens,
          // Add risk-specific tools
        };
      default:
        return baseTools;
    }
  }
}
```

### 5. Streaming Response Handler
**File**: `src/agents/core/streaming-handler.ts`
**Purpose**: Handle streaming responses with MCP integration

```typescript
export class StreamingHandler {
  async createStreamResponse(
    userMessage: string,
    tools: ToolSet,
    env: Env
  ): Promise<ReadableStream<string>> {
    const model = createOpenAI({
      baseURL: "https://gateway.ai.cloudflare.com/v1/...",
    })("gpt-4o-2024-11-20");

    const result = await streamText({
      model,
      messages: [{ role: 'user', content: userMessage }],
      tools,
      onToolCall: async (toolCall) => {
        // Handle MCP tool calls with custom optimizations
        return await this.handleMCPToolCall(toolCall);
      },
    });

    return result.textStream;
  }

  private async handleMCPToolCall(toolCall: any) {
    // Custom MCP tool handling with optimizations
    const toolName = toolCall.toolName;
    const args = toolCall.args;

    // Add custom optimizations based on tool type
    switch (toolName) {
      case 'getStablecoinYieldData':
        return await this.getOptimizedYieldData(args);
      case 'getTopApyVaults':
        return await this.getOptimizedApyData(args);
      default:
        return await this.callStandardMCPTool(toolName, args);
    }
  }
}
```

## File Structure (Simplified)

```
src/
├── agents/
│   ├── core/
│   │   ├── mcp-agent.ts           # Main MCP agent (200 lines)
│   │   ├── mcp-tool-manager.ts    # MCP tool handling (150 lines)
│   │   └── streaming-handler.ts   # Streaming responses (100 lines)
│   └── types/
│       └── mcp.ts                 # MCP-specific types
├── hooks/
│   └── useMCPAgent.ts             # AI SDK bridge (100 lines)
├── components/
│   ├── mcp-ui/
│   │   ├── MCPInterface.tsx       # Main interface
│   │   ├── FeedbackButtons.tsx    # AI Elements feedback
│   │   └── MCPToolDisplay.tsx     # Tool result display
│   └── ai-elements/               # AI Elements components
└── server.ts                      # Entry point
```

## Key Features

### 1. **Clean Client Code**
- AI SDK handles all communication complexity
- AI Elements provide pre-built UI components
- Minimal custom code required

### 2. **MCP Server Optimizations**
- Intent-based tool filtering
- Custom tool response optimization
- Efficient MCP connection handling

### 3. **Streaming Support**
- Real-time response streaming
- Progressive tool result display
- Smooth user experience

### 4. **Future AxLLM Integration**
- Prepared for AxLLM optimization
- Structured prompt management
- Response quality assessment

### 5. **Interactive UI**
- AI Elements for dynamic components
- Feedback buttons for user input
- Tool result visualization

## Implementation Timeline

### Week 1: Core MCP Agent
- [ ] Create `MCPAgent` class
- [ ] Implement `MCPToolManager` with optimizations
- [ ] Add streaming response handling
- [ ] Basic AI SDK integration

### Week 2: UI Integration
- [ ] Implement `useMCPAgent` hook
- [ ] Create `MCPInterface` with AI Elements
- [ ] Add feedback buttons
- [ ] Tool result display components

### Week 3: Optimizations & Future Prep
- [ ] Add intent-based tool filtering
- [ ] Implement response optimizations
- [ ] Prepare for AxLLM integration
- [ ] Performance optimization

## Benefits

1. **Focused**: Single purpose - MCP server interaction
2. **Clean**: AI SDK handles complexity, minimal custom code
3. **Interactive**: AI Elements provide rich UI components
4. **Streaming**: Real-time responses with smooth UX
5. **Extensible**: Ready for AxLLM and advanced features
6. **Maintainable**: Simple, focused architecture

This architecture focuses specifically on your goal: a clean MCP server interface with AI SDK communication, AI Elements UI, streaming support, and future AxLLM integration, without bloated client code.
