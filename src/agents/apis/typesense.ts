export default class Typesense {
  constructor(
    private cluster: string,
    private apiKey: string
  ) {}

  private async request(path: string, options: RequestInit = {}) {
    const url = `https://${this.cluster}.a1.typesense.net:443${path}`;
    const headers = {
      "x-typesense-api-key": this.apiKey,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Typesense request failed: ${response.statusText}`);
      } else if (response.status === 404) {
        return null;
      }

      return response.json();
    } catch (err) {
      console.error("Typesense request error:", {
        url,
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async getDocument(collection: string, id: string): Promise<any> {
    try {
      return await this.request(`/collections/${collection}/documents/${id}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return null;
      throw err;
    }
  }

  async searchTokens(
    query: string,
    options: {
      limit?: number;
      filterBy?: string;
      sortBy?: string;
    } = {}
  ): Promise<any> {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        query_by: "name,symbol,chain",
        per_page: (options.limit || 10).toString(),
        ...(options.filterBy ? { filter_by: options.filterBy } : {}),
        ...(options.sortBy ? { sort_by: options.sortBy } : {}),
      });

      return this.request(
        `/collections/tokens/documents/search?${searchParams.toString()}`
      );
    } catch (err) {
      console.error("Error searching tokens: ", {
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err),
        query,
        options,
      });
      throw err;
    }
  }

  async searchPortfolios(
    query: string,
    options: {
      limit?: number;
      filterBy?: string;
      sortBy?: string;
    } = {}
  ): Promise<any> {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        query_by: "name,username,wallets",
        per_page: (options.limit || 10).toString(),
        ...(options.filterBy ? { filter_by: options.filterBy } : {}),
        ...(options.sortBy ? { sort_by: options.sortBy } : {}),
      });

      //console.log('searchParams', searchParams.toString());
      return this.request(
        `/collections/portfolios/documents/search?${searchParams.toString()}`
      );
    } catch (err) {
      console.error("Error searching portfolios: ", {
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err),
        query,
        options,
      });
      throw err;
    }
  }

  async getTokenByUtiud(utid: string): Promise<any> {
    return this.getDocument("tokens", utid.toLowerCase());
  }
}
