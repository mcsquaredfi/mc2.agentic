# Generic MCP Server Architecture for Multi-Project Reusability

## Architecture Overview

### Generic Agent Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                    Generic MCP Server Platform                │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)  │  Agent Layer (Generic)   │  AI Models     │
│  - useAgent        │  - GenericChatAgent      │  - OpenAI      │
│  - useAgentChat    │  - HybridAIProcessor     │  - AI Gateway  │
│  - DynamicRenderer │  - AxLLMOptimizer        │  - AxLLM      │
│  - FeedbackSystem  │  - DSPyOptimizer         │  - DSPy       │
└─────────────────────────────────────────────────────────────────┘
```

### Project-Specific Configuration
```typescript
// Generic configuration interface
interface ProjectConfig {
  name: string;
  domain: string; // 'yield', 'risk', 'arbitrage', 'trading', etc.
  signatures: Signature[];
  tools: ToolDefinition[];
  metrics: MetricDefinition[];
  uiComponents: ComponentDefinition[];
}
```

## 1. Generic Agent Architecture

### Base Agent Class
```typescript
// src/agents/core/generic-agent.ts
export abstract class GenericChatAgent extends Agent<Env, State> {
  protected projectConfig: ProjectConfig;
  protected signatureManager: SignatureManager;
  protected optimizationPipeline: OptimizationPipeline;

  constructor(env: Env, projectConfig: ProjectConfig) {
    super(env);
    this.projectConfig = projectConfig;
    this.signatureManager = new SignatureManager(projectConfig.signatures);
    this.optimizationPipeline = new OptimizationPipeline(projectConfig);
  }

  // Generic message processing that works for any domain
  async processMessage(
    messages: any[],
    tools: ToolSet,
    env: Env
  ): Promise<{ text: string; toolCalls: any[]; toolResults: any[] }> {
    // 1. Determine appropriate signature based on domain and context
    const signature = this.signatureManager.selectSignature(
      messages,
      this.projectConfig.domain
    );
    
    // 2. Optimize prompt using AxLLM
    const optimizedPrompt = await this.optimizationPipeline.optimizePrompt(
      signature,
      messages,
      await this.getRecentFeedback()
    );
    
    // 3. Process with domain-specific tools
    const filteredTools = this.filterToolsForDomain(tools);
    
    // 4. Use existing Cloudflare infrastructure for inference
    return await this.processWithOptimizedPrompt(
      messages,
      filteredTools,
      env,
      optimizedPrompt
    );
  }

  // Abstract methods to be implemented by specific projects
  protected abstract filterToolsForDomain(tools: ToolSet): ToolSet;
  protected abstract getDomainSpecificPrompt(signature: Signature): string;
}
```

### Project-Specific Agent Implementation
```typescript
// src/agents/projects/yield-agent.ts
export class YieldOptimizationAgent extends GenericChatAgent {
  constructor(env: Env) {
    super(env, YIELD_PROJECT_CONFIG);
  }

  protected filterToolsForDomain(tools: ToolSet): ToolSet {
    // Filter to only yield-related tools
    const yieldTools = ['getStablecoinYieldData', 'getTopApyVaults', 'getYieldFarmingOpportunities'];
    return Object.fromEntries(
      Object.entries(tools).filter(([key]) => yieldTools.includes(key))
    );
  }

  protected getDomainSpecificPrompt(signature: Signature): string {
    return `You are a specialized DeFi yield optimization agent. Your expertise includes:
- APY analysis and comparison across protocols
- Risk-adjusted yield calculations
- Liquidity pool optimization
- Yield farming strategy recommendations
- Impermanent loss assessment
- Gas cost optimization for yield strategies`;
  }
}

// src/agents/projects/risk-agent.ts
export class RiskAssessmentAgent extends GenericChatAgent {
  constructor(env: Env) {
    super(env, RISK_PROJECT_CONFIG);
  }

  protected filterToolsForDomain(tools: ToolSet): ToolSet {
    const riskTools = ['getVaultsByRiskScore', 'searchAddress', 'getProtocolRiskData'];
    return Object.fromEntries(
      Object.entries(tools).filter(([key]) => riskTools.includes(key))
    );
  }

