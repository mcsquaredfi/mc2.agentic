import type { Env } from '../types';
import { AmplitudeAPI } from '../apis/amplitudeAPI';

export interface FeedbackData {
  messageId: string;
  userId: string;
  timestamp: number;
  feedback: {
    thumbsUp: boolean;
    thumbsDown: boolean;
    rating?: number;
    categories: {
      accuracy: boolean;
      relevance: boolean;
      clarity: boolean;
      completeness: boolean;
    };
    comment?: string;
  };
  context: {
    toolResults: any[];
    processingTime: number;
    model: string;
  };
}

export interface FeedbackAnalytics {
  messageId: string;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  averageRating: number;
  categoryScores: Record<string, number>;
  lastUpdated: Date;
}

export class FeedbackManager {
  private amplitude: AmplitudeAPI;

  constructor(private env: Env) {
    this.amplitude = new AmplitudeAPI(env.AMPLITUDE_API_KEY || '');
  }

  async storeFeedback(feedback: FeedbackData): Promise<void> {
    try {
      // Store in SQLite database
      await this.env.DB?.prepare(`
        INSERT INTO feedback_data (
          id, message_id, user_id, session_id, timestamp,
          feedback_type, feedback_data, response_context
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        feedback.messageId,
        feedback.userId,
        'default-session', // You can get this from your session management
        feedback.timestamp,
        'detailed',
        JSON.stringify(feedback.feedback),
        JSON.stringify(feedback.context)
      ).run();

      // Update analytics
      await this.updateAnalytics(feedback.messageId);

      // Track with Amplitude
      await this.amplitude.sendEvent({
        userId: feedback.userId,
        eventType: 'feedback_stored',
        eventProperties: {
          messageId: feedback.messageId,
          feedbackType: 'detailed',
          hasRating: !!feedback.feedback.rating,
          hasComment: !!feedback.feedback.comment,
          categories: Object.keys(feedback.feedback.categories).filter(
            key => feedback.feedback.categories[key as keyof typeof feedback.feedback.categories]
          ),
        },
      });

      console.log(`✅ Feedback stored for message ${feedback.messageId}`);
    } catch (error) {
      console.error('❌ Error storing feedback:', error);
      throw error;
    }
  }

  async getFeedbackAnalytics(messageId: string): Promise<FeedbackAnalytics | null> {
    try {
      const result = await this.env.DB?.prepare(`
        SELECT * FROM feedback_analytics WHERE message_id = ?
      `).bind(messageId).first();

      if (!result) {
        return null;
      }

      return {
        messageId: result.message_id as string,
        totalFeedback: result.total_feedback as number,
        positiveFeedback: result.positive_feedback as number,
        negativeFeedback: result.negative_feedback as number,
        averageRating: result.average_rating as number,
        categoryScores: JSON.parse(result.category_scores as string || '{}'),
        lastUpdated: new Date(result.last_updated as string),
      };
    } catch (error) {
      console.error('❌ Error getting feedback analytics:', error);
      return null;
    }
  }

  async updateAnalytics(messageId: string): Promise<void> {
    try {
      // Get all feedback for this message
      const feedbackResults = await this.env.DB?.prepare(`
        SELECT feedback_data FROM feedback_data WHERE message_id = ?
      `).bind(messageId).all();

      if (!feedbackResults?.results || feedbackResults.results.length === 0) {
        return;
      }

      // Calculate analytics
      const analytics = this.calculateAnalytics(
        feedbackResults.results.map((r: any) => JSON.parse(r.feedback_data))
      );

      // Store/update analytics
      await this.env.DB?.prepare(`
        INSERT OR REPLACE INTO feedback_analytics (
          id, message_id, total_feedback, positive_feedback,
          negative_feedback, average_rating, category_scores, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        messageId,
        analytics.total,
        analytics.positive,
        analytics.negative,
        analytics.averageRating,
        JSON.stringify(analytics.categoryScores),
        new Date().toISOString()
      ).run();

      console.log(`📊 Analytics updated for message ${messageId}`);
    } catch (error) {
      console.error('❌ Error updating analytics:', error);
    }
  }

  private calculateAnalytics(feedbackData: any[]): {
    total: number;
    positive: number;
    negative: number;
    averageRating: number;
    categoryScores: Record<string, number>;
  } {
    const total = feedbackData.length;
    let positive = 0;
    let negative = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    const categoryScores: Record<string, number> = {
      accuracy: 0,
      relevance: 0,
      clarity: 0,
      completeness: 0,
    };

    feedbackData.forEach((feedback) => {
      if (feedback.thumbsUp) positive++;
      if (feedback.thumbsDown) negative++;
      
      if (feedback.rating) {
        ratingSum += feedback.rating;
        ratingCount++;
      }

      // Count category selections
      Object.keys(categoryScores).forEach((category) => {
        if (feedback.categories && feedback.categories[category]) {
          categoryScores[category]++;
        }
      });
    });

    return {
      total,
      positive,
      negative,
      averageRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
      categoryScores,
    };
  }

  async getFeedbackStats(messageId: string): Promise<{
    total: number;
    positiveRate: number;
    averageRating: number;
    categoryBreakdown: Record<string, number>;
  }> {
    const analytics = await this.getFeedbackAnalytics(messageId);
    
    if (!analytics) {
      return {
        total: 0,
        positiveRate: 0,
        averageRating: 0,
        categoryBreakdown: {},
      };
    }

    return {
      total: analytics.totalFeedback,
      positiveRate: analytics.totalFeedback > 0 ? analytics.positiveFeedback / analytics.totalFeedback : 0,
      averageRating: analytics.averageRating,
      categoryBreakdown: analytics.categoryScores,
    };
  }
}
