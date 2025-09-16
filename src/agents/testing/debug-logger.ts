export class DebugLogger {
  private static isDebugMode = process.env.NODE_ENV === 'development';

  static info(message: string, data?: any): void {
    if (this.isDebugMode) {
      if (data) {
        console.info(`[DEBUG] ${message}`, data);
      } else {
        console.info(`[DEBUG] ${message}`);
      }
    }
  }

  static error(message: string, error?: any): void {
    if (this.isDebugMode) {
      if (error) {
        console.error(`[DEBUG] ${message}`, error);
      } else {
        console.error(`[DEBUG] ${message}`);
      }
    }
  }

  static warn(message: string, data?: any): void {
    if (this.isDebugMode) {
      if (data) {
        console.warn(`[DEBUG] ${message}`, data);
      } else {
        console.warn(`[DEBUG] ${message}`);
      }
    }
  }

  static logToolStructure(toolName: string, tool: any): void {
    if (this.isDebugMode) {
      console.info("=== COMPLETE TOOL STRUCTURE ===");
      console.info("Tool name:", toolName);
      console.info("Tool object:", JSON.stringify(tool, null, 2));
      console.info("=== END TOOL STRUCTURE ===");
    }
  }

  static logMCPStatus(mcpHost: string | undefined, mcpConnected: boolean, mcpClient: boolean): void {
    if (this.isDebugMode) {
      console.info("MCP connection status:", {
        mcpHost,
        mcpConnected,
        mcpClient
      });
    }
  }

  static logAICall(modelType: string, messageCount: number, toolCount: number, lastMessage: any): void {
    if (this.isDebugMode) {
      console.info("Calling AI model with:", {
        modelType,
        messageCount,
        toolCount,
        lastMessage
      });
    }
  }

  static logAIResponse(textLength: number, textPreview: string, isEmpty: boolean, toolCallsCount: number, toolResultsCount: number): void {
    if (this.isDebugMode) {
      console.info("AI model response:", { 
        textLength, 
        textPreview,
        isEmpty,
        toolCallsCount,
        toolResultsCount
      });
    }
  }
}
