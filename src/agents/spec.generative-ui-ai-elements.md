# Generative UI with AI Elements Integration Specification

## Overview

This document outlines the integration strategy for enhancing the existing generative UI system with AI Elements, providing better component generation capabilities and improved user experience through pre-built AI-optimized components.

## Current Generative UI Architecture

### Existing System Analysis

```typescript
// Current Component Generation Flow
User Query → Tool Execution → ComponentGenerator → Custom JSX → SafeJSXRenderer → UI Display
```

### Current Limitations
1. **Manual Component Creation**: Each component is generated from scratch
2. **Limited Component Library**: Relies on custom base components
3. **No AI-Optimized Components**: Missing specialized AI interaction components
4. **Complex Generation Logic**: Heavy prompt engineering for component creation
5. **Limited Accessibility**: Manual accessibility implementation

## AI Elements Integration Strategy

### 1. Enhanced Component Library

#### AI Elements Component Mapping
```typescript
// src/agents/core/ai-elements-mapping.ts
export const AI_ELEMENTS_MAPPING = {
  // Data Display Components
  'data-table': {
    element: 'AITable',
    props: ['data', 'columns', 'sortable', 'filterable'],
    useCase: 'Structured data display (vaults, tokens, yields)',
  },
  'data-card': {
    element: 'AICard',
    props: ['title', 'content', 'actions', 'metadata'],
    useCase: 'Individual data items (vault details, token info)',
  },
  'data-list': {
    element: 'AIList',
    props: ['items', 'renderItem', 'groupBy', 'searchable'],
    useCase: 'List of items (vaults, tokens, strategies)',
  },

  // Interactive Components
  'interactive-button': {
    element: 'AIButton',
    props: ['onClick', 'variant', 'loading', 'disabled'],
    useCase: 'Action buttons (invest, withdraw, analyze)',
  },
  'interactive-form': {
    element: 'AIForm',
    props: ['fields', 'onSubmit', 'validation', 'initialValues'],
    useCase: 'User input forms (filters, preferences)',
  },
  'interactive-modal': {
    element: 'AIModal',
    props: ['open', 'onClose', 'title', 'content'],
    useCase: 'Detailed views, confirmations',
  },

  // Visualization Components
  'chart-line': {
    element: 'AIChart',
    props: ['type', 'data', 'options', 'responsive'],
    useCase: 'Price charts, yield trends',
  },
  'chart-bar': {
    element: 'AIChart',
    props: ['type', 'data', 'options', 'responsive'],
    useCase: 'Comparison charts, TVL displays',
  },
  'chart-pie': {
    element: 'AIChart',
    props: ['type', 'data', 'options', 'responsive'],
    useCase: 'Portfolio allocation, risk distribution',
  },

  // Content Components
  'content-text': {
    element: 'AIText',
    props: ['content', 'format', 'highlight', 'truncate'],
    useCase: 'Formatted text content',
  },
  'content-code': {
    element: 'AICodeBlock',
    props: ['code', 'language', 'copyable', 'executable'],
    useCase: 'Code snippets, smart contracts',
  },
  'content-image': {
    element: 'AIImage',
    props: ['src', 'alt', 'lazy', 'responsive'],
    useCase: 'Token logos, protocol images',
  },
};
```

### 2. Enhanced Component Generator

#### AI Elements-Aware Generation
```typescript
// src/agents/core/component-generator.ts
export class ComponentGenerator {
  private aiElementsMapping = AI_ELEMENTS_MAPPING;

  async generateStyledComponent(
    toolResults: any[],
    context: string
  ): Promise<UIComponentSchema> {
    const componentStartTime = Date.now();
    
    // Analyze tool results to determine best AI Elements
    const recommendedElements = this.analyzeToolResults(toolResults);
    
    // Generate component using AI Elements
    const result = await this.generateWithAIElements(
      toolResults,
      context,
      recommendedElements
    );

    return result;
  }

  private analyzeToolResults(toolResults: any[]): RecommendedElement[] {
    const recommendations: RecommendedElement[] = [];

    for (const result of toolResults) {
      if (this.isTabularData(result)) {
        recommendations.push({
          type: 'data-table',
          confidence: 0.9,
          reasoning: 'Structured data detected',
        });
      }

      if (this.isChartData(result)) {
        recommendations.push({
          type: 'chart-line',
          confidence: 0.8,
          reasoning: 'Time series data detected',
        });
      }

      if (this.isListData(result)) {
        recommendations.push({
          type: 'data-list',
          confidence: 0.7,
          reasoning: 'List data detected',
        });
      }
    }

    return recommendations;
  }

  private async generateWithAIElements(
    toolResults: any[],
    context: string,
    recommendedElements: RecommendedElement[]
  ): Promise<UIComponentSchema> {
    const model = this.getModel();
    
    const prompt = `
