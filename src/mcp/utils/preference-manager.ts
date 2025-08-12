import type { MC2MCPState } from "../types";

export class PreferenceManager {
  private state: MC2MCPState;
  private updateState: (newState: MC2MCPState) => void;

  constructor(
    state: MC2MCPState,
    updateState: (newState: MC2MCPState) => void
  ) {
    this.state = state;
    this.updateState = updateState;
  }

  // Update user preferences
  updateUserPreferences(
    preferences: Partial<MC2MCPState["userPreference"]>
  ): void {
    const currentPrefs = this.state.userPreference || {
      riskTolerance: "medium",
      preferredChains: [],
      analyticsEnabled: true,
    };

    this.updateState({
      ...this.state,
      userPreference: {
        ...currentPrefs,
        ...preferences,
      },
    });
  }

  // Learn from token search patterns
  learnFromTokenSearch(params: any): void {
    const filters = params.filters || {};
    const sorting = params.sorting || {};

    // Learn preferred chains
    if (filters.chain) {
      const currentChains = this.state.userPreference.preferredChains;
      const newChain = filters.chain;

      if (!currentChains.includes(newChain)) {
        this.updateUserPreferences({
          preferredChains: [...currentChains, newChain].slice(-5),
        });
      }
    }

    // Learn risk tolerance from market cap preferences
    if (filters.marketcap) {
      const { min, max } = filters.marketcap;
      let riskTolerance: "low" | "medium" | "high" =
        this.state.userPreference.riskTolerance;

      if (min && min > 1000000000) {
        riskTolerance = "low"; // Conservative, large caps
      } else if (max && max < 100000000) {
        riskTolerance = "high"; // Aggressive, small caps
      } else {
        riskTolerance = "medium";
      }

      this.updateUserPreferences({ riskTolerance });
    }

    // Learn preferred sorting criteria
    if (sorting.field) {
      this.updateUserPreferences({
        preferredSortField: sorting.field,
        preferredSortDirection: sorting.direction || "desc",
      });
    }
  }

  // Learn from individual token/address analysis
  learnFromEntityAnalysis(params: any): void {
    const analysisHistory = this.state.conversationHistory
      .filter((h) => h.type === "analysis_result")
      .slice(-20);

    if (analysisHistory.length > 5) {
      this.updateUserPreferences({ analyticsEnabled: true });
    }
  }

  // Get adaptive search suggestions
  getAdaptiveSearchSuggestions(): {
    suggestedFilters: any;
    suggestedSorting: any;
    riskWarning?: string;
  } {
    const prefs = this.state.userPreference;
    const suggestions: any = {
      suggestedFilters: {},
      suggestedSorting: {},
    };

    // Suggest preferred chains
    if (prefs.preferredChains.length > 0) {
      suggestions.suggestedFilters.chain = prefs.preferredChains[0];
    }

    // Suggest market cap based on risk tolerance
    switch (prefs.riskTolerance) {
      case "low":
        suggestions.suggestedFilters.marketcap = { min: 1000000000 };
        suggestions.suggestedFilters.cexlisted = true;
        break;
      case "high":
        suggestions.suggestedFilters.marketcap = { max: 100000000 };
        suggestions.riskWarning =
          "⚠️ High-risk search: Small cap tokens can be highly volatile";
        break;
      case "medium":
        suggestions.suggestedFilters.marketcap = {
          min: 100000000,
          max: 1000000000,
        };
        break;
    }

    if (prefs.preferredSortField) {
      suggestions.suggestedSorting = {
        field: prefs.preferredSortField,
        direction: prefs.preferredSortDirection || "desc",
      };
    }

    return suggestions;
  }
}
