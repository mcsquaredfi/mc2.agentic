import type { Connection } from "agents";
import type { MCPManager } from "../core/mcp-manager";

export class MCPTester {
  constructor(private mcpManager: MCPManager) {}

  async runFullTest(connection: Connection): Promise<void> {
    console.info("=== MCP TOOL TEST STARTED ===");
    
    try {
      if (!this.mcpManager.isConnected()) {
        const errorMsg = "MCP not connected - cannot test tools";
        console.error(errorMsg);
        connection.send(JSON.stringify({
          type: "response",
          content: errorMsg,
          timestamp: Date.now(),
        }));
        return;
      }

      const mcpTools = this.mcpManager.getTools();
      console.info("Available MCP tools:", Object.keys(mcpTools));

      const yieldToolName = Object.keys(mcpTools).find(name => 
        name.includes('Yield') || name.includes('Vault') || name.includes('Apy')
      );

      if (!yieldToolName) {
        const errorMsg = "No yield-related MCP tools found";
        console.error(errorMsg);
        connection.send(JSON.stringify({
          type: "response",
          content: errorMsg,
          timestamp: Date.now(),
        }));
        return;
      }

      await this.testToolWithDifferentArgs(connection, yieldToolName);

      connection.send(JSON.stringify({
        type: "response",
        content: `MCP tool test completed. Check console logs for detailed results. Tested tool: ${yieldToolName}`,
        timestamp: Date.now(),
      }));

    } catch (error) {
      console.error("MCP test error:", error);
      connection.send(JSON.stringify({
        type: "error",
        content: `MCP test failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      }));
    }
    
    console.info("=== MCP TOOL TEST COMPLETED ===");
  }

  private async testToolWithDifferentArgs(connection: Connection, toolName: string): Promise<void> {
    console.info("Testing tool:", toolName);
    
    // Test 1: Minimal searchQuery
    await this.runTest("Test 1: Calling with minimal searchQuery", toolName, {
      searchQuery: { searchTerm: "yield" }
    });

    // Test 2: SearchQuery + limit
    await this.runTest("Test 2: Calling with searchQuery + limit", toolName, {
      searchQuery: { searchTerm: "stablecoin", limit: 5 }
    });

    // Test 3: Full searchQuery
    await this.runTest("Test 3: Calling with full searchQuery", toolName, {
      searchQuery: { 
        searchTerm: "vault",
        limit: 10, 
        sorting: { field: "apy_7d", direction: "desc" }
      }
    });
  }

  private async runTest(testName: string, toolName: string, args: any): Promise<void> {
    console.info(testName);
    try {
      const result = await this.mcpManager.testTool(toolName, args);
      console.info(`${testName} result:`, {
        type: typeof result,
        isNull: result === null,
        isUndefined: result === undefined,
        length: result ? JSON.stringify(result).length : 0,
        preview: result ? JSON.stringify(result).substring(0, 300) : "null/undefined"
      });
    } catch (error) {
      console.error(`${testName} error:`, error);
    }
  }
}
