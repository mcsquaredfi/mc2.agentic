export interface MC2MCPState {
  sessionId: string;
  userId?: string;
  lastAnalysis?: {
    tokenAddress?: string;
    walletAddress?: string;
    timestamp: number;
    results: any;
  };
  userPreference: {
    riskTolerance: "low" | "medium" | "high";
    preferredChains: string[];
    analyticsEnabled: boolean;
    preferredSortField?: string;
    preferredSortDirection?: "asc" | "desc";
    searchFrequency?: {
      daily: number;
      weekly: number;
      lastSearchDate: number;
    };
  };
  conversationHistory: Array<{
    type: "user_query" | "tool_call" | "analysis_result";
    content: string;
    timestamp: number;
  }>;
}
