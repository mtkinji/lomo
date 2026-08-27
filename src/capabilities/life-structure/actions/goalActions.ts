import type { Activity, Goal } from '../../../domain/types';

type GoalReadBoundary = {
  getGoals: () => readonly Goal[];
  getActivities: () => readonly Activity[];
  getArcIds: () => readonly string[];
};

export type GoalCreateStoreBoundary = GoalReadBoundary & {
  addGoal: (goal: Goal) => void;
};

export type GoalUpdateStoreBoundary = GoalReadBoundary & {
  updateGoal: (goalId: string, updater: (current: Goal) => Goal) => void;
};

export type GoalDeleteStoreBoundary = GoalReadBoundary & {
  removeGoal: (goalId: string) => void;
};

export type GoalActionStoreBoundary = GoalCreateStoreBoundary & GoalUpdateStoreBoundary & GoalDeleteStoreBoundary;

export type GoalActionReceipt = {
  operationId: 'goals.create' | 'goals.update' | 'goals.delete';
  status: 'completed';
  resultRefs: readonly [{ kind: 'goal'; id: string }];
  affectedRefs: ReadonlyArray<{ kind: 'activity'; id: string }>;
  reversible: true;
  result: Goal;
  previous: Goal | null;
};

export class GoalActionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoalActionConflictError';
  }
}

function findRequiredGoal(store: GoalReadBoundary, goalId: string): Goal {
  const goal = store.getGoals().find((candidate) => candidate.id === goalId);
  if (!goal) throw new GoalActionConflictError('The Goal is no longer available.');
  return goal;
}

function assertArcAvailable(store: GoalReadBoundary, arcId: string | null): void {
  if (arcId && !store.getArcIds().includes(arcId)) {
    throw new GoalActionConflictError('The selected Arc is no longer available.');
  }
}

function assertExpectedVersion(goal: Goal, expectedUpdatedAt?: string): void {
  if (expectedUpdatedAt !== undefined && goal.updatedAt !== expectedUpdatedAt) {
    throw new GoalActionConflictError('The Goal changed after this action was prepared.');
  }
}

function receipt(
  operationId: GoalActionReceipt['operationId'],
  result: Goal,
  previous: Goal | null,
  affectedRefs: GoalActionReceipt['affectedRefs'] = [],
): GoalActionReceipt {
  return {
    operationId,
    status: 'completed',
    resultRefs: [{ kind: 'goal', id: result.id }],
    affectedRefs,
    reversible: true,
    result,
    previous,
  };
}

export function createGoal(input: { goal: Goal }, store: GoalCreateStoreBoundary): GoalActionReceipt {
  const existing = store.getGoals().find((candidate) => candidate.id === input.goal.id);
  if (existing) {
    if (existing.title !== input.goal.title) {
      throw new GoalActionConflictError('A different Goal already exists with this id.');
    }
    return receipt('goals.create', existing, null);
  }
  assertArcAvailable(store, input.goal.arcId);
  store.addGoal(input.goal);
  return receipt('goals.create', findRequiredGoal(store, input.goal.id), null);
}

export function updateGoal(
  input: { goalId: string; expectedUpdatedAt?: string; update: (current: Goal) => Goal },
  store: GoalUpdateStoreBoundary,
): GoalActionReceipt {
  const previous = findRequiredGoal(store, input.goalId);
  assertExpectedVersion(previous, input.expectedUpdatedAt);
  const next = input.update(previous);
  assertArcAvailable(store, next.arcId);
  store.updateGoal(input.goalId, () => next);
  return receipt('goals.update', findRequiredGoal(store, input.goalId), previous);
}

export function deleteGoal(
  input: { goalId: string; expectedUpdatedAt?: string },
  store: GoalDeleteStoreBoundary,
): GoalActionReceipt {
  const previous = findRequiredGoal(store, input.goalId);
  assertExpectedVersion(previous, input.expectedUpdatedAt);
  const affectedRefs = store.getActivities()
    .filter((activity) => activity.goalId === previous.id)
    .map((activity) => ({ kind: 'activity' as const, id: activity.id }));
  store.removeGoal(input.goalId);
  if (store.getGoals().some((candidate) => candidate.id === input.goalId)) {
    throw new GoalActionConflictError('The Goal could not be deleted.');
  }
  return receipt('goals.delete', previous, previous, affectedRefs);
}
