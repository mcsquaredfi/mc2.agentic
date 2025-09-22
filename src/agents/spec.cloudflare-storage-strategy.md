# Cloudflare Storage Strategy for Feedback & Optimization

## Storage Architecture Overview

### Multi-Tier Storage Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│                    Feedback Data Flow                          │
├─────────────────────────────────────────────────────────────────┤
│  User Feedback  │  KV Storage    │  Vectorize    │  Amplitude  │
│  (Real-time)    │  (30 days)     │  (1 year)     │  (Permanent)│
│                 │                │               │             │
│  • Thumbs up/down│  • Raw events  │  • Embeddings │  • Analytics│
│  • Ratings      │  • Context     │  • Metadata   │  • Reports  │
│  • Categories   │  • Timestamps  │  • Patterns   │  • Metrics  │
│  • Comments     │  • Signatures  │  • Similarity │  • Trends   │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Cloudflare KV Storage Strategy

### Use Cases
- **Real-time feedback collection** (sub-millisecond writes)
- **Optimization triggers** (quick feedback counting)
- **Recent feedback retrieval** (last 30 days)
- **Session-based feedback** (user interaction tracking)

### Data Structure
```typescript
// KV Key Structure
interface KVKeyStructure {
  // Pattern: feedback:{signature}:{timestamp}:{randomId}
  pattern: "feedback:yield-optimization:1703123456789:abc123";
  
  // Metadata for efficient querying
  metadata: {
    signature: "yield-optimization";
    rating: 4;
    timestamp: 1703123456789;
    userId: "user123";
    messageId: "msg456";
  };
}

// KV Value Structure
interface KVValueStructure {
  query: string;
  response: string;
  userFeedback: {
    thumbsUp: boolean;
    thumbsDown: boolean;
    rating: number;
    categories: string[];
    comment?: string;
  };
  context: {
    toolResults: any[];
    processingTime: number;
    model: string;
    signature: string;
  };
  optimizationData: {
    promptVersion: string;
    signatureVersion: string;
  };
}
```

### Implementation
```typescript
class FeedbackKVManager {
  constructor(private kv: KVNamespace) {}

  async storeFeedback(feedback: FeedbackData): Promise<void> {
    const key = this.generateKey(feedback);
    const value = JSON.stringify(feedback);
    
    await this.kv.put(key, value, {
      expirationTtl: 30 * 24 * 60 * 60, // 30 days
      metadata: {
        signature: feedback.context.signature,
        rating: feedback.userFeedback.rating,
        timestamp: Date.now(),
        userId: feedback.userId
      }
    });
  }

  async getRecentFeedback(signature: string, limit: number = 100): Promise<FeedbackData[]> {
    const list = await this.kv.list({
      prefix: `feedback:${signature}:`,
      limit: limit
    });

    return await Promise.all(
      list.keys.map(async (key) => {
        const value = await this.kv.get(key.name);
        return value ? JSON.parse(value) : null;
      })
    );
  }

  async getFeedbackCount(signature: string, hours: number = 24): Promise<number> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const list = await this.kv.list({
      prefix: `feedback:${signature}:`
    });

    return list.keys.filter(key => 
      key.metadata?.timestamp > cutoff
    ).length;
  }

  private generateKey(feedback: FeedbackData): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    return `feedback:${feedback.context.signature}:${timestamp}:${randomId}`;
  }
}
```

## 2. Cloudflare Vectorize Storage Strategy

### Use Cases
- **Semantic feedback analysis** (similarity search)
- **Pattern recognition** (common issues identification)
- **Feedback clustering** (grouping similar feedback)
- **Long-term trend analysis** (1 year retention)

### Data Structure
```typescript
// Vectorize Index Structure
interface VectorizeIndexStructure {
  // Index configuration
  config: {
    dimensions: 1536; // OpenAI embedding dimensions
    metric: "cosine";
    name: "feedback-embeddings";
  };
  
  // Vector data
  vectors: {
    id: string;
    values: number[]; // 1536-dimensional embedding
    metadata: {
      signature: string;
      rating: number;
      categories: string[];
      timestamp: number;
      query: string; // Truncated for metadata
      response: string; // Truncated for metadata
      userId: string;
      messageId: string;
    };
  }[];
}
```

