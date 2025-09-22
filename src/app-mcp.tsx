import { MCPInterface } from "./components/mcp-ui/MCPInterface";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">MCP Agent Interface</h1>
          <p className="text-gray-600 mt-2">
            Interactive MCP server with AI Elements, streaming support, and DeFi tools
          </p>
        </div>
      </header>
      
      <main className="py-8">
        <MCPInterface />
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-gray-500 text-sm">
            <p>Powered by Cloudflare Agents SDK, AI SDK, and MCP Tools</p>
            <p className="mt-1">Streaming responses with real-time DeFi data integration</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
