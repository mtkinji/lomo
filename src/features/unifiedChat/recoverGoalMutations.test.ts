import type { Activity, Goal } from '../../domain/types';
import type { UnifiedChatProposal, UnifiedChatThreadAggregate } from './types';
import { recoverGoalMutations } from './recoverGoalMutations';

test('finalizes an already-applied reserved Goal mutation without applying it twice', async () => {
  const before: Goal = {
    id: 'goal-1', arcId: null, title: 'Read more', status: 'planned', forceIntent: {}, metrics: [],
    createdAt: 'before', updatedAt: 'before',
  };
  let goals: Goal[] = [{ ...before, title: 'Read together', updatedAt: 'applied' }];
  const proposal = {
    id: 'proposal-goal', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'goals', title: 'Update Read more', body: 'Changes title.',
    status: 'applying', version: 3, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-goal', proposalId: 'proposal-goal', capabilityId: 'goals', type: 'update_goal',
      targetId: before.id, summary: 'Update', idempotencyKey: 'goal-1', sequence: 1,
      payload: { title: 'Read together', expectedUpdatedAt: 'before' },
    },
  } as UnifiedChatProposal;
  const aggregate = {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal], receipts: [{
      id: 'receipt-goal', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'goals', idempotencyKey: 'goal-1', status: 'reserved',
      resultingObjectType: 'goal', resultingObjectId: before.id, resultState: {}, returnTarget: null,
      undoOperation: { type: 'restore_goal', goal: before, expectedUpdatedAt: 'applied' },
      canUndo: false, appliedAt: 'applied', undoneAt: null,
    }],
  } as UnifiedChatThreadAggregate;
  const loaded = { ...aggregate, proposals: [{ ...proposal, status: 'applied' as const }] };
  const repository = {
    finalizeMutationReceipt: jest.fn(async () => ({})),
    transitionProposalStatus: jest.fn(async () => ({})),
    loadThread: jest.fn(async () => loaded),
  };
  const store = {
    getGoals: () => goals, getArcIds: () => [] as string[], getActivities: () => [],
    addGoal: (value: Goal) => { goals = [...goals, value]; },
    updateGoal: jest.fn((id: string, updater: (goal: Goal) => Goal) => {
      goals = goals.map((goal) => goal.id === id ? updater(goal) : goal);
    }),
    removeGoal: (id: string) => { goals = goals.filter((goal) => goal.id !== id); },
    restoreRemovedGoal: jest.fn(),
  };

  await expect(recoverGoalMutations({ aggregate, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.updateGoal).not.toHaveBeenCalled();
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
    'receipt-goal', expect.objectContaining({ undoOperation: expect.objectContaining({ type: 'restore_goal' }) }),
  );
});

test('fails a conflicting reserved Goal mutation and still reloads the thread', async () => {
  const before: Goal = {
    id: 'goal-1', arcId: null, title: 'Read more', status: 'planned', forceIntent: {}, metrics: [],
    createdAt: 'before', updatedAt: 'before',
  };
  const proposal = {
    id: 'proposal-goal', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'goals', title: 'Update Read more', body: 'Changes title.',
    status: 'applying', version: 3, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-goal', proposalId: 'proposal-goal', capabilityId: 'goals', type: 'update_goal',
      targetId: before.id, summary: 'Update', idempotencyKey: 'goal-1', sequence: 1,
      payload: { title: 'Read together', expectedUpdatedAt: 'before' },
    },
  } as UnifiedChatProposal;
  const aggregate = {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal], receipts: [{
      id: 'receipt-goal', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'goals', idempotencyKey: 'goal-1', status: 'reserved',
      resultingObjectType: 'goal', resultingObjectId: before.id, resultState: {}, returnTarget: null,
      undoOperation: { type: 'restore_goal', goal: before, expectedUpdatedAt: 'applied' },
      canUndo: false, appliedAt: 'applied', undoneAt: null,
    }],
  } as UnifiedChatThreadAggregate;
  const loaded = { ...aggregate, proposals: [{ ...proposal, status: 'failed' as const }] };
  const repository = {
    finalizeMutationReceipt: jest.fn(),
    failMutationReceipt: jest.fn(async () => ({})),
    transitionProposalStatus: jest.fn(async () => ({})),
    loadThread: jest.fn(async () => loaded),
  };
  const store = {
    getGoals: () => [{ ...before, title: 'Changed elsewhere', updatedAt: 'someone-else' }],
    getArcIds: () => [] as string[], getActivities: () => [], addGoal: jest.fn(), updateGoal: jest.fn(),
    removeGoal: jest.fn(), restoreRemovedGoal: jest.fn(),
  };

  await expect(recoverGoalMutations({ aggregate, repository: repository as never, store })).resolves.toBe(loaded);
  expect(repository.failMutationReceipt).toHaveBeenCalledWith(
    'receipt-goal', 'goal_recovery_conflict', 'The Goal changed after this proposal was prepared.',
  );
  expect(repository.transitionProposalStatus).toHaveBeenCalledWith({
    proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: proposal.version,
  });
});

