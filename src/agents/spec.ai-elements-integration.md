# AI Elements Integration Specification

## Overview

This document outlines the integration strategy for AI Elements UI SDK and feedback mechanisms into the existing MC2 Agentic system. The goal is to enhance the user interface with pre-built AI components and implement a robust feedback system for response quality assessment.

## Current State Analysis

### Existing Architecture
- **AI SDK**: Already using `@ai-sdk/react` v2.0.44 and `@ai-sdk/ui-utils` v1.2.11
- **Generative UI**: Custom component generation system via `ComponentGenerator`
- **Chat Interface**: WebSocket-based communication with `useAgent` and `useAgentChat`
- **Dynamic Rendering**: `SafeJSXRenderer` for AI-generated components

### Current Limitations
1. **Manual Component Generation**: Components are generated from scratch each time
2. **No Feedback Loop**: No mechanism to collect user feedback on response quality
3. **Limited UI Components**: Relies on custom component library rather than specialized AI components
4. **No Response Evaluation**: No automated or manual assessment of response quality

## AI Elements Integration Strategy

### 1. Package Installation

```bash
npm install @ai-sdk/ui
```

### 2. Available AI Elements Components

Based on the AI SDK ecosystem, the following components are available:

#### Core AI Components
- **`<AIChat>`**: Complete chat interface with built-in message handling
- **`<AIMessage>`**: Individual message component with AI-specific features
- **`<AIInput>`**: Input component with AI-enhanced features
- **`<AIToolCall>`**: Tool call visualization and interaction
- **`<AIToolResult>`**: Tool result display with formatting

#### Specialized Components
- **`<AICodeBlock>`**: Syntax-highlighted code display
- **`<AIImage>`**: AI-generated image display
- **`<AITable>`**: Structured data table rendering
- **`<AICard>`**: Card-based content display
- **`<AIButton>`**: Interactive buttons with AI context

### 3. Integration Approach

#### Phase 1: Hybrid Integration
- Keep existing `ComponentGenerator` for complex DeFi-specific visualizations
- Integrate AI Elements for standard chat interactions
- Use AI Elements for tool call/result display

#### Phase 2: Full Migration
- Gradually replace custom components with AI Elements
- Enhance `ComponentGenerator` to use AI Elements as building blocks
- Implement AI Elements for all standard UI patterns

### 4. Implementation Plan

#### Step 1: Update Component Generator
```typescript
// src/agents/core/component-generator.ts
import { AICard, AITable, AIButton } from '@ai-sdk/ui';

export class ComponentGenerator {
  async generateStyledComponent(toolResults: any[], context: string) {
    // Use AI Elements as base components
    const baseComponents = {
      card: AICard,
      table: AITable,
      button: AIButton,
      // ... other AI Elements
    };
    
    // Generate component using AI Elements
    return this.generateWithAIElements(toolResults, context, baseComponents);
  }
}
```

#### Step 2: Update Chat Interface
```typescript
// src/app.tsx
import { AIChat, AIMessage, AIInput } from '@ai-sdk/ui';

export default function Chat() {
  return (
    <AIChat>
      {agentMessages.map((message) => (
        <AIMessage 
          key={message.id}
          message={message}
          onFeedback={(feedback) => handleFeedback(message.id, feedback)}
        />
      ))}
      <AIInput 
        onSubmit={handleSubmit}
        placeholder="Type your message..."
      />
    </AIChat>
  );
}
```

## Feedback System Implementation

### 1. Feedback Collection Architecture

#### User Interface Components
```typescript
interface FeedbackUI {
  thumbsUp: boolean;
  thumbsDown: boolean;
  rating?: number; // 1-5 scale
  comment?: string;
  categories: {
    accuracy: boolean;
    relevance: boolean;
    clarity: boolean;
    completeness: boolean;
  };
}
```

#### Feedback Data Model
```typescript
interface FeedbackData {
  messageId: string;
  userId: string;
  timestamp: number;
  feedback: FeedbackUI;
  context: {
    toolResults: any[];
    processingTime: number;
    model: string;
  };
}
```

