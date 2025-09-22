# Plugin-Based Architecture for Multi-Project MCP Servers

## Architecture Overview

### Plugin-Based System Design
```
┌─────────────────────────────────────────────────────────────────┐
│                    Core MCP Server Platform                   │
├─────────────────────────────────────────────────────────────────┤
│  Core System     │  Plugin Registry    │  Project Plugins     │
│  - Generic Agent │  - Plugin Loader    │  - yield/            │
│  - AxLLM Core    │  - Config Manager   │  - risk/             │
│  - DSPy Core     │  - Router           │  - arbitrage/        │
│  - Storage Core  │  - Factory          │  - trading/          │
└─────────────────────────────────────────────────────────────────┘
```

### Environment-Based Plugin Configuration
```bash
# .dev.vars
ENABLED_PLUGINS=yield,risk,arbitrage
DEFAULT_PLUGIN=yield
PLUGIN_CONFIG_PATH=./src/agents/plugins
```

## 1. Project Structure

### Core System Structure
```
src/
├── agents/
│   ├── core/                    # Core system (generic)
│   │   ├── generic-agent.ts
│   │   ├── plugin-registry.ts
│   │   ├── plugin-loader.ts
│   │   ├── axllm-optimizer.ts
│   │   ├── dspy-optimizer.ts
│   │   └── storage-manager.ts
│   ├── plugins/                 # Project-specific plugins
│   │   ├── yield/
│   │   │   ├── index.ts
│   │   │   ├── agent.ts
│   │   │   ├── signatures.ts
│   │   │   ├── tools.ts
│   │   │   ├── metrics.ts
│   │   │   └── ui-components.ts
│   │   ├── risk/
│   │   │   ├── index.ts
│   │   │   ├── agent.ts
│   │   │   ├── signatures.ts
│   │   │   ├── tools.ts
│   │   │   ├── metrics.ts
│   │   │   └── ui-components.ts
│   │   └── arbitrage/
│   │       ├── index.ts
│   │       ├── agent.ts
│   │       ├── signatures.ts
│   │       ├── tools.ts
│   │       ├── metrics.ts
│   │       └── ui-components.ts
│   └── types/
│       ├── plugin.ts
│       └── core.ts
```

## 2. Plugin Interface Definition

### Core Plugin Interface
```typescript
// src/agents/types/plugin.ts
export interface PluginConfig {
  name: string;
  version: string;
  domain: string;
  description: string;
  enabled: boolean;
  dependencies?: string[];
}

export interface PluginManifest {
  config: PluginConfig;
  signatures: Signature[];
  tools: ToolDefinition[];
  metrics: MetricDefinition[];
  uiComponents: ComponentDefinition[];
  agentClass: typeof PluginAgent;
}

export abstract class PluginAgent extends GenericAgent {
  abstract getDomainSpecificPrompt(signature: Signature): string;
  abstract filterToolsForDomain(tools: ToolSet): ToolSet;
  abstract getDomainSpecificMetrics(): MetricDefinition[];
}
```

## 3. Plugin Registry System

### Plugin Registry Implementation
```typescript
// src/agents/core/plugin-registry.ts
export class PluginRegistry {
  private plugins: Map<string, PluginManifest> = new Map();
  private enabledPlugins: Set<string> = new Set();

  constructor(private env: Env) {
    this.loadEnabledPlugins();
  }

  private loadEnabledPlugins(): void {
    const enabledPlugins = this.env.ENABLED_PLUGINS?.split(',') || ['yield'];
    const defaultPlugin = this.env.DEFAULT_PLUGIN || 'yield';
    
    console.log(`🔌 Loading enabled plugins: ${enabledPlugins.join(', ')}`);
    
    enabledPlugins.forEach(pluginName => {
      this.enabledPlugins.add(pluginName.trim());
    });
  }

  async registerPlugin(pluginName: string): Promise<void> {
    if (!this.enabledPlugins.has(pluginName)) {
      console.log(`⚠️ Plugin ${pluginName} is not enabled, skipping registration`);
      return;
    }

    try {
      const plugin = await this.loadPlugin(pluginName);
      this.plugins.set(pluginName, plugin);
      console.log(`✅ Registered plugin: ${pluginName}`);
    } catch (error) {
      console.error(`❌ Failed to register plugin ${pluginName}:`, error);
    }
  }

  private async loadPlugin(pluginName: string): Promise<PluginManifest> {
    const pluginPath = `${this.env.PLUGIN_CONFIG_PATH || './src/agents/plugins'}/${pluginName}`;
    
    // Dynamic import of plugin
    const pluginModule = await import(pluginPath);
    return pluginModule.default;
  }

  getPlugin(pluginName: string): PluginManifest | undefined {
    return this.plugins.get(pluginName);
  }

  getEnabledPlugins(): string[] {
    return Array.from(this.enabledPlugins);
  }

  getAllPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  isPluginEnabled(pluginName: string): boolean {
    return this.enabledPlugins.has(pluginName);
  }
}
```

