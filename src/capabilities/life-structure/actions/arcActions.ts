import { canCreateArc } from '../../../domain/limits';
import type { Activity, Arc, Goal, GoalDraft } from '../../../domain/types';

type ArcReadBoundary = {
  getArcs: () => readonly Arc[];
  getGoals: () => readonly Goal[];
  getActivities: () => readonly Activity[];
  getGoalRecommendations: (arcId: string) => readonly GoalDraft[];
};

export type ArcCreateStoreBoundary = ArcReadBoundary & {
  getIsPro: () => boolean;
  addArc: (arc: Arc) => void;
};

export type ArcUpdateStoreBoundary = ArcReadBoundary & {
  updateArc: (arcId: string, updater: (current: Arc) => Arc) => void;
};

export type ArcDeleteStoreBoundary = ArcReadBoundary & {
  removeArc: (arcId: string) => void;
};

export type ArcActionStoreBoundary = ArcCreateStoreBoundary & ArcUpdateStoreBoundary & ArcDeleteStoreBoundary;

export type ArcActionReceipt = {
  operationId: 'arcs.create' | 'arcs.update' | 'arcs.delete';
  status: 'completed';
  resultRefs: readonly [{ kind: 'arc'; id: string }];
  affectedRefs: ReadonlyArray<{ kind: 'goal' | 'activity'; id: string }>;
  reversible: true;
  result: Arc;
  previous: Arc | null;
};

export class ArcActionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArcActionConflictError';
  }
}

function findRequiredArc(store: ArcReadBoundary, arcId: string): Arc {
  const arc = store.getArcs().find((candidate) => candidate.id === arcId);
  if (!arc) throw new ArcActionConflictError('The Arc is no longer available.');
  return arc;
}

function assertExpectedVersion(arc: Arc, expectedUpdatedAt?: string): void {
  if (expectedUpdatedAt !== undefined && arc.updatedAt !== expectedUpdatedAt) {
    throw new ArcActionConflictError('The Arc changed after this action was prepared.');
  }
}

function receipt(
  operationId: ArcActionReceipt['operationId'],
  result: Arc,
  previous: Arc | null,
  affectedRefs: ArcActionReceipt['affectedRefs'] = [],
): ArcActionReceipt {
  return {
    operationId,
    status: 'completed',
    resultRefs: [{ kind: 'arc', id: result.id }],
    affectedRefs,
    reversible: true,
    result,
    previous,
  };
}

export function createArc(input: { arc: Arc }, store: ArcCreateStoreBoundary): ArcActionReceipt {
  const existing = store.getArcs().find((candidate) => candidate.id === input.arc.id);
  if (existing) {
    if (existing.name !== input.arc.name) {
      throw new ArcActionConflictError('A different Arc already exists with this id.');
    }
    return receipt('arcs.create', existing, null);
  }
  if (!canCreateArc({ isPro: store.getIsPro(), arcs: [...store.getArcs()] }).ok) {
    throw new ArcActionConflictError('Your current plan has reached its Arc limit.');
  }
  store.addArc(input.arc);
  return receipt('arcs.create', findRequiredArc(store, input.arc.id), null);
}

export function updateArc(
  input: { arcId: string; expectedUpdatedAt?: string; update: (current: Arc) => Arc },
  store: ArcUpdateStoreBoundary,
): ArcActionReceipt {
  const previous = findRequiredArc(store, input.arcId);
  assertExpectedVersion(previous, input.expectedUpdatedAt);
  store.updateArc(input.arcId, input.update);
  return receipt('arcs.update', findRequiredArc(store, input.arcId), previous);
}

export function deleteArc(
  input: { arcId: string; expectedUpdatedAt?: string },
  store: ArcDeleteStoreBoundary,
): ArcActionReceipt {
  const previous = findRequiredArc(store, input.arcId);
  assertExpectedVersion(previous, input.expectedUpdatedAt);
  const goals = store.getGoals().filter((goal) => goal.arcId === previous.id);
  const goalIds = new Set(goals.map((goal) => goal.id));
  const activities = store.getActivities().filter((activity) => goalIds.has(activity.goalId ?? ''));
  const affectedRefs: ArcActionReceipt['affectedRefs'] = [
    ...goals.map((goal) => ({ kind: 'goal' as const, id: goal.id })),
    ...activities.map((activity) => ({ kind: 'activity' as const, id: activity.id })),
  ];
  store.removeArc(input.arcId);
  if (store.getArcs().some((candidate) => candidate.id === input.arcId)) {
    throw new ArcActionConflictError('The Arc could not be deleted.');
  }
  return receipt('arcs.delete', previous, previous, affectedRefs);
}