  protected getDomainSpecificPrompt(signature: Signature): string {
    return `You are a specialized DeFi risk assessment agent. Your expertise includes:
- Protocol security analysis
- Smart contract risk evaluation
- Liquidity risk assessment
- Market risk analysis
- Risk scoring and categorization
- Risk mitigation strategies`;
  }
}
```

## 2. Generic Signature Management

### Signature Registry
```typescript
// src/agents/core/signature-registry.ts
export class SignatureRegistry {
  private signatures: Map<string, Signature> = new Map();

  registerProjectSignatures(projectConfig: ProjectConfig): void {
    projectConfig.signatures.forEach(signature => {
      this.signatures.set(`${projectConfig.domain}:${signature.name}`, signature);
    });
  }

  getSignature(domain: string, signatureName: string): Signature | undefined {
    return this.signatures.get(`${domain}:${signatureName}`);
  }

  getAllSignaturesForDomain(domain: string): Signature[] {
    return Array.from(this.signatures.entries())
      .filter(([key]) => key.startsWith(`${domain}:`))
      .map(([, signature]) => signature);
  }
}

// Generic signature definitions
export const GENERIC_SIGNATURES = {
  analysis: new Signature(
    "user_query: str, tool_results: List[Dict] -> analysis: str, recommendations: List[str], confidence: float"
  ),
  comparison: new Signature(
    "items: List[Dict], criteria: List[str] -> comparison: Dict, ranking: List[Dict], summary: str"
  ),
  recommendation: new Signature(
    "user_profile: Dict, available_options: List[Dict] -> recommendations: List[Dict], reasoning: str"
  ),
  risk_assessment: new Signature(
    "item: Dict, risk_factors: List[str] -> risk_score: float, risk_factors: List[str], mitigation: List[str]"
  )
};
```

### Domain-Specific Signature Extensions
```typescript
// src/agents/projects/yield-signatures.ts
export const YIELD_SIGNATURES = {
  ...GENERIC_SIGNATURES,
  
  yield_optimization: new Signature(
    "vault_data: List[Dict], risk_tolerance: str -> strategies: List[Dict], apy_ranking: List[Dict], risk_adjusted_returns: List[Dict]"
  ),
  
  apy_analysis: new Signature(
    "protocol_data: List[Dict], time_period: str -> apy_trends: Dict, best_opportunities: List[Dict], risk_analysis: Dict"
  ),
  
  farming_strategy: new Signature(
    "capital: float, risk_tolerance: str, time_horizon: str -> strategy: Dict, expected_returns: Dict, risk_metrics: Dict"
  )
};

// src/agents/projects/risk-signatures.ts
export const RISK_SIGNATURES = {
  ...GENERIC_SIGNATURES,
  
  protocol_risk: new Signature(
    "protocol_data: Dict, audit_reports: List[Dict] -> risk_score: float, risk_categories: Dict, recommendations: List[str]"
  ),
  
  smart_contract_risk: new Signature(
    "contract_address: str, code_analysis: Dict -> vulnerabilities: List[str], risk_level: str, mitigation: List[str]"
  ),
  
  market_risk: new Signature(
    "token_data: Dict, market_conditions: Dict -> volatility: float, correlation_risk: float, market_risk_score: float"
  )
};
```

## 3. Generic Optimization Pipeline

### Project-Agnostic Optimization
```typescript
// src/agents/core/generic-optimization-pipeline.ts
export class GenericOptimizationPipeline {
  constructor(private projectConfig: ProjectConfig) {}

  async optimizeFromFeedback(feedbackData: FeedbackData[]): Promise<OptimizedPrompts> {
    // 1. Analyze feedback patterns using domain-agnostic methods
    const patterns = await this.analyzeFeedbackPatterns(feedbackData);
    
    // 2. Apply domain-specific optimization strategies
    const opportunities = await this.identifyOptimizationOpportunities(patterns);
    
    // 3. Generate optimized prompts using domain-specific templates
    const optimizedPrompts = await this.generateOptimizedPrompts(opportunities);
    
    // 4. Validate improvements using domain-specific metrics
    const validatedPrompts = await this.validateOptimizations(optimizedPrompts);
    
    return validatedPrompts;
  }

  private async analyzeFeedbackPatterns(feedbackData: FeedbackData[]): Promise<FeedbackPatterns> {
    // Generic pattern analysis that works across domains
    return {
      lowRatedQueries: feedbackData.filter(f => f.userFeedback.rating < 3),
      highRatedQueries: feedbackData.filter(f => f.userFeedback.rating >= 4),
      commonCategories: this.extractCommonCategories(feedbackData),
      performanceMetrics: this.calculatePerformanceMetrics(feedbackData),
      domainSpecificPatterns: await this.analyzeDomainSpecificPatterns(feedbackData)
    };
  }

