import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatRun, UnifiedChatThreadAggregate } from './types';
import type { KwiltChannelContextPacket } from './channelContext';

const TERMINAL_RUN_STATUSES = new Set(['complete', 'partial', 'stopped', 'steered', 'failed']);

type InvokeAgentRun = (
  functionName: string,
  options: { body: Record<string, unknown> },
) => Promise<{ data: unknown; error: { message?: string } | null }>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function abortError(): Error {
  const error = new Error('Durable mobile Chat polling was stopped.');
  error.name = 'AbortError';
  return error;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function isDurableMobileChatEligible({
  aggregate,
  attachmentCount,
  interactionMode,
  isRetry,
}: {
  aggregate: UnifiedChatThreadAggregate;
  attachmentCount: number;
  interactionMode: 'text' | 'conversation';
  isRetry: boolean;
}): boolean {
  void aggregate;
  void attachmentCount;
  void isRetry;
  return interactionMode === 'text' || interactionMode === 'conversation';
}

export async function runDurableMobileChatTurn({
  threadId,
  prompt,
  requestId,
  channelContext,
  parentRunId,
  invoke,
  loadThread,
  onProgress,
  signal,
  pollIntervalMs = 750,
}: {
  threadId: string;
  prompt: string;
  requestId: string;
  channelContext: KwiltChannelContextPacket;
  parentRunId?: string | null;
  invoke: InvokeAgentRun;
  loadThread: (threadId: string) => Promise<UnifiedChatThreadAggregate>;
  onProgress?: (aggregate: UnifiedChatThreadAggregate, runId: string) => void;
  signal?: AbortSignal;
  pollIntervalMs?: number;
}): Promise<UnifiedChatThreadAggregate> {
  const { data, error } = await invoke('agent-run', {
    body: {
      channel: 'mobile',
      requestId,
      prompt,
      threadId,
      initiator: 'user',
      triggerKind: 'user_message',
      triggerId: requestId,
      parentRunId: parentRunId ?? null,
      channelContext,
    },
  });
  if (error) throw new Error(error.message || 'Kwilt could not start the response.');
  const response = record(data);
  const responseRun = record(response.run);
  const runId = typeof responseRun.runId === 'string' ? responseRun.runId : '';
  if (!runId || (response.state !== 'accepted' && response.state !== 'complete' && response.state !== 'partial')) {
    throw new Error('Kwilt did not return a durable response run.');
  }

  while (true) {
    if (signal?.aborted) throw abortError();
    const aggregate = await loadThread(threadId);
    onProgress?.(aggregate, runId);
    const run = aggregate.runs.find((candidate) => candidate.id === runId);
    if (run && TERMINAL_RUN_STATUSES.has(run.status)) return aggregate;
    if (signal?.aborted) throw abortError();
    await wait(pollIntervalMs, signal);
  }
}

export async function transitionDurableMobileChatRun({
  threadId,
  runId,
  disposition,
  loadThread,
  transitionRunStatus,
  now = () => new Date(),
}: {
  threadId: string;
  runId: string;
  disposition: { type: 'stop' } | { type: 'steer'; prompt: string };
  loadThread: (threadId: string) => Promise<UnifiedChatThreadAggregate>;
  transitionRunStatus: UnifiedChatRepository['transitionRunStatus'];
  now?: () => Date;
}): Promise<UnifiedChatThreadAggregate> {
  const latest = await loadThread(threadId);
  const run = latest.runs.find((candidate) => candidate.id === runId);
  if (!run || (run.status !== 'queued' && run.status !== 'active')) return latest;

  const completedAt = now().toISOString();
  const steeringActiveRun = disposition.type === 'steer' && run.status === 'active';
  const toStatus: UnifiedChatRun['status'] = steeringActiveRun ? 'steered' : 'stopped';
  await transitionRunStatus({
    runId: run.id,
    fromStatus: run.status,
    toStatus,
    expectedVersion: run.version,
    errorCode: null,
    errorMessage: null,
    completedAt,
    ...(toStatus === 'stopped' ? { stopRequestedAt: completedAt } : {}),
    ...(steeringActiveRun ? { steerCount: run.steerCount + 1 } : {}),
    event: disposition.type === 'steer'
      ? {
          type: 'instruction', status: 'warning', visibility: 'user',
          label: 'Direction updated', detail: 'Continuing with your new instruction.',
          payload: { prompt: disposition.prompt },
        }
      : {
          type: 'response', status: 'warning', visibility: 'user', label: 'Response stopped',
        },
  });
  return loadThread(threadId);
}
