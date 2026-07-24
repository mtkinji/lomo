import { parseSmsCommand } from './phoneAgent.ts';
import { normalizeIanaTimeZone } from '../../../packages/kwilt-agent-runtime/src/timeContext.ts';

export type AgentRunChannel = 'mobile' | 'sms' | 'phone' | 'desktop' | 'external';

export type CanonicalAgentRunRequest = {
  channel: AgentRunChannel;
  requestId: string;
  prompt: string;
  threadId: string | null;
  channelContext: {
    phoneLinkId?: string;
    externalMessageId?: string;
    disclosureAcknowledged?: boolean;
    timeZone?: string;
  };
};

type PhoneLinkPolicy = {
  status: string;
  optedOutAt: string | null;
  permissions: Record<string, boolean>;
};

const CHANNELS = new Set<AgentRunChannel>(['mobile', 'sms', 'phone', 'desktop', 'external']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function boundedString(value: unknown, field: string, maxLength: number): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || normalized.length > maxLength) throw new Error(`invalid_${field}`);
  return normalized;
}

export function normalizeAgentRunRequest(raw: unknown): CanonicalAgentRunRequest {
  const input = record(raw);
  const channel = input.channel;
  if (typeof channel !== 'string' || !CHANNELS.has(channel as AgentRunChannel)) {
    throw new Error('invalid_channel');
  }
  const threadId = input.threadId == null ? null : boundedString(input.threadId, 'thread_id', 64);
  if (threadId && !UUID_PATTERN.test(threadId)) throw new Error('invalid_thread_id');
  const rawContext = record(input.channelContext);
  const channelContext: CanonicalAgentRunRequest['channelContext'] = {};
  if (typeof rawContext.phoneLinkId === 'string' && rawContext.phoneLinkId.trim()) {
    channelContext.phoneLinkId = rawContext.phoneLinkId.trim().slice(0, 200);
  }
  if (typeof rawContext.externalMessageId === 'string' && rawContext.externalMessageId.trim()) {
    channelContext.externalMessageId = rawContext.externalMessageId.trim().slice(0, 200);
  }
  if (rawContext.disclosureAcknowledged === true) channelContext.disclosureAcknowledged = true;
  const timeZone = normalizeIanaTimeZone(rawContext.timeZone);
  if (timeZone) channelContext.timeZone = timeZone;
  return {
    channel: channel as AgentRunChannel,
    requestId: boundedString(input.requestId, 'request_id', 200),
    prompt: boundedString(input.prompt, 'prompt', 100_000),
    threadId,
    channelContext,
  };
}

export function resolveAgentChannelAdmission({
  request,
  phoneLink,
}: {
  request: CanonicalAgentRunRequest;
  phoneLink?: PhoneLinkPolicy | null;
}):
  | { decision: 'admit' }
  | { decision: 'deterministic_channel_command'; command: string }
  | { decision: 'denied'; reason: string } {
  if (request.channel !== 'sms' && request.channel !== 'phone') return { decision: 'admit' };
  if (request.channel === 'sms') {
    const command = parseSmsCommand(request.prompt);
    if (command.kind !== 'capture') {
      return { decision: 'deterministic_channel_command', command: command.kind };
    }
  }
  if (!phoneLink || phoneLink.status !== 'verified' || phoneLink.optedOutAt) {
    return { decision: 'denied', reason: 'phone_link_not_active' };
  }
  if (request.channel === 'phone' && request.channelContext.disclosureAcknowledged !== true) {
    return { decision: 'denied', reason: 'phone_disclosure_not_acknowledged' };
  }
  return { decision: 'admit' };
}

export function providerAvailabilityForChannel(channel: AgentRunChannel) {
  return {
    server: true,
    device: channel === 'mobile',
    channel: channel === 'sms' || channel === 'phone',
    connector: true,
  } as const;
}

export function buildPendingDeviceAction(input: {
  capabilityId: string;
  actionType: string;
  title: string;
  consequenceSummary: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}) {
  return {
    status: 'pending_client_action' as const,
    provider: 'device' as const,
    request: { ...input },
  };
}

export type ServerAgentToolDefinition = {
  id: string;
  version: number;
  capabilityId: string;
  purpose: string;
  providers: readonly ('server' | 'device' | 'channel' | 'connector')[];
  effect: 'read' | 'write';
  consequence: 'low' | 'consequential';
  reversible: boolean;
  confirmation: 'none' | 'explicit';
  canDeferToClient: boolean;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
};

export type ServerAgentToolCall = {
  id: string;
  toolId: string;
  arguments: Record<string, unknown>;
};