  private async analyzeDomainSpecificPatterns(feedbackData: FeedbackData[]): Promise<any> {
    // Use project-specific metrics for domain analysis
    const domainAnalyzer = this.getDomainAnalyzer();
    return await domainAnalyzer.analyze(feedbackData);
  }

  private getDomainAnalyzer(): DomainAnalyzer {
    switch (this.projectConfig.domain) {
      case 'yield':
        return new YieldDomainAnalyzer();
      case 'risk':
        return new RiskDomainAnalyzer();
      case 'arbitrage':
        return new ArbitrageDomainAnalyzer();
      default:
        return new GenericDomainAnalyzer();
    }
  }
}
```

### Domain-Specific Analyzers
```typescript
// src/agents/core/domain-analyzers.ts
export abstract class DomainAnalyzer {
  abstract analyze(feedbackData: FeedbackData[]): Promise<DomainSpecificPatterns>;
}

export class YieldDomainAnalyzer extends DomainAnalyzer {
  async analyze(feedbackData: FeedbackData[]): Promise<YieldPatterns> {
    return {
      apyAccuracyIssues: this.identifyAPYAccuracyIssues(feedbackData),
      riskAssessmentProblems: this.identifyRiskAssessmentProblems(feedbackData),
      strategyRecommendationIssues: this.identifyStrategyIssues(feedbackData),
      protocolKnowledgeGaps: this.identifyProtocolGaps(feedbackData)
    };
  }
}

export class RiskDomainAnalyzer extends DomainAnalyzer {
  async analyze(feedbackData: FeedbackData[]): Promise<RiskPatterns> {
    return {
      riskScoreAccuracy: this.analyzeRiskScoreAccuracy(feedbackData),
      vulnerabilityDetection: this.analyzeVulnerabilityDetection(feedbackData),
      mitigationRecommendations: this.analyzeMitigationQuality(feedbackData)
    };
  }
}
```

## 4. Generic Storage Architecture

### Project-Agnostic Storage
```typescript
// src/agents/core/generic-storage.ts
export class GenericFeedbackStorage {
  constructor(
    private kv: KVNamespace,
    private vectorize: VectorizeIndex,
    private projectConfig: ProjectConfig
  ) {}

  async storeFeedback(feedback: FeedbackData): Promise<void> {
    // Store with project-specific key structure
    const key = this.generateProjectKey(feedback);
    const value = JSON.stringify(feedback);
    
    await this.kv.put(key, value, {
      expirationTtl: 30 * 24 * 60 * 60,
      metadata: {
        project: this.projectConfig.name,
        domain: this.projectConfig.domain,
        signature: feedback.context.signature,
        rating: feedback.userFeedback.rating,
        timestamp: Date.now()
      }
    });
  }

  private generateProjectKey(feedback: FeedbackData): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    return `feedback:${this.projectConfig.domain}:${feedback.context.signature}:${timestamp}:${randomId}`;
  }

  async getProjectFeedback(limit: number = 100): Promise<FeedbackData[]> {
    const list = await this.kv.list({
      prefix: `feedback:${this.projectConfig.domain}:`,
      limit: limit
    });

    return await Promise.all(
      list.keys.map(async (key) => {
        const value = await this.kv.get(key.name);
        return value ? JSON.parse(value) : null;
      })
    );
  }
}
```

## 5. Project Configuration System

### Configuration Registry
```typescript
// src/agents/config/project-registry.ts
export class ProjectRegistry {
  private projects: Map<string, ProjectConfig> = new Map();

  registerProject(config: ProjectConfig): void {
    this.projects.set(config.name, config);
  }

  getProject(name: string): ProjectConfig | undefined {
    return this.projects.get(name);
  }

  getAllProjects(): ProjectConfig[] {
    return Array.from(this.projects.values());
  }

  getProjectsByDomain(domain: string): ProjectConfig[] {
    return Array.from(this.projects.values()).filter(p => p.domain === domain);
  }
}

