import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "../agents/types";
import type { MC2MCPState } from "./types";
import { HistoryManager, PreferenceManager } from "./utils";
import { registerAll } from "./config";

export default class Mc2fiMCPAgent extends McpAgent<Env, MC2MCPState, {}> {
  server = new McpServer({
    name: "MC² Finance MCP Agent",
    version: "1.0.0",
  });

  private preferenceManager!: PreferenceManager;
  private historyManager!: HistoryManager;

  initialState: MC2MCPState = {
    sessionId: crypto.randomUUID(),
    conversationHistory: [],
    userPreference: {
      riskTolerance: "medium",
      preferredChains: [],
      analyticsEnabled: true,
      searchFrequency: {
        daily: 0,
        weekly: 0,
        lastSearchDate: Date.now(),
      },
    },
  };

  async init(): Promise<void> {
    // Initialize managers here when state is available
    this.preferenceManager = new PreferenceManager(this.state, (newState) =>
      this.setState(newState)
    );

    this.historyManager = new HistoryManager(this.state, (newState) =>
      this.setState(newState)
    );

    // Register all components
    registerAll(this, this.env);
  }

  // Expose manager methods for external access
  public trackToolUsage(toolName: string, params: any): void {
    this.historyManager.trackToolUsage(
      toolName,
      params,
      this.preferenceManager
    );
  }

  public addToHistory(
    type: MC2MCPState["conversationHistory"][0]["type"],
    content: string
  ): void {
    this.historyManager.addToHistory(type, content);
  }

  public getUserContext() {
    return this.historyManager.getUserContext();
  }

  public getAdaptiveSearchSuggestions() {
    return this.preferenceManager.getAdaptiveSearchSuggestions();
  }

  onStateUpdate(state: MC2MCPState): void {
    // Update manager state references
    this.preferenceManager = new PreferenceManager(state, (newState) =>
      this.setState(newState)
    );

    this.historyManager = new HistoryManager(state, (newState) =>
      this.setState(newState)
    );

    console.log("MC² MCP Agent state updated:", {
      sessionId: state.sessionId,
      historyLength: state.conversationHistory.length,
      userPreferences: state.userPreference,
    });
  }
}