## 4. Plugin Loader

### Dynamic Plugin Loading
```typescript
// src/agents/core/plugin-loader.ts
export class PluginLoader {
  constructor(
    private registry: PluginRegistry,
    private env: Env
  ) {}

  async loadAllPlugins(): Promise<void> {
    const enabledPlugins = this.registry.getEnabledPlugins();
    
    console.log(`🚀 Loading ${enabledPlugins.length} enabled plugins...`);
    
    await Promise.all(
      enabledPlugins.map(pluginName => 
        this.registry.registerPlugin(pluginName)
      )
    );
    
    console.log(`✅ Successfully loaded ${this.registry.getAllPlugins().length} plugins`);
  }

  async createAgent(pluginName: string): Promise<PluginAgent> {
    const plugin = this.registry.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found or not enabled`);
    }

    const AgentClass = plugin.agentClass;
    return new AgentClass(this.env, plugin);
  }

  getAvailablePlugins(): string[] {
    return this.registry.getEnabledPlugins();
  }
}
```

## 5. Project-Specific Plugin Implementation

### Yield Plugin Example
```typescript
// src/agents/plugins/yield/index.ts
import { PluginManifest } from '../../types/plugin';
import { YieldAgent } from './agent';
import { YIELD_SIGNATURES } from './signatures';
import { YIELD_TOOLS } from './tools';
import { YIELD_METRICS } from './metrics';
import { YIELD_UI_COMPONENTS } from './ui-components';

const manifest: PluginManifest = {
  config: {
    name: 'yield',
    version: '1.0.0',
    domain: 'yield-optimization',
    description: 'DeFi yield optimization and farming strategies',
    enabled: true
  },
  signatures: YIELD_SIGNATURES,
  tools: YIELD_TOOLS,
  metrics: YIELD_METRICS,
  uiComponents: YIELD_UI_COMPONENTS,
  agentClass: YieldAgent
};

export default manifest;
```

```typescript
// src/agents/plugins/yield/agent.ts
import { PluginAgent } from '../../types/plugin';
import { PluginManifest } from '../../types/plugin';

export class YieldAgent extends PluginAgent {
  constructor(env: Env, manifest: PluginManifest) {
    super(env, manifest);
  }

  getDomainSpecificPrompt(signature: Signature): string {
    return `You are a specialized DeFi yield optimization agent. Your expertise includes:
- APY analysis and comparison across protocols
- Risk-adjusted yield calculations
- Liquidity pool optimization
- Yield farming strategy recommendations
- Impermanent loss assessment
- Gas cost optimization for yield strategies

Focus on providing actionable, data-driven yield optimization advice.`;
  }

  filterToolsForDomain(tools: ToolSet): ToolSet {
    const yieldTools = [
      'getStablecoinYieldData',
      'getTopApyVaults', 
      'getYieldFarmingOpportunities',
      'getVaultsByRiskScore',
      'searchVaults'
    ];
    
    return Object.fromEntries(
      Object.entries(tools).filter(([key]) => yieldTools.includes(key))
    );
  }

  getDomainSpecificMetrics(): MetricDefinition[] {
    return [
      {
        name: 'apy_accuracy',
        description: 'Accuracy of APY predictions and calculations',
        weight: 0.4
      },
      {
        name: 'risk_assessment_quality',
        description: 'Quality of risk assessment and warnings',
        weight: 0.3
      },
      {
        name: 'strategy_relevance',
        description: 'Relevance of yield strategy recommendations',
        weight: 0.3
      }
    ];
  }
}
```

```typescript
// src/agents/plugins/yield/signatures.ts
import { Signature } from 'axllm';

export const YIELD_SIGNATURES = [
  new Signature(
    "vault_data: List[Dict], risk_tolerance: str -> strategies: List[Dict], apy_ranking: List[Dict], risk_adjusted_returns: List[Dict]"
  ),
  new Signature(
    "protocol_data: List[Dict], time_period: str -> apy_trends: Dict, best_opportunities: List[Dict], risk_analysis: Dict"
  ),
  new Signature(
    "capital: float, risk_tolerance: str, time_horizon: str -> strategy: Dict, expected_returns: Dict, risk_metrics: Dict"
  )
];
```

```typescript
// src/agents/plugins/yield/tools.ts
export const YIELD_TOOLS = [
  {
    name: 'getStablecoinYieldData',
    description: 'Get current stablecoin yield opportunities',
    parameters: {
      type: 'object',
      properties: {
        risk_level: { type: 'string', enum: ['low', 'medium', 'high'] }
      }
    }
  },
  {
    name: 'getTopApyVaults',
    description: 'Get highest APY vaults across protocols',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10 }
      }
    }
  }
  // ... more yield-specific tools
];
```

### Risk Plugin Example
```typescript
// src/agents/plugins/risk/index.ts
import { PluginManifest } from '../../types/plugin';
import { RiskAgent } from './agent';
import { RISK_SIGNATURES } from './signatures';
import { RISK_TOOLS } from './tools';
import { RISK_METRICS } from './metrics';
import { RISK_UI_COMPONENTS } from './ui-components';

