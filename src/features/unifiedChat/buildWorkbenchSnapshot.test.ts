import { buildWorkbenchSnapshot } from './buildWorkbenchSnapshot';
import type { UnifiedChatThreadAggregate } from './types';

const aggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1',
    title: 'Plan my week',
    titleSource: 'generated',
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
      attachments: [],
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
        attachments: true,
        mentions: false,
        modelControl: false,
        runDepthControl: false,
        runModeControl: false,
        voice: true,
        webSearchControl: false,
      },
    });
    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.composer).toMatchObject({ prompt: 'draft text', state: 'ready' });
    expect(snapshot.composer.voice).toEqual({ state: 'idle', elapsedSeconds: 0 });
    expect(snapshot.context).toEqual([]);
    expect(snapshot.evidence).toEqual([]);
    expect(snapshot.proposals).toEqual([]);
    expect(snapshot.receipts).toEqual([]);
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
          requestClass: 'general',
          participatingCapabilities: [],
          contextPolicy: { usePrivateContext: false, reason: 'general-answer-without-private-context', clarification: null },
          version: 1,
          stopRequestedAt: null,
          steerCount: 0,
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
          requestClass: 'general',
          participatingCapabilities: [],
          contextPolicy: { usePrivateContext: false, reason: 'general-answer-without-private-context', clarification: null },
          version: 1,
          stopRequestedAt: null,
          steerCount: 0,
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
    expect(snapshot.runs[0]?.canRetry).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain('socket stack');
  });

  test('projects durable evidence, proposal fields, receipts, and user-visible events', () => {
    const snapshot = buildWorkbenchSnapshot({
      ...aggregate,
      events: [{
        id: 'event-1', threadId: 'thread-1', runId: 'run-1', sequence: 1,
        type: 'evidence', status: 'complete', visibility: 'user',
        label: 'Checked 1 relevant Goal', detail: 'Selected 1 of 1 bounded records.',
      }],
      evidence: [{
        id: 'evidence-1', threadId: 'thread-1', runId: 'run-1', sequence: 1,
        capabilityId: 'goals', objectType: 'goal', objectId: 'goal-reading',
        label: 'Read together every evening', selectionStatus: 'included',
        authority: 'authoritative', freshness: 'current',
        selectionReason: 'Matched 2 material request terms.', sufficient: true,
        coverageNote: 'Selected 1 of 1 bounded records.',
      }],
      proposals: [{
        id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-2',
        capabilityId: 'todos', title: 'Move library visit', body: 'Changes the date.',
        status: 'pending', version: 1, createdAt: '2026-07-22T12:00:00.000Z', updatedAt: '2026-07-22T12:00:00.000Z',
        operation: {
          id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'todos',
          type: 'update_activity', targetId: 'activity-library', summary: 'Move library visit',
          payload: { scheduledDate: '2026-07-25', expectedUpdatedAt: '2026-07-21T13:00:00.000Z' },
          idempotencyKey: 'unified-chat:run-1:1', sequence: 1,
        },
      }],
      receipts: [{
        id: 'receipt-1', proposalId: 'proposal-1', operationId: 'operation-1', capabilityId: 'todos', idempotencyKey: 'unified-chat:run-1:1', status: 'applied',
        resultingObjectType: 'activity', resultingObjectId: 'activity-library',
        resultState: { title: 'Visit the library' }, returnTarget: { name: 'MainTabs' },
        undoOperation: { type: 'restore_activity' }, canUndo: true,
        appliedAt: '2026-07-22T12:00:00.000Z', undoneAt: null,
      }],
      runs: [{
        id: 'run-1', threadId: 'thread-1', userMessageId: 'message-1', assistantMessageId: 'message-2',
        status: 'complete', errorCode: null, errorMessage: null, requestClass: 'capability_action',
        participatingCapabilities: ['todos'], contextPolicy: { usePrivateContext: true, reason: 'typed-capability-proposal-required', clarification: null },
        version: 2, stopRequestedAt: null, steerCount: 0,
        createdAt: '2026-07-22T12:00:00.000Z', updatedAt: '2026-07-22T12:00:01.000Z', completedAt: '2026-07-22T12:00:01.000Z',
      }],
    });

    expect(snapshot.runs[0]?.events).toEqual([expect.objectContaining({ label: 'Checked 1 relevant Goal' })]);
    expect(snapshot.evidence[0]).toMatchObject({ object: { id: 'goal-reading' }, authority: 'authoritative' });
    expect(snapshot.proposals[0]).toMatchObject({
      status: 'pending', version: 1,
      operation: { type: 'update_activity', fields: { scheduledDate: '2026-07-25' } },
    });
    expect(JSON.stringify(snapshot.proposals[0])).not.toContain('expectedUpdatedAt');
    expect(snapshot.receipts[0]).toMatchObject({ canUndo: true, object: { id: 'activity-library' } });
  });

  test('projects active launch context separately from retrieved evidence', () => {
    const snapshot = buildWorkbenchSnapshot({
      ...aggregate,
      contextRefs: [{
        id: 'context-1', threadId: 'thread-1', capabilityId: 'goals',
        objectType: 'goal', objectId: 'goal-reading', label: 'Read together every evening',
        secondaryLabel: 'In progress', source: 'launch', active: true,
        returnTarget: { name: 'MainTabs' }, version: 3,
      }],
    });

    expect(snapshot.context).toEqual([{
      id: 'context-1', capabilityId: 'goals',
      object: {
        id: 'goal-reading', type: 'goal', label: 'Read together every evening',
        secondaryLabel: 'In progress',
      },
      source: 'launch', removable: true, version: 3,
    }]);
    expect(snapshot.evidence).toEqual([]);
  });

  test('collapses an applied create into its authoritative receipt instead of a second editor', () => {
    const snapshot = buildWorkbenchSnapshot({
      ...aggregate,
      messages: [
        ...aggregate.messages,
        {
          id: 'message-2', threadId: 'thread-1', role: 'assistant', body: 'Verbose draft explanation',
          feedback: null, createdAt: '2026-07-22T12:00:00.000Z', updatedAt: '2026-07-22T12:00:00.000Z', attachments: [],
        },
      ],
      proposals: [{
        id: 'proposal-create', threadId: 'thread-1', runId: 'run-create', messageId: 'message-2',
        capabilityId: 'todos', title: 'Create school call', body: 'Creates a To-do.', status: 'applied', version: 4,
        createdAt: '2026-07-22T12:00:00.000Z', updatedAt: '2026-07-22T12:00:01.000Z',
        operation: {
          id: 'operation-create', proposalId: 'proposal-create', capabilityId: 'todos', type: 'create_activity',
          targetId: null, summary: 'Create school call', payload: { title: 'Call the school', scheduledDate: '2026-07-24' },
          idempotencyKey: 'unified-chat:run-create:1', sequence: 1,
        },
      }],
      receipts: [{
        id: 'receipt-create', proposalId: 'proposal-create', operationId: 'operation-create', capabilityId: 'todos',
        idempotencyKey: 'unified-chat:run-create:1', status: 'applied', resultingObjectType: 'activity',
        resultingObjectId: 'activity-school', resultState: {
          title: 'Call the school', scheduledDate: '2026-07-24', estimateMinutes: 30,
        },
        returnTarget: { name: 'ActivityDetail', params: { activityId: 'activity-school' } },
        undoOperation: { type: 'remove_created_activity' }, canUndo: true,
        appliedAt: '2026-07-22T12:00:01.000Z', undoneAt: null,
      }],
    });

    expect(snapshot.messages.map((message) => message.id)).not.toContain('message-2');
    expect(snapshot.proposals).toEqual([]);
    expect(snapshot.receipts).toEqual([expect.objectContaining({
      object: { id: 'activity-school', type: 'activity', label: 'Call the school' },
      inventoryItem: expect.objectContaining({ title: 'Call the school', meta: 'Jul 24', estimateMeta: '~30 min' }),
    })]);
  });

  test('removes a deleted create row from the Chat timeline', () => {
    const snapshot = buildWorkbenchSnapshot({
      ...aggregate,
      proposals: [{
        id: 'proposal-create', threadId: 'thread-1', runId: 'run-create', messageId: null,
        capabilityId: 'todos', title: 'Create school call', body: 'Creates a To-do.', status: 'undone', version: 5,
        createdAt: '2026-07-22T12:00:00.000Z', updatedAt: '2026-07-22T12:00:02.000Z',
        operation: {
          id: 'operation-create', proposalId: 'proposal-create', capabilityId: 'todos', type: 'create_activity',
          targetId: null, summary: 'Create school call', payload: { title: 'Call the school' },
          idempotencyKey: 'unified-chat:run-create:1', sequence: 1,
        },
      }],
      receipts: [{
        id: 'receipt-create', proposalId: 'proposal-create', operationId: 'operation-create', capabilityId: 'todos',
        idempotencyKey: 'unified-chat:run-create:1', status: 'undone', resultingObjectType: 'activity',
        resultingObjectId: 'activity-school', resultState: { title: 'Call the school' }, returnTarget: null,
        undoOperation: null, canUndo: false, appliedAt: '2026-07-22T12:00:01.000Z',
        undoneAt: '2026-07-22T12:00:02.000Z',
      }],
    });

    expect(snapshot.receipts).toEqual([]);
  });

  test('sanitizes assistant-visible text again at the outbound bridge', () => {
    const snapshot = buildWorkbenchSnapshot({
      ...aggregate,
      messages: [{
        ...aggregate.messages[0]!, id: 'message-assistant', role: 'assistant',
        body: '<think>private routing notes</think>\n\nHere is the useful answer.',
      }],
    });
    expect(snapshot.messages[0]?.body).toBe('Here is the useful answer.');
  });
});
