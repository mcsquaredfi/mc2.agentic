import { useAgent } from "agents/react";
import { useAgentChat } from "agents/ai-react";
import { useState, useCallback } from "react";

export function useMCPAgent() {
  // Connect to MCP agent
  const agent = useAgent({
    agent: "mcp-agent",
    name: "default",
    onMessage: (message) => {
      console.log("MCP Agent message received:", message);
    },
    onOpen: () => {
      console.log("MCP Agent connected");
    },
    onClose: () => {
      console.log("MCP Agent disconnected");
    },
    onError: (error) => {
      console.error("MCP Agent error:", error);
    }
  });

  // Use AI SDK chat with streaming
  const chat = useAgentChat({
    agent,
    onFinish: (message) => {
      console.log("MCP response completed:", message);
    },
  });

  // MCP-specific state
  const [isStreaming, setIsStreaming] = useState(false);
  const [mcpTools, setMcpTools] = useState<any[]>([]);

  // MCP-specific methods
  const sendMCPMessage = useCallback((content: string) => {
    setIsStreaming(true);
    chat.append({ role: 'user', content });
  }, [chat]);

  // Handle streaming messages
  const handleStreamingMessage = useCallback((message: any) => {
    if (message.type === "chunk") {
      // Handle streaming chunks
      console.log("Streaming chunk:", message.content);
    } else if (message.type === "response_complete") {
      setIsStreaming(false);
    } else if (message.type === "error") {
      setIsStreaming(false);
      console.error("MCP Agent error:", message.content);
    }
  }, []);

  return {
    ...chat,
    // MCP-specific methods
    sendMCPMessage,
    isStreaming,
    mcpTools,
    setMcpTools,
    handleStreamingMessage,
    // Connection status
    isConnected: agent.readyState === WebSocket.OPEN,
  };
}
