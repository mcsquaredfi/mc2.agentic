import { ComponentGenerator } from "../core/component-generator";
import type { Env } from "../types";

// Mock environment for testing
const mockEnv: Env = {
  // Add any required environment variables here
} as Env;

export class UIGenerationTester {
  private componentGenerator: ComponentGenerator;

  constructor() {
    this.componentGenerator = new ComponentGenerator(mockEnv);
  }

  async testTokenPriceComponent() {
    console.log("Testing token price component generation...");
    
    const mockToolResults = [
      {
        token: "AERO",
        price: 0.8542,
        change24h: 5.67,
        volume: 1250000,
        marketCap: 45000000,
        chain: "Base"
      }
    ];

    const context = "What's the current price of AERO on Base?";

    try {
      const component = await this.componentGenerator.generateStyledComponent(
        mockToolResults,
        context
      );

      console.log("✅ Token price component generated successfully!");
      console.log("Component type:", component.componentType);
      console.log("Explanation:", component.explanation);
      console.log("Code length:", component.componentCode.length);
      console.log("Props:", Object.keys(component.props));
      
      return component;
    } catch (error) {
      console.error("❌ Failed to generate token price component:", error);
      throw error;
    }
  }

  async testYieldDataComponent() {
    console.log("Testing yield data component generation...");
    
    const mockToolResults = [
      {
        vaults: [
          {
            name: "USDC-USDT Pool",
            protocol: "Uniswap V3",
            apy: 12.5,
            risk: "Low",
            tvl: 2500000
          },
          {
            name: "ETH-USDC Pool", 
            protocol: "Curve",
            apy: 8.3,
            risk: "Medium",
            tvl: 5000000
          }
        ]
      }
    ];

    const context = "Show me the top yield farming opportunities";

    try {
      const component = await this.componentGenerator.generateStyledComponent(
        mockToolResults,
        context
      );

      console.log("✅ Yield data component generated successfully!");
      console.log("Component type:", component.componentType);
      console.log("Explanation:", component.explanation);
      console.log("Code length:", component.componentCode.length);
      
      return component;
    } catch (error) {
      console.error("❌ Failed to generate yield data component:", error);
      throw error;
    }
  }

  async runAllTests() {
    console.log("🚀 Starting UI Generation Tests...\n");
    
    try {
      await this.testTokenPriceComponent();
      console.log("");
      await this.testYieldDataComponent();
      console.log("\n✅ All UI generation tests passed!");
    } catch (error) {
      console.error("\n❌ UI generation tests failed:", error);
      throw error;
    }
  }
}

// UIGenerationTester is already exported as a class above
