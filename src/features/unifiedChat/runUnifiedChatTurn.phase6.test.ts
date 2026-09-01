import { runUnifiedChatTurn } from './runUnifiedChatTurn';
import type { CreateUnifiedChatMessageInput, UnifiedChatThreadAggregate } from './types';

const aggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1', title: 'New chat', titleSource: 'default', status: 'active', archivedAt: null,
    createdAt: '2026-07-21T10:00:00.000Z', updatedAt: '2026-07-21T10:00:00.000Z',
  },
  messages: [],
  runs: [],
};

function harness(response: string) {
  const order: string[] = [];
  const repository = {
    insertMessage: jest.fn(async (input: CreateUnifiedChatMessageInput) => {
      order.push(`message:${input.role}`);
      return {
        id: input.role === 'user' ? 'message-user' : 'message-assistant',
        threadId: 'thread-1', role: input.role, body: input.body, feedback: null,
        createdAt: '2026-07-21T11:00:00.000Z', updatedAt: '2026-07-21T11:00:00.000Z',
        attachments: input.attachments?.map((attachment) => ({
          ...attachment, messageId: 'message-user', createdAt: '2026-07-21T11:00:00.000Z',
        })) ?? [],
      };
    }),
    createRun: jest.fn(async () => ({
      id: 'run-1', threadId: 'thread-1', userMessageId: 'message-user', assistantMessageId: null,
      status: 'active' as const, errorCode: null, errorMessage: null,
      createdAt: '2026-07-21T11:00:00.000Z', updatedAt: '2026-07-21T11:00:00.000Z', completedAt: null,
      requestClass: 'general' as const, participatingCapabilities: [], contextPolicy: {}, version: 1,
      stopRequestedAt: null, steerCount: 0,
    })),
    appendRunEvents: jest.fn(async () => undefined),
    persistRunEvidence: jest.fn(async () => undefined),
    createProposal: jest.fn(async () => ({ id: 'proposal-1', status: 'pending', version: 1 })),
    createClientAction: jest.fn(async () => ({ id: 'action-1', status: 'pending_client_action' })),
    createArtifact: jest.fn(async (input: Record<string, unknown>) => {
      order.push('artifact:persist');
      return { id: 'artifact-1', version: 1, ...input };
    }),
    transitionRunStatus: jest.fn(async (input: { toStatus: string }) => {
      order.push(`run:${input.toStatus}`);
      return {};
    }),
    loadThread: jest.fn(async () => aggregate),
    applyGeneratedThreadTitle: jest.fn(async () => aggregate.thread),
  };
  const send = jest.fn(async (..._args: unknown[]) => response);
  return { order, repository, send };
}

describe('runUnifiedChatTurn Phase 6', () => {
  test('persists a requested editable draft separately from the assistant answer', async () => {
    const response = JSON.stringify({
      answer: 'I drafted an email you can edit.',
      artifact: { title: 'School email', kind: 'document', content: 'Hi Ms. Lee,\n\nCan we talk Friday?' },
    });
    const { repository, send, order } = harness(response);

    await runUnifiedChatTurn(
      { aggregate, prompt: 'Draft an email to the school.' },
      { repository: repository as never, sendCoachChat: send as never },
    );

    expect(send).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
      responseFormat: expect.objectContaining({ type: 'json_schema' }),
      launchContextSummary: expect.stringContaining(
        'Return the requested editable content in the artifact field',
      ),
    }));
    expect(repository.insertMessage).toHaveBeenCalledWith(expect.objectContaining({
      role: 'assistant', body: 'I drafted an email you can edit.',
    }));
    expect(repository.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1', messageId: 'message-assistant', title: 'School email', kind: 'document',
    }));
    expect(order.indexOf('artifact:persist')).toBeGreaterThan(order.indexOf('message:assistant'));
    expect(order.indexOf('artifact:persist')).toBeLessThan(order.indexOf('run:complete'));
  });

  test('persists only inspected image evidence and never transient binary bytes', async () => {
    const response = JSON.stringify({
      answer: 'I found a conflict.',
      facts: [{ text: 'The screenshot shows a dentist appointment.', evidence: [] }],
      inference: 'The appointment may overlap another event.',
      uncertainty: 'Only the attached screenshot was inspected.',
    });
    const { repository, send } = harness(response);

    await runUnifiedChatTurn({
      aggregate,
      prompt: 'What conflicts are visible in this screenshot?',
      clientRequestId: 'request-with-image',
      attachments: [{
        id: 'image-1', name: 'schedule.png', mimeType: 'image/png', sizeBytes: 3,
        kind: 'image', status: 'ready', content: 'Monday: dentist at 9 AM.',
        dataUrl: 'data:image/png;base64,YWJj',
      }],
    }, { repository: repository as never, sendCoachChat: send as never });

    const saved = (repository.insertMessage as jest.Mock).mock.calls[0]?.[0];
    expect(saved.attachments[0]).toEqual(expect.objectContaining({
      kind: 'image', status: 'ready', content: 'Monday: dentist at 9 AM.',
    }));
    expect(saved.attachments[0]).not.toHaveProperty('dataUrl');
    const options = send.mock.calls[0]?.[1] as { launchContextSummary?: string };
    expect(options.launchContextSummary).toContain('schedule.png');
    expect(options.launchContextSummary).toContain('Monday: dentist at 9 AM.');
    expect(options.launchContextSummary).not.toContain('YWJj');
  });
});
