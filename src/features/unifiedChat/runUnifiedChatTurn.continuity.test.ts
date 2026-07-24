import { runUnifiedChatTurn } from './runUnifiedChatTurn';
import type { CreateUnifiedChatMessageInput, UnifiedChatThreadAggregate } from './types';

const thread: UnifiedChatThreadAggregate['thread'] = {
  id: 'thread-1', title: 'Continue work', titleSource: 'generated', status: 'active',
  archivedAt: null, createdAt: 'before', updatedAt: 'before',
};

function pendingActivities(labels: string[]): UnifiedChatThreadAggregate {
  const run: UnifiedChatThreadAggregate['runs'][number] = {
    id: 'run-prior', threadId: thread.id, userMessageId: 'user-prior', assistantMessageId: 'assistant-prior',
    status: 'complete', errorCode: null, errorMessage: null, createdAt: 'before', updatedAt: 'before',
    completedAt: 'before', requestClass: 'capability_action', participatingCapabilities: ['todos'],
    contextPolicy: { usePrivateContext: true, reason: 'semantic-route:compound capture', clarification: null },
    version: 2, stopRequestedAt: null, steerCount: 0,
  };
  const proposals = labels.map((label, index) => ({
    id: `proposal-${index + 1}`, threadId: thread.id, runId: run.id, messageId: 'assistant-prior',
    capabilityId: 'todos' as const, title: `Add ${label}`, body: 'Creates this To-do.',
    status: 'pending' as const, version: 1, createdAt: 'before', updatedAt: 'before',
    operation: {
      id: `operation-${index + 1}`, proposalId: `proposal-${index + 1}`, capabilityId: 'todos' as const,
      type: 'create_activity' as const, targetId: null, summary: `Add ${label}`,
      payload: { title: label }, idempotencyKey: `compound:${index + 1}`, sequence: index + 1,
    },
  }));
  return {
    thread, messages: [], runs: [run], proposals,
    events: [{
      id: 'referent-event', threadId: thread.id, runId: run.id, sequence: 4,
      type: 'conversation_referent', status: 'complete', visibility: 'internal',
      label: `${labels.length} changes awaiting review`, detail: null,
      payload: {
        schemaVersion: 2, kind: 'pending_work',
        items: proposals.map((proposal, index) => ({
          proposalId: proposal.id, expectedVersion: 1, capabilityId: 'todos',
          operationType: 'create_activity', targetId: null, expectedUpdatedAt: null,
          label: proposal.title, sequence: index + 1,
        })),
      },
    }],
  };
}

function pendingActivityUpdate(): UnifiedChatThreadAggregate {
  const aggregate = pendingActivities(['Move school call']);
  const proposal = aggregate.proposals![0]!;
  if (proposal.capabilityId !== 'todos') throw new Error('Fixture must be a To-do proposal.');
  proposal.title = 'Move school call';
  proposal.operation = {
    ...proposal.operation, type: 'update_activity', targetId: 'activity-1',
    payload: { scheduledDate: '2026-07-23', expectedUpdatedAt: 'activity-version' },
  };
  aggregate.events![0]!.payload = {
    schemaVersion: 2, kind: 'pending_work', items: [{
      proposalId: proposal.id, expectedVersion: 1, capabilityId: 'todos',
      operationType: 'update_activity', targetId: 'activity-1', expectedUpdatedAt: 'activity-version',
      label: proposal.title, sequence: 1,
    }],
  };
  return aggregate;
}

