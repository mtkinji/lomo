import {
  runBoundedServerAgentToolLoop,
  type CanonicalAgentRunRequest,
  type ServerAgentProposalRecord,
  type ServerAgentProposalRequest,
  type ServerAgentLoopMessage,
  type ServerAgentModelStep,
} from './agentRuntime.ts';
import { SERVER_AGENT_TOOL_CATALOG } from './serverAgentCatalog.ts';
import { executeServerAgentTool } from './serverAgentTools.ts';
import { calendarDateInTimeZone, normalizeIanaTimeZone } from '../../../packages/kwilt-agent-runtime/src/timeContext.ts';

export type EnqueuedAgentRun = {
  threadId: string;
  messageId: string;
  runId: string;
  status: string;
  version: number;
  replayed: boolean;
};

type ClientActionRequest = {
  capabilityId: string;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  title: string;
  consequenceSummary: string;
  payload: Record<string, unknown>;
};

export type AgentRunPersistence = {
  enqueue: (request: CanonicalAgentRunRequest) => Promise<EnqueuedAgentRun>;
  start: (run: EnqueuedAgentRun, request: CanonicalAgentRunRequest) => Promise<number>;
  loadHistory: (threadId: string) => Promise<Array<{ role: 'user' | 'assistant'; content: string }>>;
  stageClientAction: (input: {
    run: EnqueuedAgentRun;
    callId: string;
    action: ClientActionRequest;
  }) => Promise<void>;
  stageProposal: (input: {
    run: EnqueuedAgentRun;
    callId: string;
    proposal: ServerAgentProposalRequest;
  }) => Promise<ServerAgentProposalRecord>;
  stageProposals: (input: {
    run: EnqueuedAgentRun;
    callId: string;
    proposals: ServerAgentProposalRequest[];
  }) => Promise<ServerAgentProposalRecord[]>;
  complete: (input: {
    run: EnqueuedAgentRun;
    expectedVersion: number;
    body: string;
    status: 'complete' | 'partial';
    participatingCapabilities: string[];
    requestClass: 'general' | 'capability_question';
  }) => Promise<Record<string, unknown>>;
  fail: (input: {
    run: EnqueuedAgentRun;
    expectedVersion: number;
    code: string;
    request: CanonicalAgentRunRequest;
  }) => Promise<void>;
};

export type AgentRunCoordinatorResult =
  | { state: string; replayed: true; run: EnqueuedAgentRun }
  | { state: 'complete' | 'partial'; replayed: false; run: Record<string, unknown>; answer: string };

function projectAuthoritativeServerAnswer({
  modelContent,
  events,
  messages,
}: {
  modelContent: string;
  events: readonly Record<string, unknown>[];
  messages: readonly ServerAgentLoopMessage[];
}): string {
  const proposedCount = messages.reduce((count, message) => {
    if (message.role !== 'tool') return count;
    try {
      const result = JSON.parse(message.content) as { status?: string; proposal?: { count?: number } };
      if (result.status !== 'proposed') return count;
      return count + (Number.isInteger(result.proposal?.count) && Number(result.proposal?.count) > 1
        ? Number(result.proposal?.count)
        : 1);
    } catch {
      return count;
    }
  }, 0);
  if (proposedCount === 1) {
    return 'I prepared that change for review in Kwilt. It has not been applied yet.';
  }
  if (proposedCount > 1) {
    return `I prepared ${proposedCount} changes for review in Kwilt. They have not been applied yet.`;
  }
  const unavailableReason = messages.reduce<string | null>((reason, message) => {
    if (reason || message.role !== 'tool') return reason;
    try {
      const result = JSON.parse(message.content) as { status?: string; reason?: string };
      return result.status === 'unavailable' && typeof result.reason === 'string' && result.reason.trim()
        ? result.reason.trim()
        : null;
    } catch {
      return null;
    }
  }, null);
  if (unavailableReason) return unavailableReason;
  const pendingClientActionCount = events.filter((event) => event.resultStatus === 'pending_client_action').length;
  if (pendingClientActionCount > 0) {
    return 'I prepared that next step for review in Kwilt. The underlying action has not happened yet.';
  }
  return modelContent;
}