test('finalizes an already-created Goal receipt without creating a duplicate', async () => {
  const created: Goal = {
    id: 'goal-operation-create', arcId: null, title: 'Learn watercolor', status: 'planned',
    qualityState: 'draft', forceIntent: {}, metrics: [], createdAt: 'applied', updatedAt: 'applied',
  };
  let goals = [created];
  const proposal = {
    id: 'proposal-create', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'goals', title: 'Create Learn watercolor', body: 'Creates a Goal draft.',
    status: 'applying', version: 3, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-create', proposalId: 'proposal-create', capabilityId: 'goals', type: 'create_goal',
      targetId: null, summary: 'Create Learn watercolor', idempotencyKey: 'create-1', sequence: 1,
      payload: { title: 'Learn watercolor', expectedUpdatedAt: null },
    },
  } as UnifiedChatProposal;
  const aggregate = {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal], receipts: [{
      id: 'receipt-create', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'goals', idempotencyKey: 'create-1', status: 'reserved',
      resultingObjectType: 'goal', resultingObjectId: created.id, resultState: {}, returnTarget: null,
      undoOperation: { type: 'delete_created_goal', expectedUpdatedAt: 'applied' },
      canUndo: false, appliedAt: 'applied', undoneAt: null,
    }],
  } as UnifiedChatThreadAggregate;
  const loaded = { ...aggregate, proposals: [{ ...proposal, status: 'applied' as const }] };
  const repository = {
    finalizeMutationReceipt: jest.fn(async () => ({})), failMutationReceipt: jest.fn(async () => ({})),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = {
    getGoals: () => goals, getArcIds: () => [] as string[], getActivities: () => [],
    addGoal: jest.fn((value: Goal) => { goals = [...goals, value]; }), updateGoal: jest.fn(),
    removeGoal: jest.fn((id: string) => { goals = goals.filter((goal) => goal.id !== id); }),
    restoreRemovedGoal: jest.fn(),
  };

  await expect(recoverGoalMutations({ aggregate, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.addGoal).not.toHaveBeenCalled();
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
    'receipt-create', expect.objectContaining({
      resultingObjectId: created.id,
      undoOperation: { type: 'delete_created_goal', expectedUpdatedAt: 'applied' },
    }),
  );
});