// Project configurations
export const YIELD_PROJECT_CONFIG: ProjectConfig = {
  name: 'yield-optimization',
  domain: 'yield',
  signatures: Object.values(YIELD_SIGNATURES),
  tools: YIELD_TOOLS,
  metrics: YIELD_METRICS,
  uiComponents: YIELD_UI_COMPONENTS
};

export const RISK_PROJECT_CONFIG: ProjectConfig = {
  name: 'risk-assessment',
  domain: 'risk',
  signatures: Object.values(RISK_SIGNATURES),
  tools: RISK_TOOLS,
  metrics: RISK_METRICS,
  uiComponents: RISK_UI_COMPONENTS
};

export const ARBITRAGE_PROJECT_CONFIG: ProjectConfig = {
  name: 'arbitrage-detection',
  domain: 'arbitrage',
  signatures: Object.values(ARBITRAGE_SIGNATURES),
  tools: ARBITRAGE_TOOLS,
  metrics: ARBITRAGE_METRICS,
  uiComponents: ARBITRAGE_UI_COMPONENTS
};
```

## 6. Generic MCP Server Factory

### Server Factory Pattern
```typescript
// src/agents/core/mcp-server-factory.ts
export class MCPServerFactory {
  private projectRegistry: ProjectRegistry;

  constructor() {
    this.projectRegistry = new ProjectRegistry();
    this.initializeProjects();
  }

  private initializeProjects(): void {
    // Register all available projects
    this.projectRegistry.registerProject(YIELD_PROJECT_CONFIG);
    this.projectRegistry.registerProject(RISK_PROJECT_CONFIG);
    this.projectRegistry.registerProject(ARBITRAGE_PROJECT_CONFIG);
  }

  createMCPServer(projectName: string, env: Env): GenericChatAgent {
    const projectConfig = this.projectRegistry.getProject(projectName);
    if (!projectConfig) {
      throw new Error(`Project ${projectName} not found`);
    }

    // Create project-specific agent
    switch (projectConfig.domain) {
      case 'yield':
        return new YieldOptimizationAgent(env);
      case 'risk':
        return new RiskAssessmentAgent(env);
      case 'arbitrage':
        return new ArbitrageDetectionAgent(env);
      default:
        return new GenericChatAgent(env, projectConfig);
    }
  }

  getAvailableProjects(): string[] {
    return this.projectRegistry.getAllProjects().map(p => p.name);
  }
}
```

## 7. Deployment Strategy

### Multi-Project Deployment
```typescript
// src/index.ts - Main MCP server entry point
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const projectName = url.pathname.split('/')[1] || 'yield-optimization';
    
    const factory = new MCPServerFactory();
    const agent = factory.createMCPServer(projectName, env);
    
    return await agent.fetch(request);
  }
};

// Deployment URLs:
// https://your-worker.workers.dev/yield-optimization
// https://your-worker.workers.dev/risk-assessment
// https://your-worker.workers.dev/arbitrage-detection
```

### Project-Specific Routing
```typescript
// src/agents/core/project-router.ts
export class ProjectRouter {
  private factory: MCPServerFactory;

  constructor() {
    this.factory = new MCPServerFactory();
  }

  async routeRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    if (pathSegments.length === 0) {
      return this.handleProjectList();
    }

    const projectName = pathSegments[0];
    const agent = this.factory.createMCPServer(projectName, env);
    
    // Update request URL to remove project prefix
    const updatedRequest = new Request(
      url.origin + '/' + pathSegments.slice(1).join('/'),
      request
    );
    
    return await agent.fetch(updatedRequest);
  }

  private handleProjectList(): Response {
    const projects = this.factory.getAvailableProjects();
    return new Response(JSON.stringify({ projects }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## Benefits of Generic Architecture

### 1. **Reusability**
- Single codebase supports multiple MCP servers
- Shared optimization pipeline across projects
- Common feedback and storage systems

### 2. **Scalability**
- Easy to add new projects/domains
- Independent optimization per project
- Shared infrastructure costs

### 3. **Maintainability**
- Centralized optimization logic
- Consistent patterns across projects
- Single deployment pipeline

### 4. **Flexibility**
- Project-specific customizations
- Domain-specific metrics and signatures
- Independent feedback analysis

This generic architecture ensures that your yield-focused agent can be easily extended to support risk assessment, arbitrage detection, trading strategies, or any other DeFi domain while maintaining the benefits of AxLLM optimization and Cloudflare infrastructure.

