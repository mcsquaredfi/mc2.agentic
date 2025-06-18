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