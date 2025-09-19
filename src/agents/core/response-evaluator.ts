import type { Env } from '../types';
import { FeedbackManager, type FeedbackData } from './feedback-manager';

export interface ResponseQuality {
  score: number; // 0-1 scale
  level: 'excellent' | 'good' | 'fair' | 'poor';
  confidence: number; // 0-1 scale
  improvements: string[];
  metrics: {
    userScore: number;
    responseTime: number;
    toolUsage: number;
    contextRelevance: number;
  };
}

export class ResponseEvaluator {
  private feedbackManager: FeedbackManager;

  constructor(private env: Env) {
    this.feedbackManager = new FeedbackManager(env);
  }

  async evaluateResponse(messageId: string): Promise<ResponseQuality> {
    try {
      // Get feedback data
      const feedbackStats = await this.feedbackManager.getFeedbackStats(messageId);
      
      // Calculate quality metrics
      const metrics = await this.calculateMetrics(messageId, feedbackStats);
      
      // Determine overall quality
      const quality = this.calculateOverallQuality(metrics, feedbackStats);
      
      // Generate improvement suggestions
      const improvements = this.generateImprovements(quality, metrics, feedbackStats);
      
      return {
        score: quality.score,
        level: quality.level,
        confidence: quality.confidence,
        improvements,
        metrics,
      };
    } catch (error) {
      console.error('❌ Error evaluating response:', error);
      
      // Return default quality assessment
      return {
        score: 0.5,
        level: 'fair',
        confidence: 0.1,
        improvements: ['Unable to evaluate response quality'],
        metrics: {
          userScore: 0.5,
          responseTime: 0,
          toolUsage: 0,
          contextRelevance: 0.5,
        },
      };
    }
  }

  private async calculateMetrics(
    messageId: string,
    feedbackStats: any
  ): Promise<ResponseQuality['metrics']> {
    // Get response context from database
    const responseData = await this.env.DB?.prepare(`
      SELECT response_context FROM feedback_data WHERE message_id = ? LIMIT 1
    `).bind(messageId).first();

    const context = responseData ? JSON.parse(responseData.response_context as string) : {};

    return {
      userScore: feedbackStats.positiveRate || 0.5,
      responseTime: this.calculateResponseTimeScore(context.processingTime || 0),
      toolUsage: this.calculateToolUsageScore(context.toolResults || []),
      contextRelevance: this.calculateContextRelevanceScore(context),
    };
  }

  private calculateResponseTimeScore(processingTime: number): number {
    // Score based on response time (faster is better, but not too fast)
    if (processingTime < 1000) return 0.9; // Very fast
    if (processingTime < 3000) return 0.8; // Fast
    if (processingTime < 5000) return 0.6; // Acceptable
    if (processingTime < 10000) return 0.4; // Slow
    return 0.2; // Very slow
  }

  private calculateToolUsageScore(toolResults: any[]): number {
    // Score based on appropriate tool usage
    if (toolResults.length === 0) return 0.3; // No tools used
    if (toolResults.length === 1) return 0.7; // Single tool
    if (toolResults.length <= 3) return 0.9; // Good tool usage
    return 0.6; // Too many tools might indicate inefficiency
  }

  private calculateContextRelevanceScore(context: any): number {
    // Simple relevance scoring based on context completeness
    let score = 0.5; // Base score
    
    if (context.toolResults && context.toolResults.length > 0) score += 0.2;
    if (context.model && context.model.includes('gpt-4')) score += 0.1;
    if (context.processingTime && context.processingTime > 0) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private calculateOverallQuality(
    metrics: ResponseQuality['metrics'],
    feedbackStats: any
  ): { score: number; level: ResponseQuality['level']; confidence: number } {
    // Weighted average of all metrics
    const weights = {
      userScore: 0.4,
      responseTime: 0.2,
      toolUsage: 0.2,
      contextRelevance: 0.2,
    };

    const score = 
      metrics.userScore * weights.userScore +
      metrics.responseTime * weights.responseTime +
      metrics.toolUsage * weights.toolUsage +
      metrics.contextRelevance * weights.contextRelevance;

    // Determine quality level
    let level: ResponseQuality['level'];
    if (score >= 0.8) level = 'excellent';
    else if (score >= 0.6) level = 'good';
    else if (score >= 0.4) level = 'fair';
    else level = 'poor';

    // Calculate confidence based on feedback volume
    const confidence = Math.min(feedbackStats.total / 10, 1.0); // More feedback = higher confidence

    return { score, level, confidence };
  }

  private generateImprovements(
    quality: { score: number; level: ResponseQuality['level']; confidence: number },
    metrics: ResponseQuality['metrics'],
    feedbackStats: any
  ): string[] {
    const improvements: string[] = [];

    if (quality.level === 'poor') {
      improvements.push('Response quality is below acceptable standards');
    }

    if (metrics.userScore < 0.6) {
      improvements.push('Improve user satisfaction - consider better data sources or clearer explanations');
    }

    if (metrics.responseTime < 0.5) {
      improvements.push('Optimize response time - consider caching or faster model selection');
    }

    if (metrics.toolUsage < 0.5) {
      improvements.push('Improve tool usage - ensure relevant tools are called for user queries');
    }

    if (metrics.contextRelevance < 0.6) {
      improvements.push('Enhance context relevance - better understand user intent and provide more targeted responses');
    }

    if (feedbackStats.total < 3) {
      improvements.push('Collect more user feedback to improve quality assessment');
    }

    if (improvements.length === 0) {
      improvements.push('Response quality is good - continue current approach');
    }

    return improvements;
  }

  async getQualityTrends(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<{
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
    totalResponses: number;
  }> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const results = await this.env.DB?.prepare(`
        SELECT 
          AVG(quality_score) as avg_score,
          COUNT(*) as total_responses
        FROM response_quality 
        WHERE evaluated_at >= ${timeFilter}
      `).first();

      // For now, return mock data since we don't have historical data
      return {
        averageScore: 0.7,
        trend: 'stable',
        totalResponses: 0,
      };
    } catch (error) {
      console.error('❌ Error getting quality trends:', error);
      return {
        averageScore: 0.5,
        trend: 'stable',
        totalResponses: 0,
      };
    }
  }

  private getTimeFilter(timeRange: string): string {
    const now = new Date();
    let filterDate: Date;

    switch (timeRange) {
      case 'day':
        filterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return `'${filterDate.toISOString()}'`;
  }
}
