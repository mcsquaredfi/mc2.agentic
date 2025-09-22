# Tool Schema Architecture Analysis & Solution

## Problem Analysis

### Root Cause
The `def.shape is not a function` error occurs because we have **mixed tool schema formats** in our system:

1. **Local Tools**: Use proper Zod schemas with full method sets
2. **MCP Tools**: Use `z.any()` which creates incomplete Zod objects with only `['_def', '~standard', '_cached']` keys

### Current Architecture Issues

1. **Inconsistent Schema Creation**: 
   - Local tools: `z.object({ address: z.string() })`
   - MCP tools: `z.any()` (incomplete Zod object)

2. **Mixed Tool Sources**:
   - `src/agents/tools/index.ts` - Local tools with proper schemas
   - `src/agents/core/mcp-manager.ts` - MCP tools with `z.any()`
   - `src/tools.ts` - Additional tools with proper schemas

3. **No Schema Validation Layer**: Tools are created without validation that they're compatible with AI SDK

## Architectural Solution

### 1. Tool Schema Standardization

Create a **Tool Schema Factory** that ensures all tools use compatible schemas:

```typescript
// src/agents/core/tool-schema-factory.ts
export class ToolSchemaFactory {
  static createCompatibleSchema(schema: any): z.ZodType<any> {
    // Validate and normalize schemas for AI SDK compatibility
    if (this.isValidZodSchema(schema)) {
      return schema;
    }
    
    // Fallback to z.any() for complex schemas
    return z.any();
  }
  
  private static isValidZodSchema(schema: any): boolean {
    // Check if schema has required Zod methods
    return schema && 
           typeof schema.parse === 'function' &&
           typeof schema.safeParse === 'function' &&
           schema._def && 
           schema._def.shape;
  }
}
```

### 2. Unified Tool Registry

Create a **Unified Tool Registry** that handles all tool creation:

```typescript
// src/agents/core/unified-tool-registry.ts
export class UnifiedToolRegistry {
  private schemaFactory = new ToolSchemaFactory();
  
  registerLocalTool(name: string, definition: LocalToolDefinition): void {
    const compatibleSchema = this.schemaFactory.createCompatibleSchema(definition.schema);
    const tool = tool({
      description: definition.description,
      inputSchema: compatibleSchema,
      execute: definition.execute
    });
    this.tools.set(name, tool);
  }
  
  registerMCPTool(name: string, mcpTool: any): void {
    // Always use z.any() for MCP tools since they're validated by MCP server
    const tool = tool({
      description: mcpTool.description,
      inputSchema: z.any(),
      execute: mcpTool.execute
    });
    this.tools.set(name, tool);
  }
}
```

### 3. Tool Creation Pipeline

```typescript
// src/agents/core/tool-pipeline.ts
export class ToolPipeline {
  constructor(
    private registry: UnifiedToolRegistry,
    private mcpManager: MCPManager
  ) {}
  
  async initializeTools(): Promise<Record<string, any>> {
    // 1. Register local tools with schema validation
    this.registerLocalTools();
    
    // 2. Register MCP tools with standardized format
    await this.registerMCPTools();
    
    // 3. Validate all tools are AI SDK compatible
    this.validateToolCompatibility();
    
    return this.registry.getTools();
  }
  
  private registerLocalTools(): void {
    const localTools = getLocalTools();
    Object.entries(localTools).forEach(([name, tool]) => {
      this.registry.registerLocalTool(name, tool);
    });
  }
  
  private async registerMCPTools(): Promise<void> {
    const mcpTools = await this.mcpManager.getTools();
    Object.entries(mcpTools).forEach(([name, tool]) => {
      this.registry.registerMCPTool(name, tool);
    });
  }
  
  private validateToolCompatibility(): void {
    const tools = this.registry.getTools();
    Object.entries(tools).forEach(([name, tool]) => {
      if (!this.isAISDKCompatible(tool)) {
        throw new Error(`Tool ${name} is not AI SDK compatible`);
      }
    });
  }
}
```

## Implementation Plan

### Phase 1: Create Schema Factory
1. Create `ToolSchemaFactory` with validation logic
2. Test with existing schemas to ensure compatibility

### Phase 2: Create Unified Registry
1. Create `UnifiedToolRegistry` 
2. Migrate existing tool registration to use registry

### Phase 3: Create Tool Pipeline
1. Create `ToolPipeline` for centralized tool initialization
2. Update `UnifiedChatAgent` to use pipeline

### Phase 4: Validation & Testing
1. Add comprehensive tool compatibility tests
2. Ensure all tools work with AI SDK

## Benefits

1. **Consistent Schema Format**: All tools use compatible schemas
2. **Centralized Management**: Single place for tool creation and validation
3. **Error Prevention**: Schema validation prevents AI SDK incompatibility
4. **Maintainable**: Clear separation of concerns
5. **Testable**: Each component can be tested independently

## Migration Strategy

1. **Backward Compatible**: Existing tools continue to work
2. **Gradual Migration**: Move tools to new system incrementally
3. **Validation**: Add tests to ensure no regressions
4. **Documentation**: Update architecture docs with new patterns


