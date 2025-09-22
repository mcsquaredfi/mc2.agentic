import { useSimpleMCPAgent } from "../../hooks/useSimpleMCPAgent";
import { Button } from "../button/Button";
import { useState } from "react";

export function SimpleMCPInterface() {
  const { messages, isLoading } = useSimpleMCPAgent();
  
  // Manage input state manually like the original working app
  const [input, setInput] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // For now, just log the message - we'll integrate with the agent later
    console.log("Message to send:", input);
    setInput("");
  };

  return (
    <div className="mcp-interface p-4 max-w-4xl mx-auto">
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
              
              {/* Simple feedback buttons */}
              {message.role === 'assistant' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700">
                    👍
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                    👎
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="assistant-message mr-12">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm">
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
              placeholder="Ask about yield opportunities, token data, or DeFi strategies..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()} className="px-6">
              {isLoading ? 'Processing...' : 'Send'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
