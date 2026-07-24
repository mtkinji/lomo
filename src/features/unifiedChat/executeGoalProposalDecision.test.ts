import type { Goal } from '../../domain/types';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import { executeGoalProposalDecision } from './executeGoalProposalDecision';

test('reserves Goal undo before applying and finalizes the authoritative receipt', async () => {
  const goal: Goal = {
    id: 'goal-1', arcId: null, title: 'Read more', status: 'planned', forceIntent: {}, metrics: [],
    createdAt: 'before', updatedAt: 'before',
  };
  let goals = [goal];
  const proposal = {
    id: 'proposal-goal', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'goals', title: 'Update Read more', body: 'Changes the title.',
    status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-goal', proposalId: 'proposal-goal', capabilityId: 'goals', type: 'update_goal',
      targetId: goal.id, summary: 'Update Read more', idempotencyKey: 'goal-1', sequence: 1,
      payload: { title: 'Read together', expectedUpdatedAt: 'before' },
    },
  } as UnifiedChatProposal;
  const receipt = (status: UnifiedChatMutationReceipt['status']): UnifiedChatMutationReceipt => ({
    id: 'receipt-goal', proposalId: proposal.id, operationId: proposal.operation.id,
    capabilityId: 'goals', idempotencyKey: 'goal-1', status,
    resultingObjectType: 'goal', resultingObjectId: goal.id, resultState: {},
    returnTarget: null, undoOperation: null, canUndo: false, appliedAt: null, undoneAt: null,
  });
  const repository = {
    decideProposal: jest.fn(async () => ({ id: proposal.id, status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
    persistMutationReceipt: jest.fn(async () => receipt('reserved')),
    finalizeMutationReceipt: jest.fn(async () => receipt('applied')),
  };
  const store = {
    getGoals: () => goals, getArcIds: () => [] as string[], getActivities: () => [],
    addGoal: (value: Goal) => { goals = [...goals, value]; },
    updateGoal: (id: string, updater: (value: Goal) => Goal) => {
      goals = goals.map((value) => value.id === id ? updater(value) : value);
    },
    removeGoal: (id: string) => { goals = goals.filter((value) => value.id !== id); },
    restoreRemovedGoal: jest.fn(),
  };

  await executeGoalProposalDecision({
    proposal: proposal as Extract<UnifiedChatProposal, { capabilityId: 'goals' }>,
    action: 'approve', repository, store, now: () => 'applied',
  });

  expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
    capabilityId: 'goals', status: 'reserved',
    undoOperation: expect.objectContaining({ type: 'restore_goal' }),
  }));
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
    'receipt-goal', expect.objectContaining({ undoOperation: expect.objectContaining({ type: 'restore_goal' }) }),
  );
  expect(goals[0]).toMatchObject({ title: 'Read together', updatedAt: 'applied' });
});