function harness(aggregate: UnifiedChatThreadAggregate) {
  const repository = {
    insertMessage: jest.fn(async (input: CreateUnifiedChatMessageInput) => ({
      id: input.role === 'user' ? 'message-user' : 'message-assistant', threadId: thread.id,
      role: input.role, body: input.body, feedback: null, attachments: [],
      createdAt: 'now', updatedAt: 'now',
    })),
    createRun: jest.fn(async () => ({
      id: 'run-control', threadId: thread.id, userMessageId: 'message-user', assistantMessageId: null,
      status: 'active' as const, errorCode: null, errorMessage: null, createdAt: 'now', updatedAt: 'now',
      completedAt: null, requestClass: 'capability_action' as const, participatingCapabilities: ['todos' as const],
      contextPolicy: { usePrivateContext: false, reason: 'control', clarification: null },
      version: 1, stopRequestedAt: null, steerCount: 0,
    })),
    decideProposal: jest.fn(async () => ({ id: 'proposal-1', status: 'edited' as const, version: 2 })),
    createProposal: jest.fn(async () => ({ id: 'proposal-repeat', status: 'pending' as const, version: 1 })),
    appendRunEvents: jest.fn(async () => undefined),
    transitionRunStatus: jest.fn(async () => ({})),
    transitionClientAction: jest.fn(async () => ({})),
    loadThread: jest.fn(async () => aggregate),
  };
  const sendCoachChat = jest.fn(async () => 'Model should not run for typed continuity controls.');
  return { repository, sendCoachChat };
}

async function runControl(prompt: string, aggregate: UnifiedChatThreadAggregate) {
  const dependencies = harness(aggregate);
  await runUnifiedChatTurn(
    { aggregate, prompt },
    {
      repository: dependencies.repository as never,
      sendCoachChat: dependencies.sendCoachChat as never,
      now: () => new Date('2026-07-20T10:00:00.000Z'),
    },
  );
  expect(dependencies.sendCoachChat).not.toHaveBeenCalled();
  return dependencies.repository;
}

describe('durable capability conversation continuity', () => {
  test('edits the exact referenced Activity proposal when the weekday changes', async () => {
    const repository = await runControl('Move it to Friday.', pendingActivityUpdate());
    expect(repository.decideProposal).toHaveBeenCalledWith({
      proposalId: 'proposal-1', action: 'edit', expectedVersion: 1,
      patch: { scheduledDate: '2026-07-24' }, note: 'Changed in Chat by the user.',
    });
    expect(repository.appendRunEvents).toHaveBeenCalledWith(expect.objectContaining({
      events: [expect.objectContaining({ payload: expect.objectContaining({
        items: [expect.objectContaining({ proposalId: 'proposal-1', expectedVersion: 2 })],
      }) })],
    }));
  });

  test('cancels the exact referenced compound set', async () => {
    const repository = await runControl('Cancel that', pendingActivities(['Buy milk', 'Call Mom']));
    expect(repository.decideProposal).toHaveBeenCalledTimes(2);
    expect(repository.decideProposal).toHaveBeenNthCalledWith(1, expect.objectContaining({ proposalId: 'proposal-1', action: 'reject' }));
    expect(repository.decideProposal).toHaveBeenNthCalledWith(2, expect.objectContaining({ proposalId: 'proposal-2', action: 'reject' }));
  });

  test('keeps only the requested ordered prefix', async () => {
    const repository = await runControl('Only add the first two.', pendingActivities(['Milk', 'Call Mom', 'School form']));
    expect(repository.decideProposal).toHaveBeenCalledTimes(1);
    expect(repository.decideProposal).toHaveBeenCalledWith(expect.objectContaining({ proposalId: 'proposal-3', action: 'reject' }));
  });

  test('selects the other item only from an exact two-choice referent', async () => {
    const repository = await runControl('No, the other one.', pendingActivities(['Buy milk', 'Call Mom']));
    expect(repository.decideProposal).toHaveBeenCalledTimes(1);
    expect(repository.decideProposal).toHaveBeenCalledWith(expect.objectContaining({ proposalId: 'proposal-1', action: 'reject' }));
  });

  test('repeats one pending Activity creation next week without inventing an object id', async () => {
    const repository = await runControl('Do the same for next week.', pendingActivities(['Call Mom']));
    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Add Call Mom next week',
      operation: expect.objectContaining({
        type: 'create_activity', targetId: null,
        payload: expect.objectContaining({ title: 'Call Mom', scheduledDate: '2026-07-27' }),
      }),
    }));
    expect(repository.appendRunEvents).toHaveBeenCalledWith(expect.objectContaining({
      events: [expect.objectContaining({ payload: expect.objectContaining({ items: [
        expect.objectContaining({ proposalId: 'proposal-1', sequence: 1 }),
        expect.objectContaining({ proposalId: 'proposal-repeat', sequence: 2 }),
      ] }) })],
    }));
  });
});