export function buildAgentSystemPrompt(request: CanonicalAgentRunRequest, now = new Date()): string {
  const timeZone = normalizeIanaTimeZone(request.channelContext.timeZone) ?? 'UTC';
  const calendarDate = calendarDateInTimeZone(now, timeZone);
  return [
    'You are Kwilt, a concise personal life-system assistant.',
    'Think deeply, speak plainly, and stop when you have helped.',
    'Use tools whenever account truth is needed. Never invent account state.',
    'For questions that span Kwilt, call every relevant read tool and synthesize their results. Preserve capability-owned priority and status instead of inventing a competing ranking.',
    'Use relationships.remember only when the user explicitly asks Kwilt to remember or directly states a personal fact, date, or follow-up cadence that should persist. For a correction or forgetting request, call relationships.read first, then pass the exact memory, event, or cadence record id and updatedAt to relationships.correct or relationships.forget. Whole-person forgetting is not available until Kwilt can restore its dependent records safely. Never infer sensitive relationship facts, correct a different record, or claim a relationship write without its receipt.',
    `Current date in ${timeZone} is ${calendarDate}. Resolve relative dates such as today and tomorrow from this date.`,
    'For Plan tools, always pass targetDate as YYYY-MM-DD.',
    'A pending_client_action means review is ready in the Kwilt app; it does not mean the underlying action happened.',
    'Never claim sharing, permissions, Screen Time, billing, or deletion completed from a device handoff.',
  ].join(' ');
}

export async function executeCanonicalAgentRun({
  request,
  userId,
  persistence,
  dataClient,
  modelStep,
  authorizeTool,
}: {
  request: CanonicalAgentRunRequest;
  userId: string;
  persistence: AgentRunPersistence;
  dataClient: {
    from: (table: string) => unknown;
    rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  };
  modelStep: (input: {
    messages: readonly ServerAgentLoopMessage[];
    round: number;
  }) => Promise<ServerAgentModelStep>;
  authorizeTool?: (tool: (typeof SERVER_AGENT_TOOL_CATALOG)[number]) => boolean;
}): Promise<AgentRunCoordinatorResult> {
  const enqueued = await persistence.enqueue(request);
  if (enqueued.replayed) return { state: enqueued.status, replayed: true, run: enqueued };

  let activeVersion = enqueued.version;
  try {
    activeVersion = await persistence.start(enqueued, request);
    const history = await persistence.loadHistory(enqueued.threadId);
    const initialMessages: ServerAgentLoopMessage[] = [{
      role: 'system',
      content: buildAgentSystemPrompt(request),
    }, ...history];
    const loop = await runBoundedServerAgentToolLoop({
      tools: SERVER_AGENT_TOOL_CATALOG,
      initialMessages,
      modelStep: ({ messages, round }) => modelStep({ messages, round }),
      executeTool: (call, tool) => {
        if (authorizeTool && !authorizeTool(tool)) {
          return Promise.resolve({
            status: 'failed' as const,
            code: 'tool_not_permitted',
            message: `${tool.id} is not permitted for this channel.`,
            retryable: false,
          });
        }
        return executeServerAgentTool({
          client: dataClient,
          userId,
          call,
          tool,
          writeContext: { threadId: enqueued.threadId, runId: enqueued.runId, messageId: enqueued.messageId },
          stageDeviceAction: (action) => persistence.stageClientAction({ run: enqueued, callId: call.id, action }),
          stageProposal: (proposal) => persistence.stageProposal({ run: enqueued, callId: call.id, proposal }),
          stageProposals: (proposals) => persistence.stageProposals({ run: enqueued, callId: call.id, proposals }),
          timeZone: request.channelContext.timeZone,
        });
      },
    });
    const modelContent = loop.content?.trim();
    if (!modelContent) throw new Error('run_missing_answer');
    const content = projectAuthoritativeServerAnswer({ modelContent, events: loop.events, messages: loop.messages });
    const capabilityByTool = new Map(SERVER_AGENT_TOOL_CATALOG.map((tool) => [tool.id, tool.capabilityId]));
    const participatingCapabilities = [...new Set(loop.events
      .map((event) => typeof event.toolId === 'string' ? capabilityByTool.get(event.toolId) : null)
      .filter((value): value is string => Boolean(value)))];
    const status = loop.status === 'completed' ? 'complete' : 'partial';
    const completed = await persistence.complete({
      run: enqueued,
      expectedVersion: activeVersion,
      body: content,
      status,
      participatingCapabilities,
      requestClass: participatingCapabilities.length > 0 ? 'capability_question' : 'general',
    });
    return { state: status, replayed: false, run: completed, answer: content };
  } catch (error) {
    const code = error instanceof Error ? error.message.split(':')[0] : 'run_failed';
    await persistence.fail({ run: enqueued, expectedVersion: activeVersion, code, request });
    throw error;
  }
}
