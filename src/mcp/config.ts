import type { Env } from "../agents/types";
import type Mc2fiMCPAgent from "./mc2fi-mcp";
import * as tools from "./tools";
import * as prompts from "./prompts";
import * as resources from "./resources";

export function registerAll(agent: Mc2fiMCPAgent, env: Env) {
  registerResources(agent);
  registerTools(agent, env);
  registerPrompts(agent);
}

function registerResources(agent: Mc2fiMCPAgent) {
  const getState = () => agent.state;

  // Register greeting resource (template with variables)
  const greeting = resources.greetingResource;
  agent.server.registerResource(
    greeting.name,
    greeting.template,
    greeting.metadata,
    async (uri, variables) =>
      greeting.handler(uri, variables as { name: string })
  );

  // Register dynamic session resource (template with variables)
  const dynamicSession = resources.dynamicSessionStateResource(getState);
  agent.server.registerResource(
    dynamicSession.name,
    dynamicSession.template,
    dynamicSession.metadata,
    async (uri, variables) =>
      dynamicSession.handler(uri, variables as { sessionId: string })
  );

  // Register URI resources (no variables)
  const uriResources = [
    resources.currentSessionStateResource(getState),
    resources.recentAnalysisHistoryResource(getState),
    resources.userPreferencesResource(getState),
  ];

  uriResources.forEach((resource) => {
    agent.server.registerResource(
      resource.name,
      resource.uri,
      resource.metadata,
      async (uri) => resource.handler(uri)
    );
  });
}

function registerTools(agent: Mc2fiMCPAgent, env: Env) {
  // Simple array of tool configs
  const toolConfigs = [
    {
      tool: tools.healthTool,
      handler: tools.healthTool.handler,
    },
    {
      tool: tools.searchTokenTool,
      handler: (params: any) =>
        tools.searchTokenTool.handler(params, { agent }),
    },
    {
      tool: tools.searchAddressTool,
      handler: (params: any) =>
        tools.searchAddressTool.handler(params, { agent }),
    },
    {
      tool: tools.generalSearchTool,
      handler: (params: any) =>
        tools.generalSearchTool.handler(params, { agent }),
    },
    {
      tool: tools.advanceTokenSearchTool(env),
      handler: async (params: any) => {
        const suggestions = agent.getAdaptiveSearchSuggestions();
        const enhancedParams = {
          ...params,
          filters: { ...suggestions.suggestedFilters, ...params.filters },
          sorting: params.sorting || suggestions.suggestedSorting,
        };
        return tools
          .advanceTokenSearchTool(env)
          .handler(enhancedParams, { agent });
      },
    },
    {
      tool: tools.personalizedRecommendationsTool,
      handler: (params: any) =>
        tools.personalizedRecommendationsTool.handler(params, { agent }),
    },
  ];

  toolConfigs.forEach(({ tool, handler }) => {
    agent.server.registerTool(tool.name, tool.config, handler);
  });
}

function registerPrompts(agent: Mc2fiMCPAgent) {
  // Simple array of prompts
  const promptList = [prompts.systemPrompt, prompts.tokenAnalysisPrompt];

  promptList.forEach((prompt) => {
    agent.server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
        argsSchema: prompt.argsSchema,
      },
      prompt.handler
    );
  });
}