test('marks a Goal proposal failed when it becomes stale before receipt reservation', async () => {
  const goal: Goal = {
    id: 'goal-1', arcId: null, title: 'Read more', status: 'planned', forceIntent: {}, metrics: [],
    createdAt: 'before', updatedAt: 'newer-than-proposal',
  };
  const proposal = {
    id: 'proposal-goal', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'goals', title: 'Update Read more', body: 'Changes the title.',
    status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-goal', proposalId: 'proposal-goal', capabilityId: 'goals', type: 'update_goal',
      targetId: goal.id, summary: 'Update Read more', idempotencyKey: 'goal-1', sequence: 1,
      payload: { title: 'Read together', expectedUpdatedAt: 'before' },
    },
  } as Extract<UnifiedChatProposal, { capabilityId: 'goals' }>;
  const repository = {
    decideProposal: jest.fn(async () => ({ id: proposal.id, status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
    persistMutationReceipt: jest.fn(),
    finalizeMutationReceipt: jest.fn(),
  };
  const store = {
    getGoals: () => [goal], getArcIds: () => [] as string[], getActivities: () => [], addGoal: jest.fn(),
    updateGoal: jest.fn(), removeGoal: jest.fn(), restoreRemovedGoal: jest.fn(),
  };

  await expect(executeGoalProposalDecision({
    proposal, action: 'approve', repository, store, now: () => 'applied',
  })).rejects.toThrow('changed after this proposal');

  expect(repository.persistMutationReceipt).not.toHaveBeenCalled();
  expect(repository.transitionProposalStatus).toHaveBeenLastCalledWith({
    proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: 3,
  });
});

test('reserves a deterministic Goal creation before adding the draft', async () => {
  let goals: Goal[] = [];
  const proposal = {
    id: 'proposal-create', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'goals', title: 'Create Learn watercolor', body: 'Creates a Goal draft.',
    status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-create', proposalId: 'proposal-create', capabilityId: 'goals', type: 'create_goal',
      targetId: null, summary: 'Create Learn watercolor', idempotencyKey: 'create-1', sequence: 1,
      payload: { title: 'Learn watercolor', expectedUpdatedAt: null },
    },
  } as Extract<UnifiedChatProposal, { capabilityId: 'goals' }>;
  const receipt = (status: UnifiedChatMutationReceipt['status']): UnifiedChatMutationReceipt => ({
    id: 'receipt-create', proposalId: proposal.id, operationId: proposal.operation.id,
    capabilityId: 'goals', idempotencyKey: 'create-1', status, resultingObjectType: 'goal',
    resultingObjectId: 'goal-operation-create', resultState: {}, returnTarget: null,
    undoOperation: null, canUndo: false, appliedAt: null, undoneAt: null,
  });
  const repository = {
    decideProposal: jest.fn(async () => ({ id: proposal.id, status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
    persistMutationReceipt: jest.fn(async () => receipt('reserved')),
    finalizeMutationReceipt: jest.fn(async () => receipt('applied')),
  };
  const store = {
    getGoals: () => goals, getArcIds: () => [] as string[], getActivities: () => [],
    addGoal: (value: Goal) => { goals = [...goals, value]; }, updateGoal: jest.fn(),
    removeGoal: (id: string) => { goals = goals.filter((value) => value.id !== id); },
    restoreRemovedGoal: jest.fn(),
  };

  await executeGoalProposalDecision({ proposal, action: 'approve', repository, store, now: () => 'applied' });

  expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
    resultingObjectId: 'goal-operation-create',
    undoOperation: { type: 'delete_created_goal', expectedUpdatedAt: 'applied' },
  }));
  expect(goals).toEqual([expect.objectContaining({ title: 'Learn watercolor', qualityState: 'draft' })]);
});

test('suggests a linked daily Activity only after Goal creation returns its authoritative id', async () => {
  let goals: Goal[] = [];
  const proposal = {
    id: 'proposal-walk', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'goals', title: 'Create a walking Goal', body: 'Creates a seven-day Goal.',
    status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-walk', proposalId: 'proposal-walk', capabilityId: 'goals', type: 'create_goal',
      targetId: null, summary: 'Create a walking Goal', idempotencyKey: 'walk-1', sequence: 1,
      payload: {
        title: 'Walk every day for the next week', targetDate: '2026-07-30T23:59:59.000-06:00',
        followUpActivity: { title: 'Go for a walk', repeatRule: 'daily' }, expectedUpdatedAt: null,
      },
    },
  } as Extract<UnifiedChatProposal, { capabilityId: 'goals' }>;
  const receipt = (status: UnifiedChatMutationReceipt['status']): UnifiedChatMutationReceipt => ({
    id: 'receipt-walk', proposalId: proposal.id, operationId: proposal.operation.id,
    capabilityId: 'goals', idempotencyKey: 'walk-1', status, resultingObjectType: 'goal',
    resultingObjectId: 'goal-operation-walk', resultState: {}, returnTarget: null,
    undoOperation: null, canUndo: false, appliedAt: null, undoneAt: null,
  });
  const repository = {
    decideProposal: jest.fn(async () => ({ id: proposal.id, status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
    persistMutationReceipt: jest.fn(async () => receipt('reserved')),
    finalizeMutationReceipt: jest.fn(async () => receipt('applied')),
    insertMessage: jest.fn(async () => ({})),
  };
  const store = {
    getGoals: () => goals, getArcIds: () => [] as string[], getActivities: () => [],
    addGoal: (value: Goal) => { goals = [...goals, value]; }, updateGoal: jest.fn(),
    removeGoal: jest.fn(), restoreRemovedGoal: jest.fn(),
  };

  await executeGoalProposalDecision({ proposal, action: 'approve', repository, store, now: () => 'applied' });

  expect(goals[0]?.id).toBe('goal-operation-walk');
  expect(repository.insertMessage).toHaveBeenCalledWith({
    threadId: 'thread-1', role: 'assistant',
    body: 'Goal created: Walk every day for the next week. To make it easier to follow through, I can add one daily repeating “Go for a walk” Activity linked to this Goal. Want me to prepare that?',
    clientRequestId: 'goal-follow-through:operation-walk',
  });
});
