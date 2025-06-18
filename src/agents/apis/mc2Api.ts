// MC2APIClient now uses global fetch and direct base URLs, no IAgentRuntime required.
export class MC2APIClient {
  private tokenAdminBaseUrl: string;
  private portfolioAdminBaseUrl: string;
  private publicApiBaseUrl: string;

  constructor(options?: {
    tokenAdminBaseUrl?: string;
    portfolioAdminBaseUrl?: string;
    publicApiBaseUrl?: string;
  }) {
    this.tokenAdminBaseUrl =
      options?.tokenAdminBaseUrl ||
      "https://tokenadmin-staging.chris-9e6.workers.dev";
    this.portfolioAdminBaseUrl =
      options?.portfolioAdminBaseUrl ||
      "https://portfolioadmin-staging.chris-9e6.workers.dev";
    this.publicApiBaseUrl =
      options?.publicApiBaseUrl || "https://staging.api.mc2.fi";
  }

  async analyzeToken(address: string): Promise<Record<string, any>> {
    try {
      const endpoint = `${this.tokenAdminBaseUrl}/test-analyzetokenaddress?address=${address}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(
          `API request failed: ${endpoint} :: ${response.statusText}`
        );
      }

      const data = (await response.json()) as Record<string, any>;

      if (!data.data || !data.albertSummary) {
        throw new Error(`No analysis data generated for token ${address}`);
      }
      return data;
    } catch (error) {
      console.error("Error analyzing token:", error);
      throw error;
    }
  }

  async analyzeAddress(address: string): Promise<Record<string, any>> {
    try {
      const endpoint = `${this.portfolioAdminBaseUrl}/address/analyze?address=${address}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(
          `API request failed: ${endpoint} :: ${response.statusText}`
        );
      }

      const data = (await response.json()) as Record<string, any>;

      return data;
    } catch (error) {
      console.error("Error analyzing token:", error);
      throw error;
    }
  }

  async analyzeWallet(address: string): Promise<Record<string, any>> {
    try {
      const endpoint = `${this.portfolioAdminBaseUrl}/wallet/analyze?address=${address}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(
          `API request failed: ${endpoint} :: ${response.statusText}`
        );
      }

      const data = (await response.json()) as Record<string, any>;

      return data;
    } catch (error) {
      console.error("Error analyzing token:", error);
      throw error;
    }
  }

  async analyzePortfolio(id: string): Promise<Record<string, any>> {
    try {
      const endpoint = `${this.portfolioAdminBaseUrl}/portfolio/analyze?id=${id}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(
          `API request failed: ${endpoint} :: ${response.statusText}`
        );
      }

      const data = (await response.json()) as Record<string, any>;

      return data;
    } catch (error) {
      console.error("Error analyzing token:", error);
      throw error;
    }
  }

  async addWallet(
    username: string,
    address: string,
    twitter?: string,
    avatar?: string
  ): Promise<{ success: boolean; data: { portfolioId: number } }> {
    try {
      const endpoint = `${this.portfolioAdminBaseUrl}/createcommunityportfolio`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        body: JSON.stringify({
          username,
          address,
          twitter,
          avatar,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add wallet: ${response.statusText}`);
      }

      const data = (await response.json()) as { success: boolean; data: { portfolioId: number } };
      return data;
    } catch (error) {
      console.error("Error adding wallet:", error);
      throw error;
    }
  }

  async search(
    query: string
  ): Promise<{ results: Record<string, any>[]; query: string }> {
    try {
      const endpoint = `${this.publicApiBaseUrl}/feeds/search?q=${query}`;
      const response = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to add wallet: ${response.statusText}`);
      }

      const data = (await response.json()) as { results: Record<string, any>[]; query: string };
      console.log("mc2 search data", data);
      return data;
    } catch (error) {
      console.error("Error adding wallet:", error);
      throw error;
    }
  }
} 