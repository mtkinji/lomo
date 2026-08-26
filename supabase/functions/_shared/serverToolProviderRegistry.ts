import {
  createRuntimeToolProviderRegistry,
  type RuntimeToolProviderRegistry,
} from '../../../packages/kwilt-agent-runtime/src/providerRegistry.ts';
import type {
  ServerAgentToolCall,
  ServerAgentToolDefinition,
  ServerAgentToolResult,
} from './agentRuntime.ts';
import {
  SERVER_TOOL_PROVIDER_REGISTRATIONS,
  type ServerToolProviderContext,
} from './serverToolImplementations.ts';

export function createServerToolProviderRegistry(
  tools: readonly ServerAgentToolDefinition[],
): RuntimeToolProviderRegistry<ServerToolProviderContext> {
  const toolIds = new Set(tools.map((tool) => tool.id));
  return createRuntimeToolProviderRegistry({
    tools,
    registrations: SERVER_TOOL_PROVIDER_REGISTRATIONS.filter((item) => toolIds.has(item.toolId)),
  });
}

export async function executeServerRegisteredTool({
  registry,
  context,
  call,
  tool,
}: {
  registry: RuntimeToolProviderRegistry<ServerToolProviderContext>;
  context: ServerToolProviderContext;
  call: ServerAgentToolCall;
  tool: ServerAgentToolDefinition;
}): Promise<ServerAgentToolResult> {
  const provider = tool.providers.find((candidate) => registry.has(tool.id, candidate));
  if (!provider) {
    return { status: 'unavailable', reason: 'server_provider_unavailable', retryable: false };
  }
  return registry.execute(tool.id, provider, context, call);
}
