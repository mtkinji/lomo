import {
  createRuntimeToolProviderRegistry,
  type RuntimeToolProviderRegistry,
} from '../../../packages/kwilt-agent-runtime/src/providerRegistry.ts';
import type {
  ServerAgentToolCall,
  ServerAgentToolDefinition,
  ServerAgentToolResult,
} from './agentRuntime.ts';
import type { KwiltActionReceipt } from '../../../packages/kwilt-agent-runtime/src/types.ts';
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

/** Adapts the canonical action boundary back to the model-facing tool protocol. */
export function serverToolResultFromActionReceipt(receipt: KwiltActionReceipt): ServerAgentToolResult {
  const output = { receiptId: receipt.receiptId, resultRefs: receipt.resultRefs };
  if (receipt.status === 'completed') return { status: 'completed', output, receipt };
  if (receipt.status === 'proposed') return { status: 'proposed', proposal: output };
  if (receipt.status === 'pending_client_action') {
    return { status: 'pending_client_action', provider: 'device', request: output };
  }
  if (receipt.status === 'needs_input') {
    return { status: 'needs_input', prompt: 'This action needs confirmation or more information.', fields: ['confirmation'] };
  }
  if (receipt.status === 'unavailable' || receipt.status === 'refused') {
    return { status: 'unavailable', reason: receipt.status, retryable: false };
  }
  return { status: 'failed', code: 'action_failed', message: 'Kwilt could not complete that action.', retryable: false };
}