test('finalizes an already-deleted Goal receipt without deleting twice', async () => {
  const removed: Goal = {
    id: 'goal-1', arcId: null, title: 'Read more', status: 'planned', forceIntent: {}, metrics: [],
    createdAt: 'before', updatedAt: 'before',
  };
  const linked: Activity = {
    id: 'activity-1', goalId: removed.id, title: 'Read tonight', type: 'task', tags: [], status: 'planned',
    forceActual: {}, createdAt: 'before', updatedAt: 'before',
  };
  const proposal = {
    id: 'proposal-delete', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'goals', title: 'Delete Read more', body: 'Deletes the Goal and linked Activity.',
    status: 'applying', version: 3, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-delete', proposalId: 'proposal-delete', capabilityId: 'goals', type: 'delete_goal',
      targetId: removed.id, summary: 'Delete Read more', idempotencyKey: 'delete-1', sequence: 1,
      payload: { expectedUpdatedAt: removed.updatedAt },
    },
  } as UnifiedChatProposal;
  const aggregate = {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal], receipts: [{
      id: 'receipt-delete', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'goals', idempotencyKey: 'delete-1', status: 'reserved',
      resultingObjectType: 'goal', resultingObjectId: removed.id,
      resultState: { title: removed.title, status: removed.status, arcId: null, updatedAt: 'deleted' },
      returnTarget: { capabilityId: 'goals' },
      undoOperation: {
        type: 'restore_removed_goal', goal: removed, goalIndex: 0,
        activities: [{ activity: linked, originalIndex: 0 }],
      },
      canUndo: false, appliedAt: 'deleted', undoneAt: null,
    }],
  } as UnifiedChatThreadAggregate;
  const loaded = { ...aggregate, proposals: [{ ...proposal, status: 'applied' as const }] };
  const repository = {
    finalizeMutationReceipt: jest.fn(async () => ({})), failMutationReceipt: jest.fn(async () => ({})),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = {
    getGoals: () => [] as Goal[], getArcIds: () => [] as string[], getActivities: () => [] as Activity[],
    addGoal: jest.fn(), updateGoal: jest.fn(), removeGoal: jest.fn(), restoreRemovedGoal: jest.fn(),
  };

  await expect(recoverGoalMutations({ aggregate, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.removeGoal).not.toHaveBeenCalled();
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
    'receipt-delete', expect.objectContaining({
      resultingObjectId: removed.id,
      undoOperation: expect.objectContaining({ type: 'restore_removed_goal', goal: removed }),
    }),
  );
});

test('completes an applying Goal proposal whose receipt was already finalized', async () => {
  const goal: Goal = {
    id: 'goal-1', arcId: null, title: 'Read together', status: 'planned', forceIntent: {}, metrics: [],
    createdAt: 'before', updatedAt: 'applied',
  };
  const goals = [goal];
  const proposal = {
    id: 'proposal-goal', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'goals', title: 'Update Goal', body: 'Changes title.',
    status: 'applying', version: 3, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-goal', proposalId: 'proposal-goal', capabilityId: 'goals', type: 'update_goal',
      targetId: goal.id, summary: 'Update', idempotencyKey: 'goal-1', sequence: 1,
      payload: { title: goal.title, expectedUpdatedAt: 'before' },
    },
  } as UnifiedChatProposal;
  const aggregate = {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal], receipts: [{
      id: 'receipt-goal', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'goals', idempotencyKey: 'goal-1', status: 'applied',
      resultingObjectType: 'goal', resultingObjectId: goal.id,
      resultState: { title: goal.title, status: goal.status, arcId: null, updatedAt: 'applied' },
      returnTarget: {}, undoOperation: { type: 'restore_goal', goal: { ...goal, title: 'Read more', updatedAt: 'before' }, expectedUpdatedAt: 'applied' },
      canUndo: true, appliedAt: 'applied', undoneAt: null,
    }],
  } as UnifiedChatThreadAggregate;
  const loaded = { ...aggregate, proposals: [{ ...proposal, status: 'applied' as const }] };
  const repository = {
    finalizeMutationReceipt: jest.fn(), failMutationReceipt: jest.fn(),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = {
    getGoals: () => goals, getArcIds: () => [] as string[], getActivities: () => [] as Activity[],
    addGoal: jest.fn(), updateGoal: jest.fn(), removeGoal: jest.fn(), restoreRemovedGoal: jest.fn(),
  };

  await expect(recoverGoalMutations({ aggregate, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.updateGoal).not.toHaveBeenCalled();
  expect(repository.finalizeMutationReceipt).not.toHaveBeenCalled();
  expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'applied' }));
});
