// CRITICAL: NEVER generate fake, example, or demo data. Only show real information from tool calls.
import { routeAgentRequest } from "agents";
import type { Env } from "./agents/types";
import { SimpleUnifiedChatAgent } from "./agents/core/simple-unified-chat-agent";

// Re-export the simplified agent as the Chat class for Durable Objects
export { SimpleUnifiedChatAgent as Chat } from "./agents/core/simple-unified-chat-agent";

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 * 
 * ARCHITECTURAL DECISIONS:
 * 1. Uses routeAgentRequest() instead of manual routing because:
 *    - Automatically handles WebSocket upgrades and HTTP requests
 *    - Provides proper authentication hooks (onBeforeConnect, onBeforeRequest)
 *    - Follows Cloudflare's recommended pattern for agent routing
 *    - Simplifies the codebase by removing manual routing logic
 * 
 * 2. Re-exports UnifiedChatAgent as Chat because:
 *    - Durable Objects require a specific export name for the binding
 *    - Maintains compatibility with wrangler.jsonc configuration
 *    - Allows the agent to be instantiated as a Durable Object
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    console.log("🔧 Worker fetch called with:", request.url);
    
    if (!env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
      );
      return new Response("OPENAI_API_KEY is not set", { status: 500 });
    }

    try {
      // Use routeAgentRequest for proper AI SDK integration
      return (await routeAgentRequest(request, env)) || 
        new Response(JSON.stringify({ error: "No agent handler found" }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
      console.error("❌ Error in worker fetch:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
} satisfies ExportedHandler<Env>;