### Implementation
```typescript
class FeedbackVectorManager {
  constructor(private vectorize: VectorizeIndex) {}

  async storeFeedbackEmbedding(feedback: FeedbackData): Promise<void> {
    // Generate embedding from feedback text
    const embedding = await this.generateEmbedding(
      `${feedback.query} ${feedback.response} ${feedback.userFeedback.comment || ''}`
    );

    await this.vectorize.insert([{
      id: this.generateVectorId(feedback),
      values: embedding,
      metadata: {
        signature: feedback.context.signature,
        rating: feedback.userFeedback.rating,
        categories: feedback.userFeedback.categories,
        timestamp: Date.now(),
        query: feedback.query.substring(0, 100),
        response: feedback.response.substring(0, 100),
        userId: feedback.userId,
        messageId: feedback.messageId
      }
    }]);
  }

  async findSimilarFeedback(
    query: string, 
    signature: string, 
    limit: number = 10
  ): Promise<SimilarFeedback[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = await this.vectorize.query(queryEmbedding, {
      topK: limit,
      filter: { signature: signature }
    });

    return results.matches.map(match => ({
      similarity: match.score,
      feedback: match.metadata,
      id: match.id
    }));
  }

  async analyzeFeedbackPatterns(signature: string): Promise<FeedbackPatterns> {
    // Get all feedback for signature using dummy query
    const allFeedback = await this.vectorize.query(
      new Array(1536).fill(0),
      {
        topK: 1000,
        filter: { signature: signature }
      }
    );

    return {
      commonIssues: this.identifyCommonIssues(allFeedback.matches),
      highRatedResponses: this.identifyHighRatedResponses(allFeedback.matches),
      improvementAreas: this.identifyImprovementAreas(allFeedback.matches),
      sentimentTrends: this.analyzeSentimentTrends(allFeedback.matches)
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Use OpenAI API to generate embeddings
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small'
      })
    });

    const data = await response.json();
    return data.data[0].embedding;
  }
}
```

## 3. Storage Integration Strategy

### Data Flow Architecture
```typescript
class FeedbackStorageOrchestrator {
  constructor(
    private kvManager: FeedbackKVManager,
    private vectorManager: FeedbackVectorManager,
    private amplitudeAPI: AmplitudeAPI
  ) {}

  async processFeedback(feedback: FeedbackData): Promise<void> {
    // 1. Store in KV for real-time access
    await this.kvManager.storeFeedback(feedback);
    
    // 2. Store embedding in Vectorize for semantic analysis
    await this.vectorManager.storeFeedbackEmbedding(feedback);
    
    // 3. Send to Amplitude for analytics
    await this.amplitudeAPI.sendEvent({
      userId: feedback.userId,
      eventType: 'feedback_submitted',
      eventProperties: {
        messageId: feedback.messageId,
        rating: feedback.userFeedback.rating,
        categories: feedback.userFeedback.categories,
        signature: feedback.context.signature
      }
    });

    // 4. Check optimization triggers
    await this.checkOptimizationTriggers(feedback.context.signature);
  }

  private async checkOptimizationTriggers(signature: string): Promise<void> {
    const recentCount = await this.kvManager.getFeedbackCount(signature, 24);
    
    if (recentCount >= 50) { // Trigger optimization every 50 feedback items
      await this.triggerOptimization(signature);
    }
  }

  private async triggerOptimization(signature: string): Promise<void> {
    // Get recent feedback from KV
    const recentFeedback = await this.kvManager.getRecentFeedback(signature, 100);
    
    // Analyze patterns using Vectorize
    const patterns = await this.vectorManager.analyzeFeedbackPatterns(signature);
    
    // Run optimization pipeline
    await this.optimizationPipeline.optimizeFromFeedback(recentFeedback, patterns);
  }
}
```

## 4. Optimization Triggers

### Multi-Level Trigger System
```typescript
class OptimizationTriggerSystem {
  constructor(
    private kvManager: FeedbackKVManager,
    private vectorManager: FeedbackVectorManager
  ) {}

  // Volume-based triggers
  async checkVolumeTriggers(signature: string): Promise<boolean> {
    const recentCount = await this.kvManager.getFeedbackCount(signature, 24);
    return recentCount >= 50; // 50 feedback items in 24 hours
  }

  // Quality-based triggers
  async checkQualityTriggers(signature: string): Promise<boolean> {
    const recentFeedback = await this.kvManager.getRecentFeedback(signature, 100);
    const avgRating = recentFeedback.reduce((sum, f) => sum + f.userFeedback.rating, 0) / recentFeedback.length;
    return avgRating < 3.5; // Average rating below 3.5
  }

  // Pattern-based triggers
  async checkPatternTriggers(signature: string): Promise<boolean> {
    const patterns = await this.vectorManager.analyzeFeedbackPatterns(signature);
    return patterns.commonIssues.length > 5; // More than 5 common issues
  }

  // Time-based triggers
  async checkTimeTriggers(signature: string): Promise<boolean> {
    const lastOptimization = await this.getLastOptimizationTime(signature);
    const hoursSinceLastOptimization = (Date.now() - lastOptimization) / (1000 * 60 * 60);
    return hoursSinceLastOptimization >= 24; // 24 hours since last optimization
  }
}
```

