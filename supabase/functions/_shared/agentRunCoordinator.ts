import {
  runBoundedServerAgentToolLoop,
  type CanonicalAgentRunRequest,
  type ServerAgentProposalRecord,
  type ServerAgentProposalRequest,
  type ServerAgentLoopMessage,
  type ServerAgentModelStep,
  type ServerAgentModelMetadata,
} from './agentRuntime.ts';
import { SERVER_AGENT_TOOL_CATALOG } from './serverAgentCatalog.ts';
import { executeServerAgentTool } from './serverAgentTools.ts';
import { calendarDateInTimeZone, normalizeIanaTimeZone } from '../../../packages/kwilt-agent-runtime/src/timeContext.ts';
import { buildUnifiedChatAgentInstructions } from './unifiedChatAgentPolicy.ts';

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
  loadReplay: (run: EnqueuedAgentRun) => Promise<{
    answer: string;
    status: 'complete' | 'partial';
  }>;
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
  recordModelStep: (input: {
    run: EnqueuedAgentRun;
    round: number;
    metadata: ServerAgentModelMetadata;
  }) => Promise<void>;
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
  | { state: 'complete' | 'partial'; replayed: true; run: EnqueuedAgentRun; answer: string }
  | { state: 'complete' | 'partial'; replayed: false; run: Record<string, unknown>; answer: string };

type AgentRunExecutionDependencies = {
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
};

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
  return buildUnifiedChatAgentInstructions({ currentDate: calendarDate, timeZone });
}

export async function enqueueCanonicalAgentRun({
  request,
  persistence,
}: {
  request: CanonicalAgentRunRequest;
  persistence: AgentRunPersistence;
}): Promise<EnqueuedAgentRun> {
  return persistence.enqueue(request);
}

export async function executeEnqueuedCanonicalAgentRun({
  request,
  enqueued,
  userId,
  persistence,
  dataClient,
  modelStep,
  authorizeTool,
}: AgentRunExecutionDependencies & {
  enqueued: EnqueuedAgentRun;
}): Promise<AgentRunCoordinatorResult> {
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
      modelStep: async ({ messages, round }) => {
        const step = await modelStep({ messages, round });
        if (step.metadata) {
          await persistence.recordModelStep({ run: enqueued, round, metadata: step.metadata });
        }
        return step;
      },
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

export async function executeCanonicalAgentRun(
  dependencies: AgentRunExecutionDependencies,
): Promise<AgentRunCoordinatorResult> {
  const enqueued = await enqueueCanonicalAgentRun(dependencies);
  if (enqueued.replayed) {
    if (enqueued.status !== 'complete' && enqueued.status !== 'partial') {
      throw new Error('run_replay_not_terminal');
    }
    const replay = await dependencies.persistence.loadReplay(enqueued);
    return { state: replay.status, replayed: true, run: enqueued, answer: replay.answer };
  }
  return executeEnqueuedCanonicalAgentRun({ ...dependencies, enqueued });
}
