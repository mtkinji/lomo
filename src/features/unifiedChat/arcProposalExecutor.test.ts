import type { Activity, Arc, Goal, GoalDraft } from '../../domain/types';
import type { UnifiedChatProposal } from './types';
import {
  applyApprovedArcProposal,
  ArcMutationConflictError,
  undoAppliedArcProposal,
} from './arcProposalExecutor';

const before: Arc = {
  id: 'arc-1', name: 'Present parent', narrative: 'I make room for connection.', status: 'active',
  createdAt: 'before', updatedAt: 'before',
};

function proposal(operation: Record<string, unknown>): UnifiedChatProposal {
  return {
    id: 'proposal-arc', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'arcs', title: 'Arc change', body: 'Reviews the Arc change.',
    status: 'approved', version: 2, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-arc', proposalId: 'proposal-arc', capabilityId: 'arcs',
      summary: 'Arc change', idempotencyKey: 'arc-change-1', sequence: 1,
      ...operation,
    },
  } as UnifiedChatProposal;
}

test('creates a deterministic Arc only after entitlement validation and removes it on safe undo', () => {
  let arcs: Arc[] = [];
  const store = boundary({ arcs, setArcs: (next) => { arcs = next; }, isPro: false });
  const receipt = applyApprovedArcProposal({
    proposal: proposal({
      type: 'create_arc', targetId: null,
      payload: { name: 'Curious maker', narrative: 'I learn by making.', expectedUpdatedAt: null },
    }),
    store,
    now: () => 'applied',
  });

  expect(arcs).toEqual([expect.objectContaining({
    id: 'arc-operation-arc', name: 'Curious maker', status: 'active',
    createdAt: 'applied', updatedAt: 'applied',
  })]);
  expect(receipt.undoOperation).toEqual({ type: 'delete_created_arc', expectedUpdatedAt: 'applied' });
  undoAppliedArcProposal({ receipt, store, now: () => 'undone' });
  expect(arcs).toEqual([]);
});

test('refuses Arc creation when the native free-tier limit is reached', () => {
  const store = boundary({ arcs: [before], isPro: false });
  expect(() => applyApprovedArcProposal({
    proposal: proposal({
      type: 'create_arc', targetId: null,
      payload: { name: 'Curious maker', expectedUpdatedAt: null },
    }),
    store,
  })).toThrow(ArcMutationConflictError);
});

test('updates explicit Arc fields and restores the whole prior Arc', () => {
  let arcs = [before];
  const store = boundary({ arcs, setArcs: (next) => { arcs = next; }, isPro: true });
  const receipt = applyApprovedArcProposal({
    proposal: proposal({
      type: 'update_arc', targetId: before.id,
      payload: {
        name: 'Steady parent', identityStatement: 'I bring calm to transitions.', status: 'paused',
        expectedUpdatedAt: before.updatedAt,
      },
    }),
    store,
    now: () => 'applied',
  });

  expect(arcs[0]).toMatchObject({
    name: 'Steady parent', status: 'paused', updatedAt: 'applied',
    identity: { statement: 'I bring calm to transitions.', centralInsight: 'I bring calm to transitions.' },
  });
  undoAppliedArcProposal({ receipt, store, now: () => 'undone' });
  expect(arcs).toEqual([{ ...before, updatedAt: 'undone' }]);
});

test('deletes an Arc dependency graph and restores it on undo', () => {
  let arcs = [before];
  const goal: Goal = {
    id: 'goal-1', arcId: before.id, title: 'Read together', status: 'planned', forceIntent: {}, metrics: [],
    createdAt: 'before', updatedAt: 'before',
  };
  let goals = [goal];
  const activity: Activity = {
    id: 'activity-1', goalId: goal.id, title: 'Choose a book', type: 'task', tags: [], status: 'planned',
    forceActual: {}, createdAt: 'before', updatedAt: 'before',
  };
  let activities = [activity];
  const recommendations: GoalDraft[] = [{
    title: 'Visit the library', status: 'planned', forceIntent: {},
  }];
  let restored: unknown = null;
  const store = boundary({
    arcs, goals, activities, recommendations,
    setArcs: (next) => { arcs = next; }, setGoals: (next) => { goals = next; },
    setActivities: (next) => { activities = next; },
    restore: (input) => { restored = input; arcs = [input.arc]; goals = input.goals.map((item) => item.goal); activities = input.activities.map((item) => item.activity); },
  });
  const receipt = applyApprovedArcProposal({
    proposal: proposal({
      type: 'delete_arc', targetId: before.id,
      payload: { expectedUpdatedAt: before.updatedAt },
    }),
    store,
    now: () => 'deleted',
  });

  expect({ arcs, goals, activities }).toEqual({ arcs: [], goals: [], activities: [] });
  expect(receipt.undoOperation).toMatchObject({
    type: 'restore_removed_arc', arc: before,
    goals: [{ goal, originalIndex: 0 }], activities: [{ activity, originalIndex: 0 }],
    goalRecommendations: recommendations,
  });
  undoAppliedArcProposal({ receipt, store, now: () => 'restored' });
  expect(restored).toMatchObject({ arc: { ...before, updatedAt: 'restored' }, goalRecommendations: recommendations });
});

function boundary({
  arcs,
  goals = [],
  activities = [],
  recommendations = [],
  isPro = true,
  setArcs = () => undefined,
  setGoals = () => undefined,
  setActivities = () => undefined,
  restore = () => undefined,
}: {
  arcs: Arc[];
  goals?: Goal[];
  activities?: Activity[];
  recommendations?: GoalDraft[];
  isPro?: boolean;
  setArcs?: (next: Arc[]) => void;
  setGoals?: (next: Goal[]) => void;
  setActivities?: (next: Activity[]) => void;
  restore?: (input: {
    arc: Arc; arcIndex: number; goals: Array<{ goal: Goal; originalIndex: number }>;
    activities: Array<{ activity: Activity; originalIndex: number }>;
    goalRecommendations: GoalDraft[];
  }) => void;
}) {
  let currentArcs = arcs;
  let currentGoals = goals;
  let currentActivities = activities;
  const commitArcs = (next: Arc[]) => { currentArcs = next; setArcs(next); };
  const commitGoals = (next: Goal[]) => { currentGoals = next; setGoals(next); };
  const commitActivities = (next: Activity[]) => { currentActivities = next; setActivities(next); };
  return {
    getArcs: () => currentArcs, getGoals: () => currentGoals, getActivities: () => currentActivities,
    getGoalRecommendations: () => recommendations, getIsPro: () => isPro,
    addArc: (arc: Arc) => commitArcs([...currentArcs, arc]),
    updateArc: (id: string, updater: (arc: Arc) => Arc) =>
      commitArcs(currentArcs.map((arc) => arc.id === id ? updater(arc) : arc)),
    removeArc: (id: string) => {
      const removedGoalIds = new Set(currentGoals.filter((goal) => goal.arcId === id).map((goal) => goal.id));
      commitArcs(currentArcs.filter((arc) => arc.id !== id));
      commitGoals(currentGoals.filter((goal) => goal.arcId !== id));
      commitActivities(currentActivities.filter((activity) => !removedGoalIds.has(activity.goalId ?? '')));
    },
    restoreRemovedArc: (input: Parameters<typeof restore>[0]) => {
      currentArcs = [input.arc];
      currentGoals = input.goals.map((item) => item.goal);
      currentActivities = input.activities.map((item) => item.activity);
      restore(input);
    },
  };
}
