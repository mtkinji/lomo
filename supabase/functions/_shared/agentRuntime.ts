import { parseSmsCommand } from './phoneAgent.ts';
import { normalizeIanaTimeZone } from '../../../packages/kwilt-agent-runtime/src/timeContext.ts';
import {
  normalizeKwiltChannelContext,
  type KwiltChannelContextPacket,
} from '../../../packages/kwilt-agent-runtime/src/channelContext.ts';

export type AgentRunChannel = 'mobile' | 'sms' | 'phone' | 'desktop' | 'external';
export type AgentRunInitiator = 'user' | 'system';
export type AgentRunTriggerKind =
  | 'user_message'
  | 'reminder'
  | 'recurring_kwilt_action'
  | 'monitor'
  | 'background_analysis'
  | 'native_device_enforcement';

export type CanonicalAgentRunRequest = {
  channel: AgentRunChannel;
  requestId: string;
  prompt: string;
  threadId: string | null;
  initiator?: AgentRunInitiator;
  triggerKind?: AgentRunTriggerKind;
  triggerId?: string;
  parentRunId?: string | null;
  channelContext: {
    phoneLinkId?: string;
    externalMessageId?: string;
    disclosureAcknowledged?: boolean;
    timeZone?: string;
  } & Partial<KwiltChannelContextPacket>;
};

type PhoneLinkPolicy = {
  status: string;
  optedOutAt: string | null;
  permissions: Record<string, boolean>;
};

const CHANNELS = new Set<AgentRunChannel>(['mobile', 'sms', 'phone', 'desktop', 'external']);
const TRIGGER_KINDS = new Set<AgentRunTriggerKind>([
  'user_message', 'reminder', 'recurring_kwilt_action', 'monitor',
  'background_analysis', 'native_device_enforcement',
]);
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
  const requestId = boundedString(input.requestId, 'request_id', 200);
  const initiator = input.initiator == null ? 'user' : input.initiator;
  const triggerKind = input.triggerKind == null ? 'user_message' : input.triggerKind;
  if ((initiator !== 'user' && initiator !== 'system') ||
      typeof triggerKind !== 'string' || !TRIGGER_KINDS.has(triggerKind as AgentRunTriggerKind) ||
      (initiator === 'user') !== (triggerKind === 'user_message')) {
    throw new Error('invalid_trigger_provenance');
  }
  const triggerId = input.triggerId == null
    ? requestId
    : boundedString(input.triggerId, 'trigger_id', 200);
  const parentRunId = input.parentRunId == null ? null : boundedString(input.parentRunId, 'parent_run_id', 64);
  if (parentRunId && !UUID_PATTERN.test(parentRunId)) throw new Error('invalid_parent_run_id');
  const rawContext = record(input.channelContext);
  const channelContext: CanonicalAgentRunRequest['channelContext'] = {};
  const mobileContext = normalizeKwiltChannelContext(rawContext);
  if (channel === 'mobile' && mobileContext) Object.assign(channelContext, mobileContext);
  if (typeof rawContext.phoneLinkId === 'string' && rawContext.phoneLinkId.trim()) {
    channelContext.phoneLinkId = rawContext.phoneLinkId.trim().slice(0, 200);
  }
  if (typeof rawContext.externalMessageId === 'string' && rawContext.externalMessageId.trim()) {
    channelContext.externalMessageId = rawContext.externalMessageId.trim().slice(0, 200);
  }
  if (rawContext.disclosureAcknowledged === true) channelContext.disclosureAcknowledged = true;
  const timeZone = normalizeIanaTimeZone(rawContext.timeZone);
  if (timeZone) channelContext.timeZone = timeZone;
  else delete channelContext.timeZone;
  return {
    channel: channel as AgentRunChannel,
    requestId,
    prompt: boundedString(input.prompt, 'prompt', 100_000),
    threadId,
    initiator: initiator as AgentRunInitiator,
    triggerKind: triggerKind as AgentRunTriggerKind,
    triggerId,
    parentRunId,
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
  confirmation: 'none' | 'explicit' | 'native';
  canDeferToClient: boolean;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
};

export type ServerAgentToolCall = {
  id: string;
  /** Provider correlation only. Never use this value as a Kwilt idempotency key. */
  providerCallId?: string;
  toolId: string;
  arguments: Record<string, unknown>;
};

export type ServerAgentToolResult =
  | { status: 'completed'; output: Record<string, unknown>; receipt: Record<string, unknown> | null }
  | { status: 'proposed'; proposal: Record<string, unknown> }
  | { status: 'pending_client_action'; provider: 'device' | 'connector'; request: Record<string, unknown> }
  | { status: 'needs_input'; prompt: string; fields: string[] }
  | { status: 'unavailable'; reason: string; retryable: boolean }
  | { status: 'refused'; reason: string }
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

export type ServerAgentModelMetadata = {
  responseId: string;
  routedModel: string;
  promptVersion: string;
  toolCatalogHash: string;
  latencyMs: number;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
};

export type ServerAgentModelStep = {
  content: string | null;
  toolCalls: ServerAgentToolCall[];
  metadata?: ServerAgentModelMetadata;
};

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
  modelTools = tools,
  initialMessages,
  modelStep,
  executeTool,
  signal,
  maxRounds = 4,
  maxToolCalls = 12,
}: {
  tools: readonly ServerAgentToolDefinition[];
  modelTools?: readonly ServerAgentToolDefinition[];
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
    const step = await modelStep({ messages, tools: modelTools, round, ...(signal ? { signal } : {}) });
    events.push({
      sequence: ++eventSequence, type: 'model_step', round,
      ...(step.metadata ? { metadata: step.metadata } : {}),
    });
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