## AI ELEMENTS COMPONENT LIBRARY

You are generating a React component using AI Elements for optimal AI interaction.

### AVAILABLE AI ELEMENTS:
${Object.entries(this.aiElementsMapping).map(([key, config]) => `
- **${key}**: ${config.element}
  - Props: ${config.props.join(', ')}
  - Use case: ${config.useCase}
`).join('\n')}

### RECOMMENDED ELEMENTS FOR THIS CONTEXT:
${recommendedElements.map(rec => `
- ${rec.type}: ${rec.reasoning} (confidence: ${rec.confidence})
`).join('\n')}

### CURRENT CONTEXT:
User Message: "${context}"
Tool Results: ${JSON.stringify(toolResults, null, 2)}

### GENERATION REQUIREMENTS:
1. Use the most appropriate AI Elements for the data type
2. Extract and structure data from toolResults as props
3. Ensure proper TypeScript types
4. Include accessibility attributes
5. Make components responsive and mobile-friendly
6. Use semantic HTML structure
7. Include proper error handling
8. Add loading states where appropriate

### OUTPUT FORMAT:
Return JSX using AI Elements components with proper props.
Import statements should use: import { ${this.getRequiredImports(recommendedElements)} } from '@ai-sdk/ui';

### EXAMPLE:
\`\`\`jsx
import { AICard, AITable, AIButton } from '@ai-sdk/ui';

export const GeneratedComponent = ({ data }) => (
  <AICard title="DeFi Analysis" className="w-full">
    <AITable 
      data={data.vaults} 
      columns={[
        { key: 'name', label: 'Vault Name' },
        { key: 'apy', label: 'APY', format: 'percentage' },
        { key: 'tvl', label: 'TVL', format: 'currency' }
      ]}
      sortable
      filterable
    />
    <AIButton 
      onClick={() => console.log('Analyze more')}
      variant="primary"
      className="mt-4"
    >
      Analyze More
    </AIButton>
  </AICard>
);
\`\`\`
`;

    const result = await generateObject({
      model,
      schema: UIComponentSchema,
      prompt,
    });

    return result.object;
  }

  private getRequiredImports(recommendedElements: RecommendedElement[]): string {
    const elements = new Set<string>();
    
    recommendedElements.forEach(rec => {
      const mapping = this.aiElementsMapping[rec.type];
      if (mapping) {
        elements.add(mapping.element);
      }
    });

    return Array.from(elements).join(', ');
  }
}
```

### 3. Smart Component Selection

#### Context-Aware Component Selection
```typescript
// src/agents/core/smart-component-selector.ts
export class SmartComponentSelector {
  async selectOptimalComponents(
    toolResults: any[],
    context: string,
    userPreferences: UserPreferences
  ): Promise<ComponentSelection> {
    const analysis = await this.analyzeContext(toolResults, context);
    const recommendations = await this.generateRecommendations(analysis);
    
    return {
      primary: recommendations.primary,
      alternatives: recommendations.alternatives,
      reasoning: recommendations.reasoning,
      confidence: recommendations.confidence,
    };
  }

  private async analyzeContext(
    toolResults: any[],
    context: string
  ): Promise<ContextAnalysis> {
    return {
      dataTypes: this.identifyDataTypes(toolResults),
      userIntent: this.identifyUserIntent(context),
      complexity: this.assessComplexity(toolResults),
      interactivity: this.assessInteractivityNeeds(context),
    };
  }

