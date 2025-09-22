import { useAgent } from "agents/react";
import { useAgentChat } from "agents/ai-react";

export function useSimpleMCPAgent() {
  const agent = useAgent({
    agent: "chat",
    name: "default",
  });

  return useAgentChat({ 
    agent,
    onFinish: (message) => {
      console.log("MCP response completed:", message);
    },
  });
}
