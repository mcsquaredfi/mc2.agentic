import { AsyncLocalStorage } from "node:async_hooks";

// we use ALS to expose the agent context to the tools
export const agentContext = new AsyncLocalStorage<any>();