  private identifyDataTypes(toolResults: any[]): DataType[] {
    const types: DataType[] = [];
    
    for (const result of toolResults) {
      if (Array.isArray(result.result)) {
        if (this.isTimeSeriesData(result.result)) {
          types.push({ type: 'time-series', confidence: 0.9 });
        } else if (this.isTabularData(result.result)) {
          types.push({ type: 'tabular', confidence: 0.8 });
        } else {
          types.push({ type: 'list', confidence: 0.7 });
        }
      } else if (typeof result.result === 'object') {
        types.push({ type: 'object', confidence: 0.6 });
      } else {
        types.push({ type: 'primitive', confidence: 0.5 });
      }
    }
    
    return types;
  }

  private generateRecommendations(
    analysis: ContextAnalysis
  ): ComponentRecommendations {
    const recommendations: ComponentRecommendations = {
      primary: null,
      alternatives: [],
      reasoning: '',
      confidence: 0,
    };

    // Time series data → Chart components
    if (analysis.dataTypes.some(dt => dt.type === 'time-series')) {
      recommendations.primary = {
        type: 'chart-line',
        element: 'AIChart',
        props: { type: 'line', responsive: true },
      };
      recommendations.reasoning = 'Time series data detected, using line chart';
      recommendations.confidence = 0.9;
    }
    // Tabular data → Table components
    else if (analysis.dataTypes.some(dt => dt.type === 'tabular')) {
      recommendations.primary = {
        type: 'data-table',
        element: 'AITable',
        props: { sortable: true, filterable: true },
      };
      recommendations.reasoning = 'Structured data detected, using table';
      recommendations.confidence = 0.8;
    }
    // List data → List components
    else if (analysis.dataTypes.some(dt => dt.type === 'list')) {
      recommendations.primary = {
        type: 'data-list',
        element: 'AIList',
        props: { searchable: true, groupBy: 'category' },
      };
      recommendations.reasoning = 'List data detected, using list component';
      recommendations.confidence = 0.7;
    }

    return recommendations;
  }
}
```

### 4. Enhanced Dynamic Renderer

#### AI Elements Integration
```typescript
// src/components/dynamic-renderer/AIElementsRenderer.tsx
import { 
  AICard, 
  AITable, 
  AIButton, 
  AIChart, 
  AIList,
  AIText,
  AICodeBlock,
  AIImage,
  AIModal,
  AIForm
} from '@ai-sdk/ui';

export const AIElementsRenderer: React.FC<{
  component: GeneratedUIComponent;
  className?: string;
}> = ({ component, className }) => {
  const renderedComponent = useMemo(() => {
    try {
      // Parse the generated component code
      const componentCode = component.componentCode || component.jsx;
      
      // Create a safe execution environment for AI Elements
      const safeProps = this.sanitizeProps(component.props);
      
      // Render using AI Elements
      return this.renderWithAIElements(componentCode, safeProps);
    } catch (error) {
      console.error('Error rendering AI Elements component:', error);
      return this.renderFallback(component, error);
    }
  }, [component, className]);

  return (
    <div className={`ai-elements-renderer ${className || ''}`}>
      {renderedComponent}
    </div>
  );
};

private renderWithAIElements(
  componentCode: string,
  props: any
): React.ReactElement {
  // Extract component type from generated code
  const componentType = this.extractComponentType(componentCode);
  
  // Map to appropriate AI Element
  const AIElement = this.getAIElement(componentType);
  
  // Render with proper props
  return React.createElement(AIElement, {
    ...props,
    className: 'ai-generated-component',
    'data-component-type': componentType,
  });
}