## 5. Performance Considerations

### KV Storage Optimization
```typescript
// KV Performance optimizations
class OptimizedKVManager {
  // Batch operations for better performance
  async batchStoreFeedback(feedbacks: FeedbackData[]): Promise<void> {
    const operations = feedbacks.map(feedback => ({
      key: this.generateKey(feedback),
      value: JSON.stringify(feedback),
      metadata: this.generateMetadata(feedback)
    }));

    await Promise.all(
      operations.map(op => 
        this.kv.put(op.key, op.value, { metadata: op.metadata })
      )
    );
  }

  // Efficient querying with metadata
  async getFeedbackByRating(signature: string, minRating: number): Promise<FeedbackData[]> {
    const list = await this.kv.list({
      prefix: `feedback:${signature}:`
    });

    // Filter by metadata first (faster than parsing values)
    const filteredKeys = list.keys.filter(key => 
      key.metadata?.rating >= minRating
    );

    // Only parse values for filtered keys
    return await Promise.all(
      filteredKeys.map(async (key) => {
        const value = await this.kv.get(key.name);
        return value ? JSON.parse(value) : null;
      })
    );
  }
}
```

### Vectorize Optimization
```typescript
// Vectorize Performance optimizations
class OptimizedVectorManager {
  // Batch embedding generation
  async batchStoreEmbeddings(feedbacks: FeedbackData[]): Promise<void> {
    const embeddings = await Promise.all(
      feedbacks.map(feedback => this.generateEmbedding(feedback))
    );

    const vectors = feedbacks.map((feedback, index) => ({
      id: this.generateVectorId(feedback),
      values: embeddings[index],
      metadata: this.generateVectorMetadata(feedback)
    }));

    await this.vectorize.insert(vectors);
  }

  // Efficient similarity search with filters
  async findSimilarFeedbackOptimized(
    query: string,
    signature: string,
    minRating: number = 3,
    limit: number = 10
  ): Promise<SimilarFeedback[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = await this.vectorize.query(queryEmbedding, {
      topK: limit * 2, // Get more results to filter
      filter: { 
        signature: signature,
        rating: { $gte: minRating }
      }
    });

    // Return top results after filtering
    return results.matches
      .slice(0, limit)
      .map(match => ({
        similarity: match.score,
        feedback: match.metadata,
        id: match.id
      }));
  }
}
```

## 6. Cost Optimization

### Storage Cost Analysis
```typescript
// Cost optimization strategies
class StorageCostOptimizer {
  // KV cost optimization
  async optimizeKVStorage(): Promise<void> {
    // Delete old feedback (older than 30 days)
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const oldKeys = await this.kv.list({
      prefix: 'feedback:'
    });

    const keysToDelete = oldKeys.keys.filter(key => 
      key.metadata?.timestamp < cutoff
    );

    await Promise.all(
      keysToDelete.map(key => this.kv.delete(key.name))
    );
  }

  // Vectorize cost optimization
  async optimizeVectorizeStorage(): Promise<void> {
    // Archive old vectors (older than 1 year)
    const cutoff = Date.now() - (365 * 24 * 60 * 60 * 1000);
    const oldVectors = await this.vectorize.query(
      new Array(1536).fill(0),
      {
        topK: 10000,
        filter: { timestamp: { $lt: cutoff } }
      }
    );

    // Delete old vectors
    await Promise.all(
      oldVectors.matches.map(match => 
        this.vectorize.deleteById(match.id)
      )
    );
  }
}
```

## 7. Monitoring & Alerting

### Storage Health Monitoring
```typescript
class StorageHealthMonitor {
  async monitorKVHealth(): Promise<StorageHealth> {
    const stats = await this.kv.list({ prefix: 'feedback:' });
    
    return {
      totalKeys: stats.keys.length,
      averageKeySize: this.calculateAverageKeySize(stats.keys),
      oldestKey: this.findOldestKey(stats.keys),
      health: stats.keys.length > 10000 ? 'warning' : 'healthy'
    };
  }

  async monitorVectorizeHealth(): Promise<VectorizeHealth> {
    const stats = await this.vectorize.query(
      new Array(1536).fill(0),
      { topK: 1 }
    );

    return {
      totalVectors: stats.matches.length,
      indexSize: await this.getIndexSize(),
      health: 'healthy'
    };
  }
}
```

This comprehensive storage strategy provides:

1. **Real-time feedback collection** via KV
2. **Semantic analysis capabilities** via Vectorize
3. **Long-term analytics** via Amplitude
4. **Automatic optimization triggers** based on feedback patterns
5. **Cost optimization** through data lifecycle management
6. **Performance monitoring** for storage health

The architecture ensures efficient data flow while maintaining the benefits of each storage system for their specific use cases.

