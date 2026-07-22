import type { UnifiedChatRun, UnifiedChatThreadAggregate } from './types';
import type { AgentWorkbenchRun, AgentWorkbenchSnapshot } from './workbenchProtocol';

function projectRun(run: UnifiedChatRun): AgentWorkbenchRun {
  const isActive = run.status === 'queued' || run.status === 'active';
  const isFailed = run.status === 'failed';
  const events: AgentWorkbenchRun['events'] = isActive
    ? [
        {
          id: `${run.id}:working`,
          sequence: 1,
          type: 'progress',
          status: 'active',
          label: 'Preparing a response',
        },
      ]
    : isFailed
      ? [
          {
            id: `${run.id}:failed`,
            sequence: 1,
            type: 'error',
            status: 'failed',
            label: 'Response interrupted',
            detail: 'Try sending your message again.',
          },
        ]
      : [];

  return {
    id: run.id,
    threadId: run.threadId,
    ...(run.assistantMessageId ? { assistantMessageId: run.assistantMessageId } : {}),
    status: run.status,
    events,
  };
}

export function buildWorkbenchSnapshot(
  aggregate: UnifiedChatThreadAggregate,
  prompt = '',
): AgentWorkbenchSnapshot {
  const hasActiveRun = aggregate.runs.some(
    (run) => run.status === 'queued' || run.status === 'active',
  );
  return {
    product: {
      id: 'kwilt',
      assistantName: 'Kwilt',
      placeholder: 'Ask, search or chat…',
      features: {
        attachments: false,
        mentions: false,
        modelControl: false,
        runDepthControl: false,
        runModeControl: false,
        voice: false,
        webSearchControl: false,
      },
    },
    thread: {
      id: aggregate.thread.id,
      title: aggregate.thread.title,
      status: aggregate.thread.status,
    },
    context: [],
    messages: aggregate.messages.map((message) => ({
      id: message.id,
      threadId: message.threadId,
      role: message.role,
      body: message.body,
      createdAt: message.createdAt,
      feedback: message.feedback,
    })),
    runs: aggregate.runs.map(projectRun),
    proposals: [],
    composer: {
      prompt,
      state: hasActiveRun ? 'working' : 'ready',
      attachments: [],
      voice: {
        state: 'unsupported',
        elapsedSeconds: 0,
        message: 'Voice is not available in this TestFlight preview yet.',
      },
    },
  };
}
