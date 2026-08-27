import { acceptMobileAgentRun } from '../mobileAgentRunBackground';
import type { AgentRunPersistence, EnqueuedAgentRun } from '../agentRunCoordinator';
import type { CanonicalAgentRunRequest } from '../agentRuntime';

const request: CanonicalAgentRunRequest = {
  channel: 'mobile',
  requestId: 'request-1',
  prompt: 'We do not have bananas.',
  threadId: '00000000-0000-4000-8000-000000000001',
  channelContext: { timeZone: 'America/Denver' },
};

const run: EnqueuedAgentRun = {
  threadId: request.threadId!,
  messageId: 'message-1',
  runId: 'run-1',
  status: 'queued',
  version: 1,
  replayed: false,
};

function persistence(enqueued: EnqueuedAgentRun): AgentRunPersistence {
  return {
    enqueue: jest.fn(async () => enqueued),
    start: jest.fn(),
    loadHistory: jest.fn(),
    loadReplay: jest.fn(async () => ({ answer: 'Already done.', status: 'complete' as const })),
    stageClientAction: jest.fn(),
    stageProposal: jest.fn(),
    stageProposals: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
  } as AgentRunPersistence;
}

test('schedules a newly enqueued mobile run and returns its durable identity immediately', async () => {
  const store = persistence(run);
  const pending = new Promise<void>(() => undefined);
  const execute = jest.fn(() => pending);
  const schedule = jest.fn();

  await expect(acceptMobileAgentRun({ request, persistence: store, execute, schedule }))
    .resolves.toEqual({ state: 'accepted', replayed: false, run });

  expect(execute).toHaveBeenCalledWith(run);
  expect(schedule).toHaveBeenCalledWith(pending);
  expect(store.loadReplay).not.toHaveBeenCalled();
});

test('returns an in-flight replay without starting duplicate background work', async () => {
  const active = { ...run, status: 'active', version: 2, replayed: true };
  const store = persistence(active);
  const execute = jest.fn();
  const schedule = jest.fn();

  await expect(acceptMobileAgentRun({ request, persistence: store, execute, schedule }))
    .resolves.toEqual({ state: 'accepted', replayed: true, run: active });

  expect(execute).not.toHaveBeenCalled();
  expect(schedule).not.toHaveBeenCalled();
  expect(store.loadReplay).not.toHaveBeenCalled();
});

test('schedules a recovery claim when an accepted replay is still queued', async () => {
  const queued = { ...run, replayed: true };
  const store = persistence(queued);
  const pending = new Promise<void>(() => undefined);
  const execute = jest.fn(() => pending);
  const schedule = jest.fn();

  await expect(acceptMobileAgentRun({ request, persistence: store, execute, schedule }))
    .resolves.toEqual({ state: 'accepted', replayed: true, run: queued });

  expect(execute).toHaveBeenCalledWith(queued);
  expect(schedule).toHaveBeenCalledWith(pending);
  expect(store.loadReplay).not.toHaveBeenCalled();
});

test('returns a terminal replay with the persisted answer', async () => {
  const complete = { ...run, status: 'complete', version: 3, replayed: true };
  const store = persistence(complete);

  await expect(acceptMobileAgentRun({
    request,
    persistence: store,
    execute: jest.fn(),
    schedule: jest.fn(),
  })).resolves.toEqual({
    state: 'complete', replayed: true, run: complete, answer: 'Already done.',
  });

  expect(store.loadReplay).toHaveBeenCalledWith(complete);
});
