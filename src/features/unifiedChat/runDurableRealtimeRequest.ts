import type {
  DurableRealtimeRunRequest,
  DurableRealtimeToolResult,
} from '../liveConversation/durableRealtimeTool';
import { isDurableRealtimeStopUtterance } from '../liveConversation/durableRealtimeTool';
import { KWILT_CHANNEL_CONTEXT_SCHEMA_VERSION } from './channelContext';
import { buildFinalizedConversationRunMessage } from './finalizedConversationTurn';

type TerminalStatus = Exclude<DurableRealtimeToolResult['status'], 'needs_input'>;
type AggregateShape = {
  runs: Array<{
    id: string;
    status: TerminalStatus | 'queued' | 'active';
    triggerId?: string;
    assistantMessageId: string | null;
    errorMessage: string | null;
  }>;
  messages: Array<{ id: string; body: string }>;
};

export async function runDurableRealtimeRequest<TAggregate extends AggregateShape>({
  request,
  activeRun,
  send,
  getThreadId,
  loadThread,
  stopRun,
  onLoaded,
}: {
  request: DurableRealtimeRunRequest;
  activeRun: { runId: string | null; owner: 'local' | 'server' } | null;
  send(payload: string): Promise<void>;
  getThreadId(): string | null | undefined;
  loadThread(threadId: string): Promise<TAggregate>;
  stopRun(runId: string): Promise<unknown>;
  onLoaded(aggregate: TAggregate): void;
}): Promise<DurableRealtimeToolResult> {
  if (request.channelContextVersion !== KWILT_CHANNEL_CONTEXT_SCHEMA_VERSION) {
    return { status: 'needs_input', message: 'Kwilt needs updated conversation context. Please try again.' };
  }
  if (isDurableRealtimeStopUtterance(request.transcript) && activeRun?.owner === 'server' && activeRun.runId) {
    await stopRun(activeRun.runId);
    return { status: 'stopped', message: 'Stopped.', runId: activeRun.runId };
  }
  const message = buildFinalizedConversationRunMessage({
    itemId: request.realtimeItemId,
    transcript: request.transcript,
  });
  await send(message.payload);
  const threadId = getThreadId();
  if (!threadId) return { status: 'failed', message: 'Kwilt could not open that conversation.' };
  const latest = await loadThread(threadId);
  onLoaded(latest);
  const run = [...latest.runs].reverse().find((candidate) => candidate.triggerId === message.requestId);
  if (!run || run.status === 'queued' || run.status === 'active') {
    return { status: 'failed', message: 'Kwilt could not finish that request.' };
  }
  const assistantMessage = run.assistantMessageId
    ? latest.messages.find((candidate) => candidate.id === run.assistantMessageId)
    : null;
  return {
    status: run.status,
    message: assistantMessage?.body.trim() || run.errorMessage || (
      run.status === 'stopped' ? 'That request was stopped.' : 'Kwilt finished without a spoken response.'
    ),
    runId: run.id,
  };
}