### 2. Feedback Collection Implementation

#### Step 1: Add Feedback UI to Messages
```typescript
// src/components/feedback/FeedbackCollector.tsx
import { useState } from 'react';
import { Button } from '@/components/button/Button';
import { ThumbsUp, ThumbsDown, Star } from '@phosphor-icons/react';

export const FeedbackCollector: React.FC<{
  messageId: string;
  onFeedback: (feedback: FeedbackData) => void;
}> = ({ messageId, onFeedback }) => {
  const [feedback, setFeedback] = useState<FeedbackUI>({
    thumbsUp: false,
    thumbsDown: false,
    categories: {
      accuracy: false,
      relevance: false,
      clarity: false,
      completeness: false,
    },
  });

  const handleSubmit = () => {
    onFeedback({
      messageId,
      userId: getCurrentUserId(),
      timestamp: Date.now(),
      feedback,
      context: getMessageContext(messageId),
    });
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        variant={feedback.thumbsUp ? "primary" : "ghost"}
        size="sm"
        onClick={() => setFeedback(prev => ({ ...prev, thumbsUp: !prev.thumbsUp, thumbsDown: false }))}
      >
        <ThumbsUp size={16} />
      </Button>
      <Button
        variant={feedback.thumbsDown ? "primary" : "ghost"}
        size="sm"
        onClick={() => setFeedback(prev => ({ ...prev, thumbsDown: !prev.thumbsDown, thumbsUp: false }))}
      >
        <ThumbsDown size={16} />
      </Button>
      {/* Rating scale */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Button
            key={rating}
            variant={feedback.rating === rating ? "primary" : "ghost"}
            size="sm"
            onClick={() => setFeedback(prev => ({ ...prev, rating }))}
          >
            <Star size={14} />
          </Button>
        ))}
      </div>
    </div>
  );
};
```

#### Step 2: Integrate with Message Display
```typescript
// src/app.tsx - Update message rendering
{!isUser && (
  <div className="mt-2">
    <FeedbackCollector
      messageId={m.id}
      onFeedback={handleFeedback}
    />
  </div>
)}
```

### 3. Feedback Processing System

#### Step 1: Feedback Storage
```typescript
// src/agents/core/feedback-manager.ts
export class FeedbackManager {
  async storeFeedback(feedback: FeedbackData): Promise<void> {
    // Store in SQLite database
    await this.sql`
      INSERT INTO feedback_data (
        message_id, user_id, timestamp, feedback_data, context
      ) VALUES (
        ${feedback.messageId},
        ${feedback.userId},
        ${feedback.timestamp},
        ${JSON.stringify(feedback.feedback)},
        ${JSON.stringify(feedback.context)}
      )
    `;
  }

  async getFeedbackStats(messageId: string): Promise<FeedbackStats> {
    const stats = await this.sql`
      SELECT 
        COUNT(*) as total_feedback,
        AVG(CASE WHEN feedback_data->>'thumbsUp' = 'true' THEN 1 ELSE 0 END) as positive_rate,
        AVG(feedback_data->>'rating') as average_rating
      FROM feedback_data 
      WHERE message_id = ${messageId}
    `;
    return stats[0];
  }
}
```

#### Step 2: Response Quality Assessment
```typescript
// src/agents/core/response-evaluator.ts
export class ResponseEvaluator {
  async evaluateResponse(messageId: string): Promise<ResponseQuality> {
    const feedback = await this.feedbackManager.getFeedbackStats(messageId);
    const context = await this.getMessageContext(messageId);
    
    return {
      quality: this.calculateQuality(feedback, context),
      confidence: this.calculateConfidence(feedback),
      recommendations: this.generateRecommendations(feedback, context),
    };
  }

  private calculateQuality(feedback: FeedbackStats, context: any): 'excellent' | 'good' | 'fair' | 'poor' {
    if (feedback.positive_rate > 0.8 && feedback.average_rating > 4) return 'excellent';
    if (feedback.positive_rate > 0.6 && feedback.average_rating > 3) return 'good';
    if (feedback.positive_rate > 0.4 && feedback.average_rating > 2) return 'fair';
    return 'poor';
  }
}
```