private getAIElement(componentType: string): React.ComponentType<any> {
  const elementMap = {
    'AICard': AICard,
    'AITable': AITable,
    'AIButton': AIButton,
    'AIChart': AIChart,
    'AIList': AIList,
    'AIText': AIText,
    'AICodeBlock': AICodeBlock,
    'AIImage': AIImage,
    'AIModal': AIModal,
    'AIForm': AIForm,
  };
  
  return elementMap[componentType] || AICard;
}
```

### 5. Component Generation Hints

#### Enhanced Prompt Engineering
```typescript
// src/agents/core/component-generator.ts
const AI_ELEMENTS_GENERATION_HINTS = `
## AI ELEMENTS USAGE GUIDELINES

### COMPONENT SELECTION RULES:
1. **Data Tables**: Use AITable for structured data (vaults, tokens, yields)
2. **Charts**: Use AIChart for time series, comparisons, distributions
3. **Lists**: Use AIList for item collections with search/filter
4. **Cards**: Use AICard for individual items or summaries
5. **Forms**: Use AIForm for user input and interactions
6. **Modals**: Use AIModal for detailed views and confirmations

### PROPS OPTIMIZATION:
- Always include 'className' for styling
- Use 'responsive' prop for mobile compatibility
- Include 'accessibility' props for screen readers
- Add 'loading' states for async operations
- Use 'error' handling for failed operations

### LAYOUT PATTERNS:
- **Single Item**: AICard with AIText content
- **Multiple Items**: AITable or AIList with pagination
- **Time Series**: AIChart with line/area visualization
- **Comparisons**: AIChart with bar/column visualization
- **Interactive**: AIForm with AIButton actions

### ACCESSIBILITY REQUIREMENTS:
- Include proper ARIA labels
- Ensure keyboard navigation
- Provide alt text for images
- Use semantic HTML structure
- Include focus management

### RESPONSIVE DESIGN:
- Use responsive props for mobile
- Implement proper breakpoints
- Ensure touch-friendly interactions
- Optimize for different screen sizes
`;

export class ComponentGenerator {
  async generateStyledComponent(
    toolResults: any[],
    context: string
  ): Promise<UIComponentSchema> {
    const prompt = `
${AI_ELEMENTS_GENERATION_HINTS}

## CURRENT CONTEXT:
User Message: "${context}"
Tool Results: ${JSON.stringify(toolResults, null, 2)}

## GENERATION TASK:
Generate a React component using AI Elements that:
1. Displays the tool results effectively
2. Uses the most appropriate AI Elements
3. Includes proper props and styling
4. Ensures accessibility and responsiveness
5. Provides interactive elements where needed

## OUTPUT REQUIREMENTS:
- Use AI Elements components
- Include proper TypeScript types
- Add accessibility attributes
- Implement responsive design
- Include error handling
- Add loading states
`;

    // ... rest of generation logic
  }
}
```

## Implementation Plan

### Phase 1: AI Elements Integration (Week 1-2)
- [ ] Install and configure AI Elements
- [ ] Update ComponentGenerator to use AI Elements
- [ ] Create AI Elements mapping system
- [ ] Implement basic component generation with AI Elements

### Phase 2: Smart Component Selection (Week 3-4)
- [ ] Implement context-aware component selection
- [ ] Create data type analysis system
- [ ] Add user preference integration
- [ ] Implement component recommendation engine

### Phase 3: Enhanced Rendering (Week 5-6)
- [ ] Update DynamicRenderer for AI Elements
- [ ] Implement safe component execution
- [ ] Add error handling and fallbacks
- [ ] Create component preview system

### Phase 4: Optimization and Polish (Week 7-8)
- [ ] Add performance optimizations
- [ ] Implement component caching
- [ ] Add accessibility enhancements
- [ ] Create comprehensive testing suite

## Success Metrics

### Component Quality
- Component generation success rate: >95%
- User satisfaction with generated components: >4.0/5.0
- Accessibility compliance: 100%

### Performance
- Component generation time: <2 seconds
- Component rendering time: <100ms
- Memory usage: <50MB for component cache

### User Experience
- Component usability score: >4.5/5.0
- Mobile responsiveness: 100%
- Cross-browser compatibility: 100%

## Risk Mitigation

### Technical Risks
- **Component Compatibility**: Implement fallback mechanisms
- **Performance Impact**: Add component caching and optimization
- **Security**: Sanitize all generated code and props

### User Experience Risks
- **Learning Curve**: Provide clear documentation and examples
- **Accessibility**: Implement comprehensive accessibility testing
- **Mobile Experience**: Ensure responsive design across devices

### Development Risks
- **Integration Complexity**: Implement gradual migration strategy
- **Testing Coverage**: Create comprehensive test suite
- **Maintenance**: Document all components and patterns
