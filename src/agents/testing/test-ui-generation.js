// Simple test script to verify UI generation is working
// Run this with: node src/agents/testing/test-ui-generation.js

import { ComponentGenerator } from '../core/component-generator.js';

// Mock environment
const mockEnv = {
  // Add any required env vars here
};

async function testUIGeneration() {
  console.log('🧪 Testing UI Generation...\n');
  
  const generator = new ComponentGenerator(mockEnv);
  
  // Test 1: Token price data
  console.log('Test 1: Token Price Component');
  try {
    const tokenData = [
      {
        token: "AERO",
        price: 0.8542,
        change24h: 5.67,
        volume: 1250000,
        marketCap: 45000000,
        chain: "Base"
      }
    ];
    
    const component = await generator.generateStyledComponent(
      tokenData,
      "What's the current price of AERO on Base?"
    );
    
    console.log('✅ Token component generated successfully!');
    console.log(`Type: ${component.componentType}`);
    console.log(`Explanation: ${component.explanation}`);
    console.log(`Code length: ${component.componentCode.length} chars`);
    console.log(`Props: ${Object.keys(component.props).join(', ')}\n`);
    
  } catch (error) {
    console.error('❌ Token component failed:', error.message);
  }
  
  // Test 2: Yield data
  console.log('Test 2: Yield Data Component');
  try {
    const yieldData = [
      {
        vaults: [
          {
            name: "USDC-USDT Pool",
            protocol: "Uniswap V3",
            apy: 12.5,
            risk: "Low",
            tvl: 2500000
          }
        ]
      }
    ];
    
    const component = await generator.generateStyledComponent(
      yieldData,
      "Show me the best yield farming opportunities"
    );
    
    console.log('✅ Yield component generated successfully!');
    console.log(`Type: ${component.componentType}`);
    console.log(`Explanation: ${component.explanation}`);
    console.log(`Code length: ${component.componentCode.length} chars\n`);
    
  } catch (error) {
    console.error('❌ Yield component failed:', error.message);
  }
  
  console.log('🎉 UI Generation test completed!');
}

// Run the test
testUIGeneration().catch(console.error);