## Generative UI Enhancement

### 1. AI Elements Integration in Component Generation

#### Update Component Generator Prompts
```typescript
// Enhanced prompt for AI Elements usage
const AI_ELEMENTS_PROMPT = `
## AI ELEMENTS COMPONENTS AVAILABLE:
- AICard: <AICard title="Title" content="Content" />
- AITable: <AITable data={data} columns={columns} />
- AIButton: <AIButton onClick={handler}>Label</AIButton>
- AICodeBlock: <AICodeBlock language="javascript" code={code} />
- AIImage: <AIImage src={url} alt="description" />

## USAGE GUIDELINES:
1. Use AICard for content containers
2. Use AITable for structured data display
3. Use AIButton for interactive elements
4. Use AICodeBlock for code snippets
5. Use AIImage for visual content

## INTEGRATION RULES:
- Always wrap content in appropriate AI Elements
- Use semantic AI Elements for better accessibility
- Leverage built-in styling and behavior
- Combine multiple AI Elements for complex layouts
`;
```

### 2. Enhanced Component Generation

```typescript
// src/agents/core/component-generator.ts
export class ComponentGenerator {
  async generateWithAIElements(
    toolResults: any[],
    context: string,
    baseComponents: any
  ): Promise<UIComponentSchema> {
    const prompt = `
${AI_ELEMENTS_PROMPT}

## CURRENT CONTEXT:
User Message: "${context}"
Tool Results: ${JSON.stringify(toolResults, null, 2)}

## REQUIREMENTS:
1. Generate a React component using AI Elements
2. Extract data from toolResults and structure as props
3. Use appropriate AI Elements for data visualization
4. Include proper TypeScript types
5. Ensure accessibility and responsive design

## OUTPUT FORMAT:
Return JSX using AI Elements components with proper props.
`;

    const result = await generateObject({
      model: this.getModel(),
      schema: UIComponentSchema,
      prompt,
    });

    return result.object;
  }
}
```

## Implementation Complexity Assessment

### Low Complexity (1-2 days)
- **AI Elements Integration**: Straightforward package installation and basic component replacement
- **Basic Feedback UI**: Simple thumbs up/down buttons with local state

### Medium Complexity (3-5 days)
- **Advanced Feedback System**: Rating scales, categories, and comment collection
- **Feedback Storage**: SQLite integration and data persistence
- **Component Generator Enhancement**: AI Elements integration in generation prompts

### High Complexity (1-2 weeks)
- **Response Quality Assessment**: Automated evaluation algorithms and recommendation systems
- **Feedback Analytics**: Dashboard for feedback insights and model performance tracking
- **Full AI Elements Migration**: Complete replacement of custom components with AI Elements

### Very High Complexity (2-4 weeks)
- **Advanced Analytics**: Machine learning models for response quality prediction
- **Automated Improvements**: Self-improving system based on feedback patterns
- **Multi-modal Feedback**: Support for voice, image, and other feedback types

## Recommended Implementation Order

1. **Week 1**: Install AI Elements and implement basic feedback UI
2. **Week 2**: Integrate AI Elements into Component Generator
3. **Week 3**: Implement feedback storage and basic analytics
4. **Week 4**: Add response quality assessment and recommendations
5. **Week 5+**: Advanced features and optimization

## Success Metrics

- **User Engagement**: Increase in feedback collection rate
- **Response Quality**: Improvement in average feedback scores
- **Development Velocity**: Faster component generation and deployment
- **User Satisfaction**: Higher user retention and engagement metrics

## Risk Mitigation

- **Backward Compatibility**: Maintain existing functionality during migration
- **Performance Impact**: Monitor and optimize AI Elements performance
- **User Experience**: Ensure smooth transition for existing users
- **Data Privacy**: Implement proper feedback data handling and privacy controls
