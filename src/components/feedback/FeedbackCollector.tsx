import React, { useState } from 'react';
import { Button } from '@/components/button/Button';
import { Card } from '@/components/card/Card';
import { ThumbsUp, ThumbsDown, Star, ChatCircle } from '@phosphor-icons/react';
import { AmplitudeAPI } from '@/agents/apis/amplitudeAPI';

interface FeedbackData {
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

interface FeedbackCollectorProps {
  messageId: string;
  onFeedback: (feedback: FeedbackData) => void;
  context?: {
    toolResults: any[];
    processingTime: number;
    model: string;
  };
}

export const FeedbackCollector: React.FC<FeedbackCollectorProps> = ({
  messageId,
  onFeedback,
  context = { toolResults: [], processingTime: 0, model: 'gpt-4o' },
}) => {
  const [feedback, setFeedback] = useState<FeedbackData['feedback']>({
    thumbsUp: false,
    thumbsDown: false,
    categories: {
      accuracy: false,
      relevance: false,
      clarity: false,
      completeness: false,
    },
  });
  const [showDetailed, setShowDetailed] = useState(false);
  const [comment, setComment] = useState('');

  const amplitude = new AmplitudeAPI(import.meta.env.VITE_AMPLITUDE_API_KEY || 'b2544930c63becb3305ba2e343dca5c9');

  const handleThumbsUp = () => {
    const newFeedback = {
      ...feedback,
      thumbsUp: !feedback.thumbsUp,
      thumbsDown: false,
    };
    setFeedback(newFeedback);
    
    // Track with Amplitude
    amplitude.sendEvent({
      userId: 'anonymous', // You can get this from your auth system
      eventType: 'feedback_thumbs_up',
      eventProperties: {
        messageId,
        feedback: newFeedback,
        context,
      },
    });
  };

  const handleThumbsDown = () => {
    const newFeedback = {
      ...feedback,
      thumbsDown: !feedback.thumbsDown,
      thumbsUp: false,
    };
    setFeedback(newFeedback);
    
    // Track with Amplitude
    amplitude.sendEvent({
      userId: 'anonymous',
      eventType: 'feedback_thumbs_down',
      eventProperties: {
        messageId,
        feedback: newFeedback,
        context,
      },
    });
  };

  const handleRating = (rating: number) => {
    const newFeedback = { ...feedback, rating };
    setFeedback(newFeedback);
    
    // Track with Amplitude
    amplitude.sendEvent({
      userId: 'anonymous',
      eventType: 'feedback_rating',
      eventProperties: {
        messageId,
        rating,
        context,
      },
    });
  };

  const handleCategoryToggle = (category: keyof typeof feedback.categories) => {
    const newFeedback = {
      ...feedback,
      categories: {
        ...feedback.categories,
        [category]: !feedback.categories[category],
      },
    };
    setFeedback(newFeedback);
    
    // Track with Amplitude
    amplitude.sendEvent({
      userId: 'anonymous',
      eventType: 'feedback_category',
      eventProperties: {
        messageId,
        category,
        value: newFeedback.categories[category],
        context,
      },
    });
  };

  const handleSubmit = () => {
    const finalFeedback: FeedbackData = {
      messageId,
      userId: 'anonymous', // You can get this from your auth system
      timestamp: Date.now(),
      feedback: {
        ...feedback,
        comment: comment.trim() || undefined,
      },
      context,
    };

    onFeedback(finalFeedback);
    
    // Track final feedback with Amplitude
    amplitude.sendEvent({
      userId: 'anonymous',
      eventType: 'feedback_submitted',
      eventProperties: {
        messageId,
        feedback: finalFeedback.feedback,
        context,
      },
    });

    // Reset form
    setFeedback({
      thumbsUp: false,
      thumbsDown: false,
      categories: {
        accuracy: false,
        relevance: false,
        clarity: false,
        completeness: false,
      },
    });
    setComment('');
    setShowDetailed(false);
  };

  return (
    <Card className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
      <div className="space-y-3">
        {/* Quick Feedback */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Was this helpful?</span>
          <Button
            variant={feedback.thumbsUp ? "primary" : "ghost"}
            size="sm"
            onClick={handleThumbsUp}
            className="text-green-600 hover:text-green-700"
          >
            <ThumbsUp size={16} />
          </Button>
          <Button
            variant={feedback.thumbsDown ? "primary" : "ghost"}
            size="sm"
            onClick={handleThumbsDown}
            className="text-red-600 hover:text-red-700"
          >
            <ThumbsDown size={16} />
          </Button>
        </div>

        {/* Rating Scale */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rate:</span>
          {[1, 2, 3, 4, 5].map((rating) => (
            <Button
              key={rating}
              variant={feedback.rating === rating ? "primary" : "ghost"}
              size="sm"
              onClick={() => handleRating(rating)}
              className="p-1"
            >
              <Star size={14} className={feedback.rating === rating ? "fill-current" : ""} />
            </Button>
          ))}
        </div>

        {/* Detailed Feedback Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetailed(!showDetailed)}
          className="text-blue-600 hover:text-blue-700"
        >
          <ChatCircle size={16} className="mr-1" />
          {showDetailed ? 'Hide' : 'Show'} detailed feedback
        </Button>

        {/* Detailed Feedback */}
        {showDetailed && (
          <div className="space-y-3 pt-3 border-t">
            {/* Categories */}
            <div className="space-y-2">
              <span className="text-sm font-medium">What was good/bad?</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(feedback.categories).map(([category, value]) => (
                  <Button
                    key={category}
                    variant={value ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => handleCategoryToggle(category as keyof typeof feedback.categories)}
                    className="justify-start text-xs"
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Additional comments:</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more about your experience..."
                className="w-full p-2 text-sm border rounded-md resize-none"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!feedback.thumbsUp && !feedback.thumbsDown && !feedback.rating}
            >
              Submit Feedback
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
