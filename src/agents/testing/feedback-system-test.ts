import { describe, it, expect, beforeEach } from 'vitest';
import { FeedbackManager } from '../core/feedback-manager';
import { ResponseEvaluator } from '../core/response-evaluator';

// Mock environment for testing
const mockEnv = {
  AMPLITUDE_API_KEY: 'test-key',
  DB: {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        run: async () => ({ success: true }),
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
    }),
  },
} as any;

describe('Feedback System', () => {
  let feedbackManager: FeedbackManager;
  let responseEvaluator: ResponseEvaluator;

  beforeEach(() => {
    feedbackManager = new FeedbackManager(mockEnv);
    responseEvaluator = new ResponseEvaluator(mockEnv);
  });

  describe('FeedbackManager', () => {
    it('should create feedback manager instance', () => {
      expect(feedbackManager).toBeDefined();
    });

    it('should store feedback data', async () => {
      const feedbackData = {
        messageId: 'test-message-123',
        userId: 'test-user',
        timestamp: Date.now(),
        feedback: {
          thumbsUp: true,
          thumbsDown: false,
          rating: 5,
          categories: {
            accuracy: true,
            relevance: true,
            clarity: false,
            completeness: true,
          },
          comment: 'Great response!',
        },
        context: {
          toolResults: [],
          processingTime: 1500,
          model: 'gpt-4o',
        },
      };

      // This should not throw an error
      await expect(feedbackManager.storeFeedback(feedbackData)).resolves.not.toThrow();
    });

    it('should get feedback analytics', async () => {
      const analytics = await feedbackManager.getFeedbackAnalytics('test-message-123');
      expect(analytics).toBeNull(); // No data in mock
    });

    it('should get feedback stats', async () => {
      const stats = await feedbackManager.getFeedbackStats('test-message-123');
      expect(stats).toEqual({
        total: 0,
        positiveRate: 0,
        averageRating: 0,
        categoryBreakdown: {},
      });
    });
  });

  describe('ResponseEvaluator', () => {
    it('should create response evaluator instance', () => {
      expect(responseEvaluator).toBeDefined();
    });

    it('should evaluate response quality', async () => {
      const quality = await responseEvaluator.evaluateResponse('test-message-123');
      
      expect(quality).toBeDefined();
      expect(quality.score).toBeGreaterThanOrEqual(0);
      expect(quality.score).toBeLessThanOrEqual(1);
      expect(['excellent', 'good', 'fair', 'poor']).toContain(quality.level);
      expect(quality.confidence).toBeGreaterThanOrEqual(0);
      expect(quality.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(quality.improvements)).toBe(true);
      expect(quality.metrics).toBeDefined();
    });

    it('should get quality trends', async () => {
      const trends = await responseEvaluator.getQualityTrends('week');
      
      expect(trends).toBeDefined();
      expect(trends.averageScore).toBeGreaterThanOrEqual(0);
      expect(trends.averageScore).toBeLessThanOrEqual(1);
      expect(['improving', 'declining', 'stable']).toContain(trends.trend);
      expect(typeof trends.totalResponses).toBe('number');
    });
  });

  describe('Feedback Data Structure', () => {
    it('should have correct feedback data structure', () => {
      const feedbackData = {
        messageId: 'test-message-123',
        userId: 'test-user',
        timestamp: Date.now(),
        feedback: {
          thumbsUp: true,
          thumbsDown: false,
          rating: 5,
          categories: {
            accuracy: true,
            relevance: true,
            clarity: false,
            completeness: true,
          },
          comment: 'Great response!',
        },
        context: {
          toolResults: [],
          processingTime: 1500,
          model: 'gpt-4o',
        },
      };

      expect(feedbackData.messageId).toBeDefined();
      expect(feedbackData.userId).toBeDefined();
      expect(feedbackData.timestamp).toBeDefined();
      expect(feedbackData.feedback).toBeDefined();
      expect(feedbackData.context).toBeDefined();
      expect(typeof feedbackData.feedback.thumbsUp).toBe('boolean');
      expect(typeof feedbackData.feedback.thumbsDown).toBe('boolean');
      expect(typeof feedbackData.feedback.rating).toBe('number');
      expect(feedbackData.feedback.categories).toBeDefined();
    });
  });
});
