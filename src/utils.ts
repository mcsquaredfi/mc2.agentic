// via https://github.com/vercel/ai/blob/main/examples/next-openai/app/api/use-chat-human-in-the-loop/utils.ts

import { formatDataStreamPart } from "@ai-sdk/ui-utils";
import type { UIMessage as Message } from "ai";
import { convertToCoreMessages, type ToolSet } from "ai";
import type { z } from "zod";
import { APPROVAL } from "./shared";

function isValidToolName<K extends PropertyKey, T extends object>(
  key: K,
  obj: T
): key is K & keyof T {
  return key in obj;
}

/**
 * Processes tool invocations where human input is required, executing tools when authorized.
 *
 * @param options - The function options
 * @param options.tools - Map of tool names to Tool instances that may expose execute functions
 * @param options.dataStream - Data stream for sending results back to the client
 * @param options.messages - Array of messages to process
 * @param executionFunctions - Map of tool names to execute functions
 * @returns Promise resolving to the processed messages
 */
// Simplified tool processing for AI SDK v5 compatibility
export async function processToolCalls({
  dataStream,
  messages,
  executions,
}: {
  tools: any; // used for type inference
  dataStream: any; // DataStreamWriter is no longer available in AI SDK v5
  messages: Message[];
  executions: Record<string, (args: any, context: any) => Promise<unknown>>;
}): Promise<Message[]> {
  const lastMessage = messages[messages.length - 1];
  const parts = lastMessage.parts;
  if (!parts) return messages;

  const processedParts = await Promise.all(
    parts.map(async (part: any) => {
      // Only process tool parts
      if (!part.type.startsWith("tool-")) return part;

      const toolName = part.type.replace("tool-", "");

      // Only continue if we have an execute function for the tool (meaning it requires confirmation)
      if (!(toolName in executions)) return part;

      // Check if this is a tool that needs user confirmation
      if (part.state === "input-available") {
        // This tool is waiting for user confirmation, don't process it yet
        return part;
      }

      // If we have a result from user confirmation, process it
      if (part.state === "result" && part.result) {
        let result: unknown;

        if (part.result === APPROVAL.YES) {
          const toolInstance = executions[toolName];
          if (toolInstance && part.input) {
            result = await toolInstance(part.input, {
              messages: convertToCoreMessages(messages),
              toolCallId: part.toolCallId || "",
            });
          } else {
            result = "Error: No execute function found on tool";
          }
        } else if (part.result === APPROVAL.NO) {
          result = "Error: User denied access to tool execution";
        } else {
          return part;
        }

        // Forward updated tool result to the client.
        if (dataStream && dataStream.write) {
          dataStream.write(
            formatDataStreamPart("tool_result", {
              toolCallId: part.toolCallId || "",
              result,
            })
          );
        }

        // Return updated part with the actual result.
        return {
          ...part,
          result,
        };
      }

      return part;
    })
  );

  // Finally return the processed messages
  return [...messages.slice(0, -1), { ...lastMessage, parts: processedParts }];
}

// export function getToolsRequiringConfirmation<
//   T extends ToolSet
//   // E extends {
//   //   [K in keyof T as T[K] extends { execute: Function } ? never : K]: T[K];
//   // },
// >(tools: T): string[] {
//   return (Object.keys(tools) as (keyof T)[]).filter((key) => {
//     const maybeTool = tools[key];
//     return typeof maybeTool.execute !== "function";
//   }) as string[];
// }

/**
 * Generate a unique ID
 * @returns A unique string ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}