export type ServerAgentToolResult =
  | { status: 'completed'; output: Record<string, unknown>; receipt: Record<string, unknown> | null }
  | { status: 'proposed'; proposal: Record<string, unknown> }
  | { status: 'pending_client_action'; provider: 'device'; request: Record<string, unknown> }
  | { status: 'needs_input'; prompt: string; fields: string[] }
  | { status: 'unavailable'; reason: string; retryable: boolean }
  | { status: 'failed'; code: string; message: string; retryable: boolean };

export type ServerAgentProposalRequest = {
  capabilityId: string;
  title: string;
  body: string;
  operation: {
    type: string;
    targetType: string | null;
    targetId: string | null;
    summary: string;
    payload: Record<string, unknown>;
  };
};

export type ServerAgentProposalRecord = {
  id: string;
  status: 'pending' | 'edited' | 'rejected' | 'deferred' | 'approved' | 'applying' | 'applied' | 'failed' | 'undone';
  version: number;
  replayed: boolean;
};

export type ServerAgentLoopMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: readonly ServerAgentToolCall[] }
  | { role: 'tool'; toolCallId: string; toolId: string; content: string };

export type ServerAgentModelStep = { content: string | null; toolCalls: ServerAgentToolCall[] };

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]));
  }
  return value;
}

export async function runBoundedServerAgentToolLoop({
  tools,
  initialMessages,
  modelStep,
  executeTool,
  signal,
  maxRounds = 4,
  maxToolCalls = 12,
}: {
  tools: readonly ServerAgentToolDefinition[];
  initialMessages: readonly ServerAgentLoopMessage[];
  modelStep: (input: {
    messages: readonly ServerAgentLoopMessage[];
    tools: readonly ServerAgentToolDefinition[];
    round: number;
    signal?: AbortSignal;
  }) => Promise<ServerAgentModelStep>;
  executeTool: (call: ServerAgentToolCall, tool: ServerAgentToolDefinition) => Promise<ServerAgentToolResult>;
  signal?: AbortSignal;
  maxRounds?: number;
  maxToolCalls?: number;
}) {
  const toolById = new Map(tools.map((tool) => [tool.id, tool]));
  const messages: ServerAgentLoopMessage[] = [...initialMessages];
  const events: Array<Record<string, unknown>> = [];
  const executedSignatures = new Set<string>();
  let eventSequence = 0;
  let callCount = 0;
  const stopped = (round: number) => {
    events.push({ sequence: ++eventSequence, type: 'stopped', round });
    return { status: 'stopped' as const, content: null, messages, events };
  };

  for (let round = 1; round <= maxRounds; round += 1) {
    if (signal?.aborted) return stopped(round);
    const step = await modelStep({ messages, tools, round, ...(signal ? { signal } : {}) });
    events.push({ sequence: ++eventSequence, type: 'model_step', round });
    if (step.toolCalls.length === 0) {
      const content = step.content?.trim();
      if (!content) return { status: 'failed' as const, content: null, errorCode: 'missing_final_content', messages, events };
      messages.push({ role: 'assistant', content });
      return { status: 'completed' as const, content, messages, events };
    }

    messages.push({ role: 'assistant', content: step.content, toolCalls: step.toolCalls });
    for (const call of step.toolCalls) {
      if (signal?.aborted) return stopped(round);
      callCount += 1;
      if (callCount > maxToolCalls) {
        return { status: 'partial' as const, content: step.content, errorCode: 'max_tool_calls_reached', messages, events };
      }
      const tool = toolById.get(call.toolId);
      let result: ServerAgentToolResult;
      let eventType: string;
      if (!tool) {
        result = { status: 'failed', code: 'unknown_tool', message: `Tool ${call.toolId} was not discovered for this run.`, retryable: false };
        eventType = 'unknown_tool';
      } else {
        const signature = `${call.toolId}:${JSON.stringify(stableValue(call.arguments))}`;
        if (executedSignatures.has(signature)) {
          result = { status: 'failed', code: 'repeated_tool_call', message: `Tool ${call.toolId} already ran with these arguments.`, retryable: false };
          eventType = 'repeated_tool_call';
        } else {
          executedSignatures.add(signature);
          result = await executeTool(call, tool);
          eventType = 'tool_completed';
        }
      }
      events.push({
        sequence: ++eventSequence, type: eventType, round,
        toolCallId: call.id, toolId: call.toolId, resultStatus: result.status,
      });
      messages.push({ role: 'tool', toolCallId: call.id, toolId: call.toolId, content: JSON.stringify(result) });
    }
  }
  return { status: 'partial' as const, content: null, errorCode: 'max_rounds_reached', messages, events };
}
