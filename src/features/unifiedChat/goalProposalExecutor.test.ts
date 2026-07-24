import type { Activity, Goal } from '../../domain/types';
import type { UnifiedChatProposal } from './types';
import { applyApprovedGoalProposal, undoAppliedGoalProposal } from './goalProposalExecutor';

const before: Goal = {
  id: 'goal-1', arcId: null, title: 'Read more', status: 'planned', forceIntent: {}, metrics: [],
  createdAt: '2026-07-20T10:00:00.000Z', updatedAt: '2026-07-21T10:00:00.000Z',
};

test('applies one versioned Goal patch and restores the whole prior Goal on undo', () => {
  let goals = [before];
  const store = {
    getGoals: () => goals,
    getArcIds: () => ['arc-reading'],
    getActivities: () => [],
    addGoal: (goal: Goal) => { goals = [...goals, goal]; },
    updateGoal: (id: string, updater: (goal: Goal) => Goal) => {
      goals = goals.map((goal) => goal.id === id ? updater(goal) : goal);
    },
    removeGoal: (id: string) => { goals = goals.filter((goal) => goal.id !== id); },
    restoreRemovedGoal: jest.fn(),
  };
  const proposal = {
    id: 'proposal-goal', capabilityId: 'goals', status: 'approved', version: 2,
    operation: {
      id: 'operation-goal', proposalId: 'proposal-goal', capabilityId: 'goals', type: 'update_goal',
      targetId: before.id, summary: 'Update Read more', idempotencyKey: 'goal-1', sequence: 1,
      payload: {
        title: 'Read together', arcId: 'arc-reading', status: 'in_progress',
        expectedUpdatedAt: before.updatedAt,
      },
    },
  } as UnifiedChatProposal;

  const receipt = applyApprovedGoalProposal({ proposal, store, now: () => 'applied' });
  expect(goals[0]).toMatchObject({
    title: 'Read together', arcId: 'arc-reading', status: 'in_progress', updatedAt: 'applied',
  });
  undoAppliedGoalProposal({ receipt, store, now: () => 'undone' });
  expect(goals[0]).toEqual({ ...before, updatedAt: 'undone' });
});

test('creates an unassigned Goal draft with a deterministic id and removes it on undo', () => {
  let goals: Goal[] = [];
  const store = {
    getGoals: () => goals, getArcIds: () => ['arc-reading'],
    getActivities: () => [],
    addGoal: (goal: Goal) => { goals = [...goals, goal]; },
    updateGoal: (id: string, updater: (goal: Goal) => Goal) => {
      goals = goals.map((goal) => goal.id === id ? updater(goal) : goal);
    },
    removeGoal: (id: string) => { goals = goals.filter((goal) => goal.id !== id); },
    restoreRemovedGoal: jest.fn(),
  };
  const proposal = {
    id: 'proposal-create', capabilityId: 'goals', status: 'approved', version: 2,
    operation: {
      id: 'operation-create', proposalId: 'proposal-create', capabilityId: 'goals', type: 'create_goal',
      targetId: null, summary: 'Create Learn watercolor', idempotencyKey: 'create-1', sequence: 1,
      payload: { title: 'Learn watercolor', description: 'Paint one small scene.' },
    },
  } as UnifiedChatProposal;

  const receipt = applyApprovedGoalProposal({ proposal, store, now: () => 'applied' });
  expect(goals).toEqual([expect.objectContaining({
    id: 'goal-operation-create', arcId: null, title: 'Learn watercolor', qualityState: 'draft',
    forceIntent: {}, metrics: [], createdAt: 'applied', updatedAt: 'applied',
  })]);
  expect(receipt.undoOperation).toEqual({ type: 'delete_created_goal', expectedUpdatedAt: 'applied' });
  undoAppliedGoalProposal({ receipt, store, now: () => 'undone' });
  expect(goals).toEqual([]);
});

test('deletes a Goal with its linked Activities and restores the full dependency set on undo', () => {
  let goals = [before];
  const linked: Activity = {
    id: 'activity-1', goalId: before.id, title: 'Read tonight', type: 'task', tags: [], status: 'planned',
    forceActual: {}, createdAt: 'before', updatedAt: 'before',
  };
  let activities = [linked];
  const store = {
    getGoals: () => goals, getArcIds: () => [] as string[], getActivities: () => activities,
    addGoal: (goal: Goal) => { goals = [...goals, goal]; },
    updateGoal: (id: string, updater: (goal: Goal) => Goal) => {
      goals = goals.map((goal) => goal.id === id ? updater(goal) : goal);
    },
    removeGoal: (id: string) => {
      goals = goals.filter((goal) => goal.id !== id);
      activities = activities.filter((activity) => activity.goalId !== id);
    },
    restoreRemovedGoal: ({ goal, activities: restored = [] }: {
      goal: Goal; activities?: Array<{ activity: Activity; originalIndex?: number }>;
    }) => {
      goals = [...goals, goal]; activities = [...activities, ...restored.map((entry) => entry.activity)];
    },
  };
  const proposal = {
    id: 'proposal-delete', capabilityId: 'goals', status: 'approved', version: 2,
    operation: {
      id: 'operation-delete', proposalId: 'proposal-delete', capabilityId: 'goals', type: 'delete_goal',
      targetId: before.id, summary: 'Delete Read more', idempotencyKey: 'delete-1', sequence: 1,
      payload: { expectedUpdatedAt: before.updatedAt },
    },
  } as UnifiedChatProposal;

  const receipt = applyApprovedGoalProposal({ proposal, store, now: () => 'deleted' });
  expect(goals).toEqual([]);
  expect(activities).toEqual([]);
  expect(receipt.undoOperation).toEqual(expect.objectContaining({
    type: 'restore_removed_goal', goal: before,
    activities: [{ activity: linked, originalIndex: 0 }],
  }));

  undoAppliedGoalProposal({ receipt, store, now: () => 'restored' });
  expect(goals).toEqual([{ ...before, updatedAt: 'restored' }]);
  expect(activities).toEqual([linked]);
});
