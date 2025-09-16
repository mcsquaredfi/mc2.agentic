import { UIAwareMc2fiAgent } from './ui-aware-agent';
import type { Connection, WSMessage, AgentContext } from "agents";
import type { Env } from "../types";

export class DebugUIAgent extends UIAwareMc2fiAgent {
  async onMessage(connection: Connection, message: WSMessage) {
    console.log('🐛 DEBUG: UI Agent received message:', message);
    
    // Call parent method
    await super.onMessage(connection, message);
  }
}
