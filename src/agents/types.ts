import { D1Database } from "@cloudflare/workers-types";
import { VectorizeIndex } from "@cloudflare/workers-types";
import type { DurableObjectNamespace } from "@cloudflare/workers-types";

/**
 * Base interface for all tasks in the system
 */
export interface Task {
  id: string;
  type: string;
  data: any;
  priority: "low" | "medium" | "high";
  createdAt: Date;
  deadline?: Date;
}

/**
 * Result of a task execution
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  result: any;
  error: string | null;
  metrics: {
    startTime: number;
    endTime: number;
    resourceUsage?: any;
  };
}

/**
 * Schedule configuration for tasks
 */
export interface Schedule {
  type: "once" | "recurring";
  startAt: Date;
  interval?: number; // in milliseconds, for recurring tasks
  endAt?: Date; // optional end date for recurring tasks
}

/**
 * Feedback point structure for agent interactions
 */
export interface FeedbackPoint {
  sourceAgent: string;
  targetAgent: string;
  points: number;
  context: {
    interaction: string;
    taskId?: string;
    promptName?: string;
    result?: any;
  };
  timestamp: number;
}

/**
 * Tool interface for agent capabilities
 */
export interface Tool {
  name: string;
  description: string;
  parameters: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
  execute(args: any[]): Promise<any>;
}

/**
 * RPC message format for inter-agent communication
 */
export interface RPCMessage {
  source: string;
  target: string;
  method: string;
  args: any[];
  requestId: string;
  timestamp: number;
}

/**
 * RPC response format
 */
export interface RPCResponse {
  requestId: string;
  result: any;
  error?: string;
  feedback?: number;
}

/**
 * Task prompt version control
 */
export interface PromptVersion {
  version: number;
  content: string;
  performance: number;
  feedbackStats: {
    positive: number;
    negative: number;
    neutral: number;
  };
  lastUsed: Date;
}

/**
 * Task prompt management
 */
export interface TaskPrompt {
  name: string;
  currentVersion: number;
  versions: PromptVersion[];
  metadata: {
    category: string;
    tags: string[];
    lastUpdated: Date;
  };
}

/**
 * Base agent interface that all agents must implement
 */
export interface BaseAgent {
  // Core agent properties
  id: string;
  name: string;
  role: string;

  // State management
  sql: D1Database;
  vectorize: VectorizeIndex;

  // Communication methods
  rpc<T>(agentName: string, method: string, args: any[]): Promise<T>;
  broadcast(message: string, context: any): Promise<void>;

  // Feedback system
  receiveFeedback(feedback: FeedbackPoint): Promise<void>;
  giveFeedback(
    targetAgent: string,
    points: number,
    context: any
  ): Promise<void>;

  // Task management
  executeTask(task: Task): Promise<TaskResult>;
  scheduleTask(task: Task, schedule: Schedule): Promise<void>;

  // Prompt management
  getTaskPrompt(name: string): Promise<string>;
  updateTaskPrompt(name: string, content: string): Promise<void>;

  // Tool usage
  useTool<T>(tool: Tool, args: any[]): Promise<T>;
}

/**
 * Environment variables and bindings
 */
export interface Env {
  // Durable Object namespaces
  AGENT_DO?: DurableObjectNamespace;
  Chat?: DurableObjectNamespace;

  // AI binding
  AI?: any;

  // Vectorize binding
  VECTORIZE_INDEX?: VectorizeIndex;

  // D1 binding
  DB?: D1Database;

  // Secrets
  OPENAI_API_KEY?: string;
  JWT_SECRET?: string;
  // Typesense
  TYPESENSE_HOST?: string;
  TYPESENSE_API_KEY?: string;
  // Amplitude
  AMPLITUDE_API_KEY?: string;

  // MCP Client
  MCP_HOST: string;
}
