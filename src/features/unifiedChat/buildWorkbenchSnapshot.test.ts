import { buildWorkbenchSnapshot } from './buildWorkbenchSnapshot';
import type { UnifiedChatThreadAggregate } from './types';

const aggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1',
    title: 'Plan my week',
    status: 'active',
    archivedAt: null,
    createdAt: '2026-07-21T10:00:00.000Z',
    updatedAt: '2026-07-21T12:00:00.000Z',
  },
  messages: [
    {
      id: 'message-1',
      threadId: 'thread-1',
      role: 'user',
      body: 'What matters?',
      feedback: null,
      createdAt: '2026-07-21T11:00:00.000Z',
      updatedAt: '2026-07-21T11:00:00.000Z',
    },
  ],
  runs: [],
};

describe('buildWorkbenchSnapshot', () => {
  test('projects a calm Kwilt configuration with an ordered transcript', () => {
    const snapshot = buildWorkbenchSnapshot(aggregate, 'draft text');

    expect(snapshot.product).toEqual({
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
    });
    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.composer).toMatchObject({ prompt: 'draft text', state: 'ready' });
    expect(snapshot.context).toEqual([]);
    expect(snapshot.proposals).toEqual([]);
  });

  test('projects one restrained visible event for an active run', () => {
    const snapshot = buildWorkbenchSnapshot({
      ...aggregate,
      runs: [
        {
          id: 'run-1',
          threadId: 'thread-1',
          userMessageId: 'message-1',
          assistantMessageId: null,
          status: 'active',
          errorCode: null,
          errorMessage: null,
          createdAt: '2026-07-21T11:00:01.000Z',
          updatedAt: '2026-07-21T11:00:01.000Z',
          completedAt: null,
        },
      ],
    });

    expect(snapshot.composer.state).toBe('working');
    expect(snapshot.runs[0]?.events).toEqual([
      expect.objectContaining({ status: 'active', label: 'Preparing a response' }),
    ]);
  });

  test('keeps a failed run inspectable without exposing internal error detail', () => {
    const snapshot = buildWorkbenchSnapshot({
      ...aggregate,
      runs: [
        {
          id: 'run-1',
          threadId: 'thread-1',
          userMessageId: 'message-1',
          assistantMessageId: null,
          status: 'failed',
          errorCode: 'proxy_timeout',
          errorMessage: 'socket stack with secret detail',
          createdAt: '2026-07-21T11:00:01.000Z',
          updatedAt: '2026-07-21T11:00:02.000Z',
          completedAt: '2026-07-21T11:00:02.000Z',
        },
      ],
    });

    expect(snapshot.runs[0]?.events[0]).toMatchObject({
      status: 'failed',
      label: 'Response interrupted',
    });
    expect(JSON.stringify(snapshot)).not.toContain('socket stack');
  });
});
