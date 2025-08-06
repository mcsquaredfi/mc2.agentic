import type { Env } from "./agents/types";
import { MC2MCPServer } from "./mcp/mc2-mcp-server";
import Mc2fiChatAgent from "./agents/mc2fi-agent";

export class Chat extends Mc2fiChatAgent {}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const { pathname } = new URL(request.url);

    // support both SSE (legacy) and Streamable HTTP (new standard)
    if (pathname.startsWith("/sse")) {
      return MC2MCPServer.serveSSE("/sse", {
        binding: "MC2MCPServer",
      }).fetch(request, env, ctx);
    }

    if (pathname.startsWith("/mcp")) {
      return MC2MCPServer.serve("/mcp", {
        binding: "MC2MCPServer",
      }).fetch(request, env, ctx);
    }

    return new Response(
      "MC² Finance MCP Server\nAvailable endpoints:\n- /sse (Server-Sent Events)\n- /mcp (Streamable HTTP)",
      {
        headers: { "content-type": "text/plain" },
      }
    );
  },
} satisfies ExportedHandler<Env>;

export { MC2MCPServer };
