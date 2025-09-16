import type { Env } from "../types";

interface CachedToolResult {
  result: any;
  timestamp: number;
  query: string;
  toolName: string;
}

export class ToolCacheManager {
  private cache = new Map<string, CachedToolResult>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private env: Env) {}

  private generateCacheKey(toolName: string, query: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${toolName}_${query.toLowerCase().replace(/\s+/g, '_')}_${paramsStr}`;
  }

  async getCachedResult(toolName: string, query: string, params?: any): Promise<any | null> {
    const cacheKey = this.generateCacheKey(toolName, query, params);
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log(`💾 Cache hit for ${toolName}: ${cacheKey}`);
      return cached.result;
    }
    
    if (cached) {
      console.log(`⏰ Cache expired for ${toolName}: ${cacheKey}`);
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  setCachedResult(toolName: string, query: string, result: any, params?: any): void {
    const cacheKey = this.generateCacheKey(toolName, query, params);
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      query,
      toolName
    });
    console.log(`💾 Cached result for ${toolName}: ${cacheKey}`);
  }

  // Pre-warm common tool calls based on query patterns
  async preWarmToolCalls(query: string): Promise<Map<string, Promise<any>>> {
    const preWarmPromises = new Map<string, Promise<any>>();
    
    console.log(`🚀 Pre-warming tool calls for query: "${query}"`);
    
    // Get base tools
    const { getTools } = await import("../tools");
    const baseTools = getTools(this.env);
    
    const queryLower = query.toLowerCase();
    
    // Pre-warm based on query patterns using available tools
    if (queryLower.includes('token') || queryLower.includes('search')) {
      if (baseTools.searchTokens) {
        preWarmPromises.set('searchTokens', this.executeToolWithCache('searchTokens', query, baseTools.searchTokens, { query: queryLower }));
      }
    }
    
    if (queryLower.includes('portfolio') || queryLower.includes('address')) {
      if (baseTools.searchAddress) {
        preWarmPromises.set('searchAddress', this.executeToolWithCache('searchAddress', query, baseTools.searchAddress, { address: '0x' }));
      }
    }
    
    if (queryLower.includes('digital') || queryLower.includes('asset')) {
      if (baseTools.searchDigitalAsset) {
        preWarmPromises.set('searchDigitalAsset', this.executeToolWithCache('searchDigitalAsset', query, baseTools.searchDigitalAsset, { query }));
      }
    }
    
    // Note: MCP tools (getStablecoinYieldData, etc.) are added dynamically
    // and will be available when the AI processor runs
    console.log(`🚀 Started pre-warming ${preWarmPromises.size} base tool calls`);
    return preWarmPromises;
  }

  private async executeToolWithCache(toolName: string, query: string, toolFunction: any, params?: any): Promise<any> {
    try {
      // Check cache first
      const cached = await this.getCachedResult(toolName, query, params);
      if (cached !== null) {
        return cached;
      }
      
      // Execute tool
      console.log(`🔧 Executing ${toolName} for query: "${query}"`);
      const result = await toolFunction(params || { query });
      
      // Cache result
      this.setCachedResult(toolName, query, result, params);
      
      return result;
    } catch (error) {
      console.error(`❌ Error executing ${toolName}:`, error);
      return null;
    }
  }

  // Get all pre-warmed results
  async getPreWarmedResults(preWarmPromises: Map<string, Promise<any>>): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    for (const [toolName, promise] of preWarmPromises) {
      try {
        const result = await promise;
        results.set(toolName, result);
        console.log(`✅ Pre-warmed result for ${toolName}:`, result ? 'Success' : 'No data');
      } catch (error) {
        console.error(`❌ Pre-warm failed for ${toolName}:`, error);
        results.set(toolName, null);
      }
    }
    
    return results;
  }

  // Clear old cache entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }
}
