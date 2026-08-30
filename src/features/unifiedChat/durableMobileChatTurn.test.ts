import {
  didDurableSteerTransition,
  isDurableMobileChatEligible,
  runDurableMobileChatTurn,
  transitionDurableMobileChatRun,
} from './durableMobileChatTurn';
import type { UnifiedChatThreadAggregate } from './types';

function aggregate(overrides: Partial<UnifiedChatThreadAggregate> = {}): UnifiedChatThreadAggregate {
  return {
    thread: {
      id: '00000000-0000-4000-8000-000000000001', title: 'Classic Sugar Cookies',
      titleSource: 'generated', status: 'active', archivedAt: null,
      createdAt: '2026-08-25T00:00:00.000Z', updatedAt: '2026-08-25T00:00:00.000Z',
    },
    messages: [{
      id: 'assistant-1', threadId: '00000000-0000-4000-8000-000000000001',
      role: 'assistant', body: 'Use two bananas.', feedback: null,
      createdAt: '2026-08-25T00:00:00.000Z', updatedAt: '2026-08-25T00:00:00.000Z',
      attachments: [],
    }],
    runs: [], events: [], evidence: [], proposals: [], receipts: [], contextRefs: [], clientActions: [], artifacts: [],
    ...overrides,
  };
}

test('routes an established plain-text follow-up through durable mobile execution', () => {
  expect(isDurableMobileChatEligible({
    aggregate: aggregate(),
    attachmentCount: 0,
    interactionMode: 'text',
    isRetry: false,
  })).toBe(true);
});

test.each([
  ['active run became steered', 'active', 'steered', true],
  ['queued run was stopped before work began', 'queued', 'stopped', true],
  ['active run completed before the steer landed', 'active', 'complete', false],
] as const)('%s', (_label, sourceStatus, resultingStatus, expected) => {
  expect(didDurableSteerTransition(sourceStatus, resultingStatus)).toBe(expected);
});

test.each([
  ['first message', aggregate({ messages: [] }), 0, false],
  ['attachment', aggregate(), 1, false],
  ['retry', aggregate(), 0, true],
  ['attached context', aggregate({ contextRefs: [{ active: true } as never] }), 0, false],
  ['pending proposal', aggregate({ proposals: [{ status: 'pending' } as never] }), 0, false],
  ['pending device action', aggregate({ clientActions: [{ status: 'pending_client_action' } as never] }), 0, false],
] as const)('routes %s through canonical durable text execution', (_label, source, attachmentCount, isRetry) => {
  expect(isDurableMobileChatEligible({
    aggregate: source,
    attachmentCount,
    interactionMode: 'text',
    isRetry,
  })).toBe(true);
});

test('routes a finalized Conversation utterance through durable mobile execution', () => {
  expect(isDurableMobileChatEligible({
    aggregate: aggregate(), attachmentCount: 0, interactionMode: 'conversation', isRetry: false,
  })).toBe(true);
});

test('accepts once and polls the canonical thread until the server-owned run completes', async () => {
  const accepted = aggregate({
    runs: [{ id: 'run-1', status: 'active', triggerId: 'request-1', originChannel: 'mobile' } as never],
  });
  const completed = aggregate({
    messages: [...aggregate().messages, { role: 'assistant', body: 'Use apples instead.' } as never],
    runs: [{ id: 'run-1', status: 'complete', triggerId: 'request-1', originChannel: 'mobile' } as never],
  });
  const invoke = jest.fn(async () => ({
    data: { ok: true, state: 'accepted', run: { runId: 'run-1' } }, error: null,
  }));
  const loadThread = jest.fn()
    .mockResolvedValueOnce(accepted)
    .mockResolvedValueOnce(completed);
  const onProgress = jest.fn();

  await expect(runDurableMobileChatTurn({
    threadId: aggregate().thread.id,
    prompt: 'We do not have bananas.',
    requestId: 'request-1',
    channelContext: {
      schemaVersion: 1, locale: 'en-US', timeZone: 'America/Denver', appState: 'foreground',
      origin: { screen: 'UnifiedChat', action: 'run.send' }, selectedEntities: [], attachments: [],
      pendingWork: { proposalIds: [], clientActionIds: [] }, availableDeviceProviders: ['navigation'],
    },
    invoke,
    loadThread,
    onProgress,
    pollIntervalMs: 0,
  })).resolves.toBe(completed);

  expect(invoke).toHaveBeenCalledTimes(1);
  expect(invoke).toHaveBeenCalledWith('agent-run', expect.objectContaining({
    body: expect.objectContaining({
      channel: 'mobile', requestId: 'request-1', prompt: 'We do not have bananas.',
      threadId: aggregate().thread.id,
      channelContext: expect.objectContaining({ schemaVersion: 1, timeZone: 'America/Denver' }),
    }),
  }));
  expect(onProgress).toHaveBeenNthCalledWith(1, accepted, 'run-1');
  expect(onProgress).toHaveBeenNthCalledWith(2, completed, 'run-1');
});

