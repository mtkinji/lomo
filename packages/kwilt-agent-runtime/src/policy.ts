import type {
  AgentToolDefinition,
  AgentToolPolicyContext,
  AgentToolPolicyDecision,
  AgentToolProvider,
} from './types';

function firstAvailableProvider(
  tool: AgentToolDefinition,
  context: AgentToolPolicyContext,
): AgentToolProvider | null {
  return tool.providers.find((provider) => context.providerAvailability[provider]) ?? null;
}

export function evaluateToolPolicy(
  tool: AgentToolDefinition,
  context: AgentToolPolicyContext,
): AgentToolPolicyDecision {
  const provider = firstAvailableProvider(tool, context);
  if (!provider) {
    if (
      tool.canDeferToClient &&
      tool.providers.includes('device') &&
      !context.providerAvailability.device
    ) {
      return { decision: 'pending_client_action', provider: 'device' };
    }
    return { decision: 'unavailable', providers: tool.providers };
  }

  if (!context.authorized || tool.confirmation === 'explicit' || tool.consequence === 'consequential') {
    return { decision: 'require_confirmation', provider };
  }

  if (tool.effect === 'read') {
    return { decision: 'execute', provider };
  }

  if (context.explicitRequest && tool.reversible) {
    return { decision: 'execute', provider };
  }

  return { decision: 'propose', provider };
}
