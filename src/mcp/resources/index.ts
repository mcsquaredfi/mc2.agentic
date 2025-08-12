import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MC2MCPState } from "../types";

export const greetingResource = {
  name: "greeting",
  template: new ResourceTemplate("greeting://{name}", { list: undefined }),
  metadata: {
    title: "Greeting Resource",
    description: "Dynamic greeting generator",
  },
  handler: async (uri: URL, { name }: { name: string }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Hello, ${name}!`,
      },
    ],
  }),
};

export const dynamicSessionStateResource = (getState: () => MC2MCPState) => ({
  name: "dynamic-session-state",
  template: new ResourceTemplate("mcp://mc2/session/{sessionId}/state", {
    list: undefined,
  }),
  metadata: {
    title: "Dynamic Session State",
    description: "Dynamic session state and preferences",
    mimeType: "application/json",
  },
  handler: async (uri: URL, { sessionId }: { sessionId: string }) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(getState(), null, 2),
      },
    ],
  }),
});

export const currentSessionStateResource = (getState: () => MC2MCPState) => ({
  name: "current-session-state",
  uri: "mcp://mc2/session/state",
  metadata: {
    title: "Current Session State",
    description: "Current session state and preferences",
    mimeType: "application/json",
  },
  handler: async (uri: URL) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(getState(), null, 2),
      },
    ],
  }),
});

export const recentAnalysisHistoryResource = (getState: () => MC2MCPState) => ({
  name: "recent-analysis-history",
  uri: "mcp://mc2/analysis/history",
  metadata: {
    title: "Recent Analysis History",
    description: "Recent analysis history",
    mimeType: "application/json",
  },
  handler: async (uri: URL) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(
          getState().conversationHistory.slice(-10),
          null,
          2
        ),
      },
    ],
  }),
});

export const userPreferencesResource = (getState: () => MC2MCPState) => ({
  name: "user-preferences-for-mc²-finance",
  uri: "mcp://mc2/user/preferences",
  metadata: {
    title: "User Preferences for MC² Finance",
    description: "User preferences for MC² Finance",
    mimeType: "application/json",
  },
  handler: async (uri: URL) => {
    const state = getState();
    const preferences = state.userPreference || {
      riskTolerance: "medium",
      preferredChains: [],
      analyticsEnabled: true,
    };

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(preferences, null, 2),
        },
      ],
    };
  },
});