const manifest: PluginManifest = {
  config: {
    name: 'risk',
    version: '1.0.0',
    domain: 'risk-assessment',
    description: 'DeFi risk assessment and security analysis',
    enabled: true
  },
  signatures: RISK_SIGNATURES,
  tools: RISK_TOOLS,
  metrics: RISK_METRICS,
  uiComponents: RISK_UI_COMPONENTS,
  agentClass: RiskAgent
};

export default manifest;
```

## 6. Core System Integration

### Main Server Entry Point
```typescript
// src/index.ts
import { PluginLoader } from './agents/core/plugin-loader';
import { PluginRegistry } from './agents/core/plugin-registry';

let pluginLoader: PluginLoader;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize plugin system on first request
    if (!pluginLoader) {
      const registry = new PluginRegistry(env);
      pluginLoader = new PluginLoader(registry, env);
      await pluginLoader.loadAllPlugins();
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract plugin name from URL
    const pluginName = pathSegments[0] || env.DEFAULT_PLUGIN || 'yield';
    
    if (!pluginLoader.getAvailablePlugins().includes(pluginName)) {
      return new Response(JSON.stringify({ 
        error: `Plugin ${pluginName} not available`,
        availablePlugins: pluginLoader.getAvailablePlugins()
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const agent = await pluginLoader.createAgent(pluginName);
      return await agent.fetch(request);
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: `Failed to create agent for plugin ${pluginName}`,
        details: error.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
```

## 7. Environment Configuration

### Development Configuration
```bash
# .dev.vars
ENABLED_PLUGINS=yield,risk
DEFAULT_PLUGIN=yield
PLUGIN_CONFIG_PATH=./src/agents/plugins
```

### Production Configuration
```bash
# Production environment variables
ENABLED_PLUGINS=yield,risk,arbitrage,trading
DEFAULT_PLUGIN=yield
PLUGIN_CONFIG_PATH=./src/agents/plugins
```

### Wrangler Configuration
```toml
# wrangler.toml
[vars]
ENABLED_PLUGINS = "yield,risk"
DEFAULT_PLUGIN = "yield"
PLUGIN_CONFIG_PATH = "./src/agents/plugins"

[[kv_namespaces]]
binding = "FEEDBACK_KV"
id = "your-feedback-kv-id"

[[vectorize]]
binding = "FEEDBACK_VECTORIZE"
index_name = "feedback-embeddings"
```

## 8. Plugin Development Workflow

### Adding a New Plugin
1. **Create Plugin Folder**: `src/agents/plugins/new-plugin/`
2. **Implement Plugin Files**:
   - `index.ts` - Plugin manifest
   - `agent.ts` - Plugin-specific agent
   - `signatures.ts` - AxLLM signatures
   - `tools.ts` - Tool definitions
   - `metrics.ts` - Domain-specific metrics
   - `ui-components.ts` - UI components
3. **Update Environment**: Add plugin to `ENABLED_PLUGINS`
4. **Deploy**: Plugin is automatically loaded

### Plugin Testing
```typescript
// Test individual plugin
const pluginLoader = new PluginLoader(registry, env);
await pluginLoader.loadAllPlugins();
const agent = await pluginLoader.createAgent('yield');
// Test agent functionality
```

## 9. Benefits of Plugin Architecture

### **1. Isolation**
- Project-specific code isolated in plugin folders
- No cross-plugin dependencies
- Independent development and testing

### **2. Configuration-Driven**
- Environment variables control which plugins are available
- Easy to enable/disable plugins without code changes
- Different configurations for dev/staging/production

### **3. Scalability**
- Easy to add new plugins
- Shared core system reduces duplication
- Independent plugin versioning

### **4. Maintainability**
- Clear separation of concerns
- Plugin-specific optimizations
- Centralized core system updates

### **5. Deployment Flexibility**
- Deploy only enabled plugins
- Different plugin sets for different environments
- A/B testing with different plugin configurations

This plugin-based architecture ensures that your DeFi yield project code is properly isolated while providing a scalable foundation for multiple MCP servers and projects.

