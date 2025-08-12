import type { MC2MCPState } from "../types";

export class HistoryManager {
  private state: MC2MCPState;
  private updateState: (newState: MC2MCPState) => void;

  constructor(
    state: MC2MCPState,
    updateState: (newState: MC2MCPState) => void
  ) {
    this.state = state;
    this.updateState = updateState;
  }

  // Add to conversation history
  addToHistory(
    type: MC2MCPState["conversationHistory"][0]["type"],
    content: string
  ): void {
    const history = [
      ...this.state.conversationHistory,
      {
        type,
        content,
        timestamp: Date.now(),
      },
    ].slice(-50);

    this.updateState({
      ...this.state,
      conversationHistory: history,
    });
  }

  // Track tool usage for preference learning
  trackToolUsage(toolName: string, params: any, preferenceManager: any): void {
    this.addToHistory("tool_call", `${toolName}: ${JSON.stringify(params)}`);

    if (toolName === "advanced-token-search") {
      preferenceManager.learnFromTokenSearch(params);
    } else if (toolName === "search-token" || toolName === "search-address") {
      preferenceManager.learnFromEntityAnalysis(params);
    }
  }

  // Get user context for personalized responses
  getUserContext(): {
    recentHistory: MC2MCPState["conversationHistory"];
    preferences: MC2MCPState["userPreference"];
    sessionInfo: { sessionId: string; duration: number };
  } {
    const sessionStart =
      this.state.conversationHistory[0]?.timestamp || Date.now();

    return {
      recentHistory: this.state.conversationHistory.slice(-10),
      preferences: this.state.userPreference || {
        riskTolerance: "medium",
        preferredChains: [],
        analyticsEnabled: true,
      },
      sessionInfo: {
        sessionId: this.state.sessionId,
        duration: Date.now() - sessionStart,
      },
    };
  }
}
