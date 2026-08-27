import {
  createRuntimeToolProviderRegistry,
  executeActionEnvelope,
  toolResultFromActionReceipt,
  type ActionExecutionReceiptStore,
  type AgentToolCall,
  type AgentToolDefinition,
  type AgentToolExecutionResult,
  type RuntimeToolProviderRegistry,
  type KwiltActionExecutionEnvelope,
} from '@kwilt/agent-runtime';
import { MOBILE_TOOL_PROVIDER_REGISTRATIONS } from './mobileToolImplementations';

export type MobileToolProviderContext = {
  execute(call: AgentToolCall, tool: AgentToolDefinition): Promise<AgentToolExecutionResult>;
  actionExecution?: {
    envelope(call: AgentToolCall, tool: AgentToolDefinition): KwiltActionExecutionEnvelope;
    store: ActionExecutionReceiptStore;
    resolveTarget?: Parameters<typeof executeActionEnvelope>[0]['resolveTarget'];
    createReceiptId(): string;
    now(): string;
  };
};

export function createMobileToolProviderRegistry(
  tools: readonly AgentToolDefinition[],
): RuntimeToolProviderRegistry<MobileToolProviderContext> {
  const toolIds = new Set(tools.map((tool) => tool.id));
  return createRuntimeToolProviderRegistry({
    tools,
    registrations: MOBILE_TOOL_PROVIDER_REGISTRATIONS.filter((item) => toolIds.has(item.toolId)),
  });
}

export async function executeMobileRegisteredTool({
  registry,
  context,
  call,
  tool,
}: {
  registry: RuntimeToolProviderRegistry<MobileToolProviderContext>;
  context: MobileToolProviderContext;
  call: AgentToolCall;
  tool: AgentToolDefinition;
}): Promise<AgentToolExecutionResult> {
  const provider = tool.providers.find((candidate) => registry.has(tool.id, candidate));
  if (!provider) {
    return { status: 'unavailable', reason: 'mobile_provider_unavailable', retryable: false };
  }
  if (!context.actionExecution) return registry.execute(tool.id, provider, context, call);
  const receipt = await executeActionEnvelope({
    envelope: context.actionExecution.envelope(call, tool),
    store: context.actionExecution.store,
    resolveTarget: context.actionExecution.resolveTarget,
    createReceiptId: context.actionExecution.createReceiptId,
    now: context.actionExecution.now,
    execute: () => registry.execute(tool.id, provider, context, call),
  });
  return toolResultFromActionReceipt(receipt);
}
