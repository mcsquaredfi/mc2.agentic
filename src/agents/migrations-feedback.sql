-- Feedback System Database Schema
-- This file contains the SQL schema for the feedback system

-- Feedback data table
CREATE TABLE IF NOT EXISTS feedback_data (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    feedback_type TEXT NOT NULL, -- 'quick', 'detailed', 'contextual'
    feedback_data TEXT NOT NULL, -- JSON
    response_context TEXT NOT NULL, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feedback analytics aggregation table
CREATE TABLE IF NOT EXISTS feedback_analytics (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    total_feedback INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    average_rating REAL DEFAULT 0,
    category_scores TEXT, -- JSON
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Response quality tracking table
CREATE TABLE IF NOT EXISTS response_quality (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    quality_score REAL NOT NULL,
    confidence_level REAL NOT NULL,
    improvement_suggestions TEXT, -- JSON
    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_data_message_id ON feedback_data(message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_data_user_id ON feedback_data(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_data_timestamp ON feedback_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_feedback_analytics_message_id ON feedback_analytics(message_id);
CREATE INDEX IF NOT EXISTS idx_response_quality_message_id ON response_quality(message_id);

-- Create views for common queries
CREATE VIEW IF NOT EXISTS feedback_summary AS
SELECT 
    fa.message_id,
    fa.total_feedback,
    fa.positive_feedback,
    fa.negative_feedback,
    fa.average_rating,
    fa.category_scores,
    fa.last_updated,
    rq.quality_score,
    rq.confidence_level
FROM feedback_analytics fa
LEFT JOIN response_quality rq ON fa.message_id = rq.message_id;

-- Create view for user feedback history
CREATE VIEW IF NOT EXISTS user_feedback_history AS
SELECT 
    fd.user_id,
    fd.message_id,
    fd.timestamp,
    fd.feedback_type,
    fd.feedback_data,
    fd.response_context,
    fa.total_feedback,
    fa.positive_feedback,
    fa.average_rating
FROM feedback_data fd
LEFT JOIN feedback_analytics fa ON fd.message_id = fa.message_id
ORDER BY fd.timestamp DESC;