test('does not turn app suspension into a client-side response deadline', async () => {
  const accepted = aggregate({
    runs: [{ id: 'run-1', status: 'active', triggerId: 'request-1', originChannel: 'mobile' } as never],
  });
  const controller = new AbortController();
  const loadThread = jest.fn(async () => {
    controller.abort();
    return accepted;
  });

  await expect(runDurableMobileChatTurn({
    threadId: aggregate().thread.id,
    prompt: 'We do not have bananas.',
    requestId: 'request-1',
    channelContext: {
      schemaVersion: 1, locale: 'en-US', timeZone: 'America/Denver', appState: 'background',
      origin: { screen: 'UnifiedChat', action: 'run.send' }, selectedEntities: [], attachments: [],
      pendingWork: { proposalIds: [], clientActionIds: [] }, availableDeviceProviders: [],
    },
    invoke: async () => ({ data: { state: 'accepted', run: { runId: 'run-1' } }, error: null }),
    loadThread,
    signal: controller.signal,
    pollIntervalMs: 0,
  })).rejects.toMatchObject({ name: 'AbortError' });
});

test('stops an active server-owned run before local polling is aborted', async () => {
  const active = aggregate({
    runs: [{ id: 'run-1', status: 'active', version: 2, steerCount: 0 } as never],
  });
  const stopped = aggregate({
    runs: [{ id: 'run-1', status: 'stopped', version: 3, steerCount: 0 } as never],
  });
  const loadThread = jest.fn().mockResolvedValueOnce(active).mockResolvedValueOnce(stopped);
  const transitionRunStatus = jest.fn(async () => stopped.runs[0]);

  await expect(transitionDurableMobileChatRun({
    threadId: active.thread.id,
    runId: 'run-1',
    disposition: { type: 'stop' },
    loadThread,
    transitionRunStatus,
    now: () => new Date('2026-08-25T12:00:00.000Z'),
  })).resolves.toBe(stopped);

  expect(transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
    runId: 'run-1', fromStatus: 'active', toStatus: 'stopped', expectedVersion: 2,
    stopRequestedAt: '2026-08-25T12:00:00.000Z',
  }));
});

test('records a steering instruction against an active durable run', async () => {
  const active = aggregate({
    runs: [{ id: 'run-1', status: 'active', version: 4, steerCount: 1 } as never],
  });
  const steered = aggregate({
    runs: [{ id: 'run-1', status: 'steered', version: 5, steerCount: 2 } as never],
  });
  const transitionRunStatus = jest.fn(async () => steered.runs[0]);

  await transitionDurableMobileChatRun({
    threadId: active.thread.id,
    runId: 'run-1',
    disposition: { type: 'steer', prompt: 'Use apples instead.' },
    loadThread: jest.fn().mockResolvedValueOnce(active).mockResolvedValueOnce(steered),
    transitionRunStatus,
    now: () => new Date('2026-08-25T12:00:00.000Z'),
  });

  expect(transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
    toStatus: 'steered', steerCount: 2,
    event: expect.objectContaining({ payload: { prompt: 'Use apples instead.' } }),
  }));
});

test('refreshes a run that completed while a server-owned steer was being recorded', async () => {
  const active = aggregate({
    runs: [{ id: 'run-1', status: 'active', version: 4, steerCount: 0 } as never],
  });
  const completed = aggregate({
    runs: [{ id: 'run-1', status: 'complete', version: 5, steerCount: 0 } as never],
  });
  const loadThread = jest.fn().mockResolvedValueOnce(active).mockResolvedValueOnce(completed);
  const transitionRunStatus = jest.fn(async () => {
    throw new Error('invalid_run_source_status');
  });

  await expect(transitionDurableMobileChatRun({
    threadId: active.thread.id,
    runId: 'run-1',
    disposition: { type: 'steer', prompt: 'Goals only.' },
    loadThread,
    transitionRunStatus,
  })).resolves.toBe(completed);

  expect(loadThread).toHaveBeenCalledTimes(2);
});
