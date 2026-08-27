import {
  normalizeStrictToolArguments,
  toStrictToolInputSchema,
} from '../../../packages/kwilt-agent-runtime/src/strictToolSchema.ts';
import type {
  ServerAgentLoopMessage,
  ServerAgentModelMetadata,
  ServerAgentModelStep,
  ServerAgentToolCall,
  ServerAgentToolDefinition,
} from './agentRuntime.ts';
import type { KwiltToolNamespaceId } from '../../../packages/kwilt-agent-runtime/src/toolNamespaces.ts';

export const SERVER_AGENT_PROMPT_VERSION = 'unified-chat-agent-v1';

type ResponsesPolicyContext = { currentDate: string; timeZone: string };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]));
  }
  return value;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function toServerResponsesTools(tools: readonly ServerAgentToolDefinition[]) {
  return tools.map((tool) => ({
    type: 'function',
    name: tool.id,
    description: tool.purpose,
    parameters: toStrictToolInputSchema(tool.inputSchema),
    strict: true,
  }));
}

export function serverResponsesToolCatalogHash(tools: readonly ServerAgentToolDefinition[]): string {
  return fnv1a(JSON.stringify(stableValue(tools.map((tool) => ({
    id: tool.id,
    version: tool.version,
    capabilityId: tool.capabilityId,
    purpose: tool.purpose,
    providers: tool.providers,
    effect: tool.effect,
    consequence: tool.consequence,
    reversible: tool.reversible,
    confirmation: tool.confirmation,
    canDeferToClient: tool.canDeferToClient,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
  })))));
}

export function toServerResponsesInput(messages: readonly ServerAgentLoopMessage[]): Array<Record<string, unknown>> {
  const providerCallIdByKwiltId = new Map<string, string>();
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const call of message.toolCalls ?? []) {
      if (call.providerCallId) providerCallIdByKwiltId.set(call.id, call.providerCallId);
    }
  }

  const input: Array<Record<string, unknown>> = [];
  for (const message of messages) {
    if (message.role === 'system') continue;
    if (message.role === 'user') {
      input.push({ role: 'user', content: message.content });
      continue;
    }
    if (message.role === 'assistant') {
      if (message.content?.trim()) input.push({ role: 'assistant', content: message.content });
      input.push(...(message.toolCalls ?? []).map((call) => ({
          type: 'function_call',
          call_id: call.providerCallId ?? call.id,
          name: call.toolId,
          arguments: JSON.stringify(call.arguments),
        })));
      continue;
    }
    if (message.role !== 'tool') continue;
    input.push({
      type: 'function_call_output',
      call_id: providerCallIdByKwiltId.get(message.toolCallId) ?? message.toolCallId,
      output: message.content,
    });
  }
  return input;
}

function optionalTokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseServerAgentResponse(
  raw: unknown,
  tools: readonly ServerAgentToolDefinition[],
  context: { latencyMs: number; toolCatalogHash: string },
): ServerAgentModelStep {
  const body = record(raw);
  const responseId = typeof body.id === 'string' ? body.id : '';
  const routedModel = typeof body.model === 'string' ? body.model : '';
  if (!responseId || !routedModel || !Array.isArray(body.output)) throw new Error('model_response_malformed');
  if (body.status !== 'completed') {
    const reason = typeof record(body.incomplete_details).reason === 'string'
      ? record(body.incomplete_details).reason
      : 'unknown';
    throw new Error(`model_response_incomplete:${reason}`);
  }

  const toolById = new Map(tools.map((tool) => [tool.id, tool]));
  const text: string[] = [];
  const toolCalls: ServerAgentToolCall[] = [];
  let toolOrdinal = 0;
  for (const rawOutput of body.output) {
    const output = record(rawOutput);
    if (output.type === 'message') {
      if (!Array.isArray(output.content)) throw new Error('model_response_malformed');
      for (const rawPart of output.content) {
        const part = record(rawPart);
        if (part.type === 'refusal') throw new Error('model_response_refused');
        if (part.type === 'output_text' && typeof part.text === 'string') text.push(part.text);
      }
      continue;
    }
    if (output.type !== 'function_call') continue;
    const providerCallId = typeof output.call_id === 'string' ? output.call_id : '';
    const toolId = typeof output.name === 'string' ? output.name : '';
    const argumentsText = typeof output.arguments === 'string' ? output.arguments : '';
    if (!providerCallId || !toolId || !argumentsText) throw new Error('model_tool_call_malformed');
    const tool = toolById.get(toolId);
    if (!tool) throw new Error('model_tool_unknown');
    let parsedArguments: unknown;
    try { parsedArguments = JSON.parse(argumentsText); } catch { throw new Error('model_tool_arguments_malformed'); }
    if (!parsedArguments || typeof parsedArguments !== 'object' || Array.isArray(parsedArguments)) {
      throw new Error('model_tool_arguments_malformed');
    }
    const normalized = normalizeStrictToolArguments(tool.inputSchema, parsedArguments);
    if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
      throw new Error('model_tool_arguments_malformed');
    }
    toolOrdinal += 1;
    toolCalls.push({
      id: `${responseId}:tool:${toolOrdinal}`,
      providerCallId,
      toolId,
      arguments: normalized as Record<string, unknown>,
    });
  }

  const usage = record(body.usage);
  const metadata: ServerAgentModelMetadata = {
    responseId,
    routedModel,
    promptVersion: SERVER_AGENT_PROMPT_VERSION,
    toolCatalogHash: context.toolCatalogHash,
    latencyMs: Math.max(0, Math.round(context.latencyMs)),
    usage: {
      inputTokens: optionalTokenCount(usage.input_tokens),
      outputTokens: optionalTokenCount(usage.output_tokens),
      totalTokens: optionalTokenCount(usage.total_tokens),
    },
  };
  return { content: text.join('\n').trim() || null, toolCalls, metadata };
}

export async function requestServerAgentResponse({
  supabaseUrl,
  anonKey,
  serviceRoleToken,
  quotaIdentity,
  isPro,
  messages,
  tools,
  resolvedTools = tools,
  toolSearchNamespaces = [],
  policyContext,
  signal,
  fetcher = fetch,
}: {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleToken: string;
  quotaIdentity: string;
  isPro: boolean;
  messages: readonly ServerAgentLoopMessage[];
  tools: readonly ServerAgentToolDefinition[];
  resolvedTools?: readonly ServerAgentToolDefinition[];
  toolSearchNamespaces?: readonly KwiltToolNamespaceId[];
  policyContext: ResponsesPolicyContext;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}): Promise<ServerAgentModelStep> {
  const toolCatalogHash = serverResponsesToolCatalogHash(resolvedTools);
  const visibleToolIds = new Set(tools.map((tool) => tool.id));
  const requestTools: Array<Record<string, unknown>> = resolvedTools.map((tool) => ({
    ...toServerResponsesTools([tool])[0],
    ...(!visibleToolIds.has(tool.id) ? { defer_loading: true } : {}),
  }));
  if (toolSearchNamespaces.length > 0) {
    requestTools.push({ type: 'tool_search', execution: 'server' });
  }
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetcher(`${supabaseUrl}/functions/v1/ai-chat/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', apikey: anonKey,
        Authorization: `Bearer ${serviceRoleToken}`,
        'x-kwilt-install-id': `agent:${quotaIdentity}`,
        'x-kwilt-is-pro': String(isPro),
        'x-kwilt-client': 'kwilt-agent-run',
        'x-kwilt-ai-job': 'unified_chat_agent',
      },
      body: JSON.stringify({
        store: false,
        max_output_tokens: 1_200,
        parallel_tool_calls: false,
        input: toServerResponsesInput(messages),
        ...(requestTools.length > 0 ? { tools: requestTools } : {}),
        policy_context: policyContext,
      }),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('model_request_timeout:retryable');
    }
    throw error;
  }
  const responseText = await response.text();
  if (!response.ok) throw new Error(`model_request_failed:${response.status}:${responseText.slice(0, 300)}`);
  let data: unknown;
  try { data = JSON.parse(responseText); } catch { throw new Error('model_response_malformed'); }
  return parseServerAgentResponse(data, resolvedTools, {
    latencyMs: Date.now() - startedAt,
    toolCatalogHash,
  });
}
