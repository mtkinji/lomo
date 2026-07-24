import type {
  AgentToolDefinition,
  AgentToolProvider,
  ToolProviderAvailability,
} from './types';

export type DiscoveredAgentTool = {
  tool: AgentToolDefinition;
  availableProviders: AgentToolProvider[];
  unavailableProviders: AgentToolProvider[];
};

export function discoverAgentTools(
  catalog: readonly AgentToolDefinition[],
  input: {
    capabilityIds: readonly string[];
    effects?: readonly AgentToolDefinition['effect'][];
    providerAvailability: ToolProviderAvailability;
  },
): DiscoveredAgentTool[] {
  const capabilityIds = new Set(input.capabilityIds);
  const effects = input.effects ? new Set(input.effects) : null;
  if (capabilityIds.size === 0) return [];

  return catalog
    .filter((tool) => capabilityIds.has(tool.capabilityId) && (!effects || effects.has(tool.effect)))
    .map((tool) => ({
      tool,
      availableProviders: tool.providers.filter(
        (provider) => input.providerAvailability[provider],
      ),
      unavailableProviders: tool.providers.filter(
        (provider) => !input.providerAvailability[provider],
      ),
    }));
}
