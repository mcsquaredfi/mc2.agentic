import type { D1Database, DurableObjectState } from "@cloudflare/workers-types";
import type { VectorizeIndex } from "@cloudflare/workers-types";
import { generateId } from "../utils";
import type {
  BaseAgent,
  Task,
  TaskResult,
  Schedule,
  FeedbackPoint,
  Tool,
  RPCMessage,
  RPCResponse,
  TaskPrompt,
  Env,
} from "./types";

/**
 * Error class for agent-specific errors
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly method: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = "AgentError";
  }
}

/**
 * Abstract base class for all agents in the system
 */
export abstract class AbstractBaseAgent implements BaseAgent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly role: string,
    protected readonly state: DurableObjectState,
    public readonly sql: D1Database,
    public readonly vectorize: VectorizeIndex,
    protected readonly env: Env
  ) {}

  /**
   * RPC call to another agent
   */
  async rpc<T>(agentName: string, method: string, args: any[]): Promise<T> {
    const message: RPCMessage = {
      source: this.name,
      target: agentName,
      method,
      args,
      requestId: generateId(),
      timestamp: Date.now(),
    };

    // Get target agent's Durable Object
    if (!this.env.AGENT_DO) {
      throw new Error("AGENT_DO binding not available");
    }
    const targetId = this.env.AGENT_DO.idFromName(agentName);
    const targetAgent = this.env.AGENT_DO.get(targetId);

    try {
      const response = await targetAgent.fetch("http://internal/rpc", {
        method: "POST",
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new AgentError(`RPC call failed: ${response.statusText}`, "rpc");
      }

      const result: RPCResponse = await response.json();
      if (result.error) {
        throw new AgentError(result.error, "rpc");
      }

      return result.result as T;
    } catch (error) {
      const agentError =
        error instanceof Error
          ? new AgentError(error.message, "rpc")
          : new AgentError("Unknown error in RPC call", "rpc");
      await this.logError(agentError);
      throw agentError;
    }
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcast(message: string, context: any): Promise<void> {
    // Get list of all agents from state
    const agents = await this.getAllAgents();

    // Send message to each agent except self
    const promises = agents
      .filter((agent) => agent !== this.name)
      .map((agent) => this.rpc(agent, "onBroadcast", [message, context]));

    await Promise.all(promises);
  }

  /**
   * Receive feedback from another agent
   */
  async receiveFeedback(feedback: FeedbackPoint): Promise<void> {
    try {
      await this.sql
        .prepare(
          `
        INSERT INTO feedback_points (
          source_agent_id,
          target_agent_id,
          points,
          context,
          timestamp
        ) VALUES (?, ?, ?, ?, ?)
      `
        )
        .bind(
          feedback.sourceAgent,
          feedback.targetAgent,
          feedback.points,
          JSON.stringify(feedback.context),
          feedback.timestamp
        )
        .run();

      // Update prompt performance if feedback is about a prompt
      if (feedback.context.promptName) {
        await this.updatePromptPerformance(
          feedback.context.promptName,
          feedback.points
        );
      }
    } catch (error) {
      await this.logError(
        this.createError("Error receiving feedback", "receiveFeedback", error)
      );
      throw error;
    }
  }

  /**
   * Give feedback to another agent
   */
  async giveFeedback(
    targetAgent: string,
    points: number,
    context: any
  ): Promise<void> {
    const feedback: FeedbackPoint = {
      sourceAgent: this.name,
      targetAgent,
      points,
      context,
      timestamp: Date.now(),
    };

    await this.rpc(targetAgent, "receiveFeedback", [feedback]);
  }

  /**
   * Execute a task
   */
  async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    let success = false;
    let result = null;
    let error = null;

    try {
      // Log task start
      await this.logTaskStart(task);

      // Execute task-specific logic
      result = await this.executeTaskLogic(task);
      success = true;

      // Log task completion
      await this.logTaskComplete(task, result);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Unknown error during task execution";
      error = errorMessage;
      await this.logError(this.createError(errorMessage, "executeTask", e));
    }

    const endTime = Date.now();

    return {
      taskId: task.id,
      success,
      result,
      error,
      metrics: {
        startTime,
        endTime,
      },
    };
  }

  /**
   * Schedule a task for future execution
   */
  async scheduleTask(task: Task, schedule: Schedule): Promise<void> {
    try {
      await this.sql
        .prepare(
          `
        INSERT INTO scheduled_tasks (
          id,
          task_type,
          task_data,
          schedule,
          next_run
        ) VALUES (?, ?, ?, ?, ?)
      `
        )
        .bind(
          task.id,
          task.type,
          JSON.stringify(task.data),
          JSON.stringify(schedule),
          schedule.startAt.getTime()
        )
        .run();

      // Set alarm for next execution
      await this.state.storage.setAlarm(schedule.startAt.getTime());
    } catch (error) {
      await this.logError(
        this.createError("Error scheduling task", "scheduleTask", error)
      );
      throw error;
    }
  }

  /**
   * Get a task prompt by name
   */
  async getTaskPrompt(name: string): Promise<string> {
    try {
      const result = await this.sql
        .prepare(
          `
        SELECT prompt_content
        FROM task_prompts
        WHERE prompt_name = ?
        ORDER BY version DESC
        LIMIT 1
      `
        )
        .bind(name)
        .first<{ prompt_content: string }>();

      if (!result) {
        throw new Error(`Prompt not found: ${name}`);
      }

      return result.prompt_content;
    } catch (error) {
      await this.logError(
        this.createError("Error getting task prompt", "getTaskPrompt", error)
      );
      throw error;
    }
  }

  /**
   * Update a task prompt
   */
  async updateTaskPrompt(name: string, content: string): Promise<void> {
    try {
      // Get current version
      const current = await this.sql
        .prepare(
          `
        SELECT version
        FROM task_prompts
        WHERE prompt_name = ?
        ORDER BY version DESC
        LIMIT 1
      `
        )
        .bind(name)
        .first<{ version: number }>();

      const version = current ? current.version + 1 : 1;

      // Insert new version
      await this.sql
        .prepare(
          `
        INSERT INTO task_prompts (
          prompt_name,
          prompt_content,
          version,
          performance_score
        ) VALUES (?, ?, ?, 0)
      `
        )
        .bind(name, content, version)
        .run();
    } catch (error) {
      await this.logError(
        this.createError(
          "Error updating task prompt",
          "updateTaskPrompt",
          error
        )
      );
      throw error;
    }
  }

  /**
   * Use a tool
   */
  async useTool<T>(tool: Tool, args: any[]): Promise<T> {
    try {
      // Validate args against tool parameters
      this.validateToolArgs(tool, args);

      // Execute tool
      const result = await tool.execute(args);

      // Log tool usage
      await this.logToolUsage(tool.name, args, result);

      return result;
    } catch (error) {
      await this.logError(
        this.createError("Error using tool", "useTool", error)
      );
      throw error;
    }
  }

  // Protected helper methods that concrete agents should implement
  protected abstract executeTaskLogic(task: Task): Promise<any>;
  protected abstract getAllAgents(): Promise<string[]>;

  // Protected utility methods
  protected async logError(error: AgentError): Promise<void> {
    console.error(`[${this.name}] Error in ${error.method}:`, error);
    // Add error to agent's error log table
    await this.sql
      .prepare(
        `
      INSERT INTO error_logs (
        agent_id,
        method,
        error_message,
        stack_trace,
        context,
        timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .bind(
        this.id,
        error.method,
        error.message,
        error.stack,
        JSON.stringify(error.context),
        Date.now()
      )
      .run();
  }

  protected async logTaskStart(task: Task): Promise<void> {
    await this.sql
      .prepare(
        `
      INSERT INTO task_logs (
        task_id,
        agent_id,
        status,
        timestamp
      ) VALUES (?, ?, 'started', ?)
    `
      )
      .bind(task.id, this.id, Date.now())
      .run();
  }

  protected async logTaskComplete(task: Task, result: any): Promise<void> {
    await this.sql
      .prepare(
        `
      INSERT INTO task_logs (
        task_id,
        agent_id,
        status,
        result,
        timestamp
      ) VALUES (?, ?, 'completed', ?, ?)
    `
      )
      .bind(task.id, this.id, JSON.stringify(result), Date.now())
      .run();
  }

  protected async logToolUsage(
    toolName: string,
    args: any[],
    result: any
  ): Promise<void> {
    await this.sql
      .prepare(
        `
      INSERT INTO tool_usage_logs (
        agent_id,
        tool_name,
        args,
        result,
        timestamp
      ) VALUES (?, ?, ?, ?, ?)
    `
      )
      .bind(
        this.id,
        toolName,
        JSON.stringify(args),
        JSON.stringify(result),
        Date.now()
      )
      .run();
  }

  protected validateToolArgs(tool: Tool, args: any[]): void {
    const requiredParams = Object.entries(tool.parameters)
      .filter(([_, param]) => param.required)
      .map(([name]) => name);

    if (args.length < requiredParams.length) {
      throw new Error(
        `Tool ${tool.name} requires ${requiredParams.length} arguments, but only ${args.length} were provided`
      );
    }
  }

  protected async updatePromptPerformance(
    promptName: string,
    points: number
  ): Promise<void> {
    await this.sql
      .prepare(
        `
      UPDATE task_prompts
      SET performance_score = (performance_score + ?) / 2
      WHERE prompt_name = ?
        AND version = (
          SELECT version
          FROM task_prompts
          WHERE prompt_name = ?
          ORDER BY version DESC
          LIMIT 1
        )
    `
      )
      .bind(points, promptName, promptName)
      .run();
  }

  protected createError(
    message: string,
    method: string,
    context?: any
  ): AgentError {
    return new AgentError(message, method, context);
  }
}
