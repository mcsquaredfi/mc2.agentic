-- Base agent tables
CREATE TABLE IF NOT EXISTS feedback_points (
    id TEXT PRIMARY KEY,
    source_agent_id TEXT NOT NULL,
    target_agent_id TEXT NOT NULL,
    points INTEGER NOT NULL,
    context TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_prompts (
    id TEXT PRIMARY KEY,
    prompt_name TEXT NOT NULL,
    prompt_content TEXT NOT NULL,
    version INTEGER NOT NULL,
    performance_score FLOAT DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interaction_logs (
    id TEXT PRIMARY KEY,
    interaction_type TEXT NOT NULL,
    source_agent_id TEXT,
    target_agent_id TEXT,
    content TEXT,
    result TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    task_data TEXT NOT NULL,
    schedule TEXT NOT NULL,
    last_run DATETIME,
    next_run DATETIME,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    method TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL,
    result TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tool_usage_logs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    args TEXT NOT NULL,
    result TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_points_source ON feedback_points(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_feedback_points_target ON feedback_points(target_agent_id);
CREATE INDEX IF NOT EXISTS idx_task_prompts_name ON task_prompts(prompt_name);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_source ON interaction_logs(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_target ON interaction_logs(target_agent_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run);
CREATE INDEX IF NOT EXISTS idx_error_logs_agent ON error_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_task ON task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_agent ON task_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_agent ON tool_usage_logs(agent_id);

-- Feedback System Tables
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

CREATE TABLE IF NOT EXISTS response_quality (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    quality_score REAL NOT NULL,
    confidence_level REAL NOT NULL,
    improvement_suggestions TEXT, -- JSON
    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feedback System Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_data_message_id ON feedback_data(message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_data_user_id ON feedback_data(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_data_timestamp ON feedback_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_feedback_analytics_message_id ON feedback_analytics(message_id);
CREATE INDEX IF NOT EXISTS idx_response_quality_message_id ON response_quality(message_id); 