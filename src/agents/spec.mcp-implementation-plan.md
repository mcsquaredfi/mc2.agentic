# MCP-Focused Implementation Plan

## Goal
Create a focused MCP server with AI SDK communication, AI Elements UI, streaming support, and future AxLLM integration.

## Current State Assessment

### What We Have (Keep)
- ✅ **Cloudflare Agents SDK**: Solid foundation
- ✅ **AI SDK Integration**: `@ai-sdk/react` v2.0.44 already installed
- ✅ **AI Elements**: `ai-elements` v1.1.2 already installed
- ✅ **MCP Tools**: Working MCP integration
- ✅ **WebSocket Communication**: Real-time communication working

### What We Need (Build)
- 🎯 **Focused MCP Agent**: Single-purpose MCP server agent
- 🎯 **AI SDK Bridge**: Clean `useAgentChat` integration
- 🎯 **AI Elements UI**: Interactive components with feedback
- 🎯 **Streaming Support**: Real-time response streaming
- 🎯 **MCP Optimizations**: Custom tool handling and response optimization

## Implementation Steps

### Step 1: Create Focused MCP Agent (Day 1)

Replace the complex agent hierarchy with a single focused MCP agent:

```typescript
// src/agents/core/mcp-agent.ts
import { Agent } from "agents";
import type { Connection, WSMessage, AgentContext } from "agents";
import type { Env } from "../types";

export class MCPAgent extends Agent<Env> {
  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message === 'string') {
      const data = JSON.parse(message);
      
      if (data.type === "chat") {
        // Stream MCP-optimized response
        await this.streamMCPResponse(connection, data.content);
      }
    }
  }

  private async streamMCPResponse(connection: Connection, userMessage: string) {
    // Simple streaming response for now
    const response = `MCP Agent received: "${userMessage}". Working on optimized response...`;
    
    // Simulate streaming
    for (let i = 0; i < response.length; i += 5) {
      const chunk = response.slice(i, i + 5);
      connection.send(JSON.stringify({
        type: "chunk",
        content: chunk,
        timestamp: Date.now(),
      }));
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Send completion
    connection.send(JSON.stringify({
      type: "complete",
      timestamp: Date.now(),
    }));
  }
}
```

### Step 2: Update Server Entry Point (Day 1)

```typescript
// src/server.ts
export { MCPAgent as Chat } from "./agents/core/mcp-agent";
```

### Step 3: Create AI SDK Bridge (Day 2)

```typescript
// src/hooks/useMCPAgent.ts
import { useAgent } from "agents/react";
import { useAgentChat } from "agents/ai-react";

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
      console.log("MCP response completed:", message);
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

### Step 4: Create AI Elements UI (Day 2)

```typescript
// src/components/mcp-ui/MCPInterface.tsx
import { useMCPAgent } from "../../hooks/useMCPAgent";
import { Button } from "../../components/button/Button";

export function MCPInterface() {
  const { messages, sendMCPMessage, input, handleInputChange, handleSubmit, isStreaming } = useMCPAgent();

  return (
    <div className="mcp-interface p-4 max-w-4xl mx-auto">
      {/* Messages */}
      <div className="chat-container mb-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
            <div className={`p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-100 ml-8' 
                : 'bg-gray-100 mr-8'
            }`}>
              {message.content}
              
              {/* Feedback buttons for assistant messages */}
              {message.role === 'assistant' && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="ghost">👍</Button>
                  <Button size="sm" variant="ghost">👎</Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Streaming indicator */}
        {isStreaming && (
          <div className="assistant-message mr-8">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                AI is thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="input-container">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about MCP tools, DeFi data, or yield strategies..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming}
          />
          <Button type="submit" disabled={isStreaming || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
```

### Step 5: Update App to Use MCP Interface (Day 2)

```typescript
// src/app.tsx (update main component)
import { MCPInterface } from "./components/mcp-ui/MCPInterface";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">MCP Agent Interface</h1>
          <p className="text-gray-600">Interactive MCP server with AI Elements</p>
        </div>
      </header>
      
      <main className="py-6">
        <MCPInterface />
      </main>
    </div>
  );
}
```

### Step 6: Add MCP Tool Integration (Day 3)

```typescript
// src/agents/core/mcp-tool-manager.ts
export class MCPToolManager {
  constructor(private env: Env) {}

  async getMCPTools(): Promise<any> {
    // Get MCP tools (reuse existing logic)
    const tools = {
      searchTokens: {
        description: 'Search for token information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        }
      },
      getStablecoinYieldData: {
        description: 'Get stablecoin yield opportunities',
        parameters: {
          type: 'object',
          properties: {
            risk_level: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        }
      },
      // ... other MCP tools
    };

    return tools;
  }
}
```

### Step 7: Enhance Streaming with MCP Tools (Day 3)

```typescript
// Update mcp-agent.ts with tool integration
export class MCPAgent extends Agent<Env> {
  private mcpToolManager: MCPToolManager;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.mcpToolManager = new MCPToolManager(env);
  }

  private async streamMCPResponse(connection: Connection, userMessage: string) {
    // Get MCP tools
    const tools = await this.mcpToolManager.getMCPTools();
    
    // Process with AI and tools
    const result = await this.processWithTools(userMessage, tools);
    
    // Stream the response
    await this.streamResponse(connection, result);
  }

  private async processWithTools(userMessage: string, tools: any) {
    // Use existing AI processing with MCP tools
    // This will integrate with your existing AIProcessor
    return {
      text: "MCP response with tool results...",
      toolResults: []
    };
  }
}
```

## Testing Strategy

### After Each Step
1. **Test locally**: `pnpm start`
2. **Verify WebSocket**: Check connection works
3. **Test messaging**: Send messages and verify responses
4. **Check console**: Ensure no errors

### Success Criteria
- ✅ **Clean UI**: AI Elements provide good UX
- ✅ **Streaming works**: Real-time responses
- ✅ **MCP tools**: Tool integration functional
- ✅ **Feedback buttons**: User feedback collection
- ✅ **No errors**: Clean console output

## File Structure (Target)

```
src/
├── agents/
│   ├── core/
│   │   ├── mcp-agent.ts           # Main MCP agent (200 lines)
│   │   └── mcp-tool-manager.ts    # MCP tool handling (100 lines)
│   └── types/
│       └── mcp.ts                 # MCP types (50 lines)
├── hooks/
│   └── useMCPAgent.ts             # AI SDK bridge (100 lines)
├── components/
│   └── mcp-ui/
│       └── MCPInterface.tsx       # Main interface (150 lines)
└── server.ts                      # Updated entry point
```

## Benefits of This Approach

1. **Focused**: Single purpose - MCP server interaction
2. **Clean**: AI SDK handles complexity, minimal custom code
3. **Interactive**: AI Elements provide rich UI components
4. **Streaming**: Real-time responses with smooth UX
5. **Extensible**: Ready for AxLLM and advanced features
6. **Maintainable**: Simple, focused architecture

This implementation plan gives you exactly what you want: a focused MCP server with AI SDK communication, AI Elements UI, streaming support, and a clean, maintainable codebase.
