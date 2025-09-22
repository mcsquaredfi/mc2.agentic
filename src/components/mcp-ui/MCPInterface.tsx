import { useMCPAgent } from "../../hooks/useMCPAgent";
import { Button } from "../button/Button";
import { useState } from "react";

export function MCPInterface() {
  const { 
    messages, 
    sendMCPMessage, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isStreaming,
    isConnected 
  } = useMCPAgent();

  const [streamingContent, setStreamingContent] = useState("");

  return (
    <div className="mcp-interface p-4 max-w-4xl mx-auto">
      {/* Connection Status */}
      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          {isConnected ? 'Connected to MCP Agent' : 'Disconnected'}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-container mb-6 space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
            <div className={`p-4 rounded-lg shadow-sm ${
              message.role === 'user' 
                ? 'bg-blue-50 border border-blue-200 ml-12' 
                : 'bg-gray-50 border border-gray-200 mr-12'
            }`}>
              <div className="font-medium text-sm mb-1 text-gray-600">
                {message.role === 'user' ? 'You' : 'MCP Agent'}
              </div>
              
              <div className="text-gray-900 whitespace-pre-wrap">
                {message.content}
              </div>
              
              {/* Feedback buttons for assistant messages */}
              {message.role === 'assistant' && (
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    👍 Helpful
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    👎 Not helpful
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Streaming indicator */}
        {isStreaming && (
          <div className="assistant-message mr-12">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm">
              <div className="font-medium text-sm mb-2 text-gray-600">MCP Agent</div>
              <div className="flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                <span className="text-gray-700">Processing with MCP tools...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about MCP tools, DeFi data, yield strategies, or token information..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isStreaming || !isConnected}
            />
            <Button 
              type="submit" 
              disabled={isStreaming || !input.trim() || !isConnected}
              className="px-6"
            >
              {isStreaming ? 'Processing...' : 'Send'}
            </Button>
          </div>
          
          {/* Quick action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sendMCPMessage("Show me current yield opportunities")}
              disabled={isStreaming || !isConnected}
            >
              💰 Yield Opportunities
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sendMCPMessage("What are the top APY vaults?")}
              disabled={isStreaming || !isConnected}
            >
              📈 Top APY Vaults
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sendMCPMessage("Search for stablecoin yield data")}
              disabled={isStreaming || !isConnected}
            >
              🏦 Stablecoin Yields
            </Button>
          </div>
        </form>
      </div>

      {/* MCP Tools Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Available MCP Tools</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div>🔍 <strong>searchTokens</strong> - Search for token information</div>
          <div>📊 <strong>searchDigitalAsset</strong> - Get digital asset market data</div>
          <div>🔗 <strong>searchAddress</strong> - Analyze blockchain addresses</div>
          <div>💰 <strong>getStablecoinYieldData</strong> - Current stablecoin yields</div>
          <div>📈 <strong>getTopApyVaults</strong> - Highest APY vaults</div>
          <div>🌾 <strong>getYieldFarmingOpportunities</strong> - Yield farming strategies</div>
        </div>
      </div>
    </div>
  );
}
