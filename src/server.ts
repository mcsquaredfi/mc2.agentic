import { routeAgentRequest } from "agents";
import Mc2fiChatAgent from "./agents/mc2fi-agent";
import type { Env } from "./agents/types";

/**
 * To use the original Chat agent, comment out the export below and uncomment the export above.
 */
// --- Mc2fiChatAgent as the active Chat agent ---
export class Chat extends Mc2fiChatAgent {}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
      );
      return new Response("OPENAI_API_KEY is not set", { status: 500 });
    }

    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
