import { z } from "zod";
import Typesense from "./typesense";
import type { Env } from "../types";

// Zod schema for the LLM to generate structured queries
export const searchQuerySchema = z.object({
  searchTerm: z.string().describe("The main search term for the token"),
  filters: z
    .object({
      chain_id: z.string().optional().describe("Chain ID to filter by"),
      chain: z
        .string()
        .optional()
        .describe(
          "Chain name to filter by (e.g., ethereum, polygon) - can be an array of chains"
        ),
      marketcap: z
        .object({ min: z.number().optional(), max: z.number().optional() })
        .optional()
        .describe("Market cap range in USD"),
      volumeMcapRatio: z
        .object({ min: z.number().optional(), max: z.number().optional() })
        .optional()
        .describe("Volume to market cap ratio"),
      authenticity_score: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Minimum authenticity score (0-1)"),
      price: z
        .object({ min: z.number().optional(), max: z.number().optional() })
        .optional(),
      stablecoin: z.boolean().optional().describe("Filter for stablecoins"),
      primitive: z.string().optional().describe("Token primitive type"),
      cexlisted: z
        .boolean()
        .optional()
        .describe("Filter for CEX listed tokens"),
      holders: z
        .object({ min: z.number().optional(), max: z.number().optional() })
        .optional()
        .describe("Number of holders range"),
      price_change_24h: z
        .object({ min: z.number().optional(), max: z.number().optional() })
        .optional()
        .describe("24h price change range in percentage"),
      liquidity: z
        .object({ min: z.number().optional(), max: z.number().optional() })
        .optional()
        .describe("Liquidity range in USD"),
    })
    .optional(),
  sorting: z
    .object({
      field: z.enum([
        "marketcap",
        "price",
        "authenticity_score",
        "volumeMcapRatio",
        "token_ranking",
        "holders",
        "liquidity",
        "price_change_24h",
        "price_change_7d",
        "volume_7d",
      ]),
      direction: z.enum(["asc", "desc"]),
    })
    .optional(),
});

// Simple API wrapper for token search via Typesense, compatible with Cloudflare Agents
export default class TokensSearchAPI {
  private typesense: any;

  /**
   * @param env - Environment object containing TYPESENSE_HOST and TYPESENSE_API_KEY
   */
  constructor(env: Env) {
    const host = env.TYPESENSE_HOST || "https://typesense.mc2.fi";
    const apiKey = env.TYPESENSE_API_KEY || "xyz";
    this.typesense = new Typesense(host, apiKey);
  }

  /**
   * Search for tokens using an intermediate query format (zod schema)
   * @param intermediateQuery - Structured query from LLM or user
   */
  async searchTokens(
    intermediateQuery: z.infer<typeof searchQuerySchema>
  ): Promise<any> {
    console.log("searchTokens", intermediateQuery);
    const { searchTerm, filters, sorting } = intermediateQuery;
    // Build filter string
    const filterParts: string[] = [];
    if (filters) {
      if (filters.chain_id) filterParts.push(`chain_id:=${filters.chain_id}`);
      if (filters.chain) filterParts.push(`chains:=${filters.chain}`);
      if (filters.marketcap) {
        if (filters.marketcap.min !== undefined)
          filterParts.push(`marketcap:>=${filters.marketcap.min}`);
        if (filters.marketcap.max !== undefined)
          filterParts.push(`marketcap:<=${filters.marketcap.max}`);
      }
      if (filters.volumeMcapRatio) {
        if (filters.volumeMcapRatio.min !== undefined)
          filterParts.push(`volumeMcapRatio:>=${filters.volumeMcapRatio.min}`);
        if (filters.volumeMcapRatio.max !== undefined)
          filterParts.push(`volumeMcapRatio:<=${filters.volumeMcapRatio.max}`);
      }
      if (filters.authenticity_score !== undefined)
        filterParts.push(`authenticity_score:>=${filters.authenticity_score}`);
      if (filters.price) {
        if (filters.price.min !== undefined)
          filterParts.push(`price:>=${filters.price.min}`);
        if (filters.price.max !== undefined)
          filterParts.push(`price:<=${filters.price.max}`);
      }
      if (filters.stablecoin !== undefined)
        filterParts.push(`stablecoin:=${filters.stablecoin}`);
      if (filters.primitive)
        filterParts.push(`primitive:=${filters.primitive}`);
      if (filters.cexlisted !== undefined)
        filterParts.push(`cexlisted:=${filters.cexlisted}`);
      if (filters.holders) {
        if (filters.holders.min !== undefined)
          filterParts.push(`holders:>=${filters.holders.min}`);
        if (filters.holders.max !== undefined)
          filterParts.push(`holders:<=${filters.holders.max}`);
      }
      if (filters.price_change_24h) {
        if (filters.price_change_24h.min !== undefined)
          filterParts.push(
            `price_change_24h:>=${filters.price_change_24h.min}`
          );
        if (filters.price_change_24h.max !== undefined)
          filterParts.push(
            `price_change_24h:<=${filters.price_change_24h.max}`
          );
      }
      if (filters.liquidity) {
        if (filters.liquidity.min !== undefined)
          filterParts.push(`liquidity:>=${filters.liquidity.min}`);
        if (filters.liquidity.max !== undefined)
          filterParts.push(`liquidity:<=${filters.liquidity.max}`);
      }
    }
    const filterBy = filterParts.join(" && ");
    const sortBy = sorting
      ? `${sorting.field}:${sorting.direction}`
      : "token_ranking:asc";
    const limit = 10;
    // Typesense expects a query object
    const query = {
      q: searchTerm,
      sort_by: sortBy,
      filter_by: filterBy,
      per_page: limit,
    };
    // Call Typesense searchTokens
    const searchResults = await this.typesense.searchTokens(searchTerm, query);
    // Optionally add a website field for each result
    if (searchResults?.hits) {
      searchResults.hits = searchResults.hits.map((hit: any) => ({
        ...hit.document,
        website: "https://app.mc2.fi/tokens/" + hit.document.id,
      }));
    }
    return searchResults;
  }
}
