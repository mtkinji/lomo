import { canCreateArc } from '../../domain/limits';
import type { Activity, Arc, Goal, GoalDraft } from '../../domain/types';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

type ArcProposal = Extract<UnifiedChatProposal, { capabilityId: 'arcs' }>;

export type ArcStoreBoundary = {
  getArcs: () => readonly Arc[];
  getGoals: () => readonly Goal[];
  getActivities: () => readonly Activity[];
  getGoalRecommendations: (arcId: string) => readonly GoalDraft[];
  getIsPro: () => boolean;
  addArc: (arc: Arc) => void;
  updateArc: (id: string, updater: (arc: Arc) => Arc) => void;
  removeArc: (id: string) => void;
  restoreRemovedArc: (input: {
    arc: Arc; arcIndex: number;
    goals: Array<{ goal: Goal; originalIndex: number }>;
    activities: Array<{ activity: Activity; originalIndex: number }>;
    goalRecommendations: GoalDraft[];
  }) => void;
};

export type ArcMutationReceipt = {
  proposalId: string;
  operationId: string;
  idempotencyKey: string;
  resultingObjectId: string;
  resultState: { name: string; status: Arc['status']; updatedAt: string };
  returnTarget: Record<string, unknown>;
  undoOperation:
    | { type: 'restore_arc'; arc: Arc; expectedUpdatedAt: string }
    | { type: 'delete_created_arc'; expectedUpdatedAt: string }
    | {
        type: 'restore_removed_arc'; arc: Arc; arcIndex: number;
        goals: Array<{ goal: Goal; originalIndex: number }>;
        activities: Array<{ activity: Activity; originalIndex: number }>;
        goalRecommendations: GoalDraft[];
      };
  appliedAt: string;
};

export class ArcMutationConflictError extends Error {}

function returnTarget(arc: Pick<Arc, 'id' | 'name'>): Record<string, unknown> {
  return {
    capabilityId: 'arcs', object: { type: 'arc', id: arc.id }, label: arc.name,
    route: {
      name: 'MainTabs',
      params: {
        screen: 'MoreTab',
        params: { screen: 'MoreArcs', params: { screen: 'ArcDetail', params: { arcId: arc.id } } },
      },
    },
  };
}

function creation(proposal: ArcProposal, store: ArcStoreBoundary, appliedAt: string): { arc: Arc; receipt: ArcMutationReceipt } {
  if (proposal.operation.type !== 'create_arc') throw new ArcMutationConflictError('This is not an Arc creation proposal.');
  const allowance = canCreateArc({ isPro: store.getIsPro(), arcs: [...store.getArcs()] });
  if (!allowance.ok) throw new ArcMutationConflictError('Your current plan has reached its Arc limit.');
  const id = `arc-${proposal.operation.id}`;
  if (store.getArcs().some((arc) => arc.id === id)) {
    throw new ArcMutationConflictError('This Arc creation has already been applied.');
  }
  const input = proposal.operation.payload;
  const arc: Arc = {
    id, name: input.name,
    ...(input.narrative ? { narrative: input.narrative } : {}),
    ...(input.identityStatement ? {
      identity: { statement: input.identityStatement, centralInsight: input.identityStatement },
    } : {}),
    status: input.status ?? 'active', startDate: appliedAt, endDate: null,
    createdAt: appliedAt, updatedAt: appliedAt,
  };
  return {
    arc,
    receipt: {
      proposalId: proposal.id, operationId: proposal.operation.id,
      idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: arc.id,
      resultState: { name: arc.name, status: arc.status, updatedAt: appliedAt },
      returnTarget: returnTarget(arc),
      undoOperation: { type: 'delete_created_arc', expectedUpdatedAt: appliedAt }, appliedAt,
    },
  };
}

function update(proposal: ArcProposal, store: ArcStoreBoundary, appliedAt: string): { arc: Arc; receipt: ArcMutationReceipt } {
  if (proposal.operation.type !== 'update_arc') throw new ArcMutationConflictError('This is not an Arc update proposal.');
  const current = store.getArcs().find((arc) => arc.id === proposal.operation.targetId);
  if (!current || current.updatedAt !== proposal.operation.payload.expectedUpdatedAt) {
    throw new ArcMutationConflictError('The Arc changed after this proposal was prepared.');
  }
  const { expectedUpdatedAt: _expected, ...patch } = proposal.operation.payload;
  const next: Arc = { ...current, updatedAt: appliedAt };
  if (patch.name !== undefined) next.name = patch.name;
  if ('narrative' in patch) {
    if (patch.narrative === null) delete next.narrative;
    else next.narrative = patch.narrative;
  }
  if ('identityStatement' in patch) {
    const identityStatement = patch.identityStatement;
    if (!identityStatement) delete next.identity;
    else next.identity = {
      ...(current.identity ?? { centralInsight: identityStatement }),
      statement: identityStatement,
      centralInsight: current.identity?.centralInsight ?? identityStatement,
    };
  }
  if (patch.status !== undefined) next.status = patch.status;
  return {
    arc: next,
    receipt: {
      proposalId: proposal.id, operationId: proposal.operation.id,
      idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: current.id,
      resultState: { name: next.name, status: next.status, updatedAt: appliedAt },
      returnTarget: returnTarget(next),
      undoOperation: { type: 'restore_arc', arc: current, expectedUpdatedAt: appliedAt }, appliedAt,
    },
  };
}

function deletion(proposal: ArcProposal, store: ArcStoreBoundary, appliedAt: string): ArcMutationReceipt {
  if (proposal.operation.type !== 'delete_arc') throw new ArcMutationConflictError('This is not an Arc deletion proposal.');
  const arcs = store.getArcs();
  const arcIndex = arcs.findIndex((arc) => arc.id === proposal.operation.targetId);
  const arc = arcs[arcIndex];
  if (!arc || arc.updatedAt !== proposal.operation.payload.expectedUpdatedAt) {
    throw new ArcMutationConflictError('The Arc changed after this proposal was prepared.');
  }
  const goals = store.getGoals()
    .map((goal, originalIndex) => ({ goal, originalIndex }))
    .filter(({ goal }) => goal.arcId === arc.id);
  const goalIds = new Set(goals.map(({ goal }) => goal.id));
  const activities = store.getActivities()
    .map((activity, originalIndex) => ({ activity, originalIndex }))
    .filter(({ activity }) => goalIds.has(activity.goalId ?? ''));
  return {
    proposalId: proposal.id, operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: arc.id,
    resultState: { name: arc.name, status: arc.status, updatedAt: appliedAt },
    returnTarget: {
      capabilityId: 'arcs', object: { type: 'arcs', id: 'arcs' }, label: 'Review Arcs',
      route: { name: 'MainTabs', params: { screen: 'MoreTab', params: { screen: 'MoreArcs' } } },
    },
    undoOperation: {
      type: 'restore_removed_arc', arc, arcIndex, goals, activities,
      goalRecommendations: [...store.getGoalRecommendations(arc.id)],
    },
    appliedAt,
  };
}

export function prepareApprovedArcProposal({ proposal, store, appliedAt }: {
  proposal: UnifiedChatProposal; store: ArcStoreBoundary; appliedAt: string;
}): ArcMutationReceipt {
  if (proposal.capabilityId !== 'arcs' || proposal.status !== 'approved') {
    throw new ArcMutationConflictError('This Arc proposal is not approved.');
  }
  if (proposal.operation.type === 'create_arc') return creation(proposal, store, appliedAt).receipt;
  if (proposal.operation.type === 'update_arc') return update(proposal, store, appliedAt).receipt;
  return deletion(proposal, store, appliedAt);
}

export function applyApprovedArcProposal({ proposal, store, now = () => new Date().toISOString() }: {
  proposal: UnifiedChatProposal; store: ArcStoreBoundary; now?: () => string;
}): ArcMutationReceipt {
  if (proposal.capabilityId !== 'arcs' || proposal.status !== 'approved') {
    throw new ArcMutationConflictError('This Arc proposal is not approved.');
  }
  const appliedAt = now();
  if (proposal.operation.type === 'create_arc') {
    const result = creation(proposal, store, appliedAt);
    store.addArc(result.arc);
    return result.receipt;
  }
  if (proposal.operation.type === 'update_arc') {
    const result = update(proposal, store, appliedAt);
    store.updateArc(result.arc.id, () => result.arc);
    return result.receipt;
  }
  const receipt = deletion(proposal, store, appliedAt);
  store.removeArc(receipt.resultingObjectId);
  return receipt;
}

export function undoAppliedArcProposal({ receipt, store, now = () => new Date().toISOString() }: {
  receipt: ArcMutationReceipt; store: ArcStoreBoundary; now?: () => string;
}): { undoneAt: string } {
  const current = store.getArcs().find((arc) => arc.id === receipt.resultingObjectId);
  const undoneAt = now();
  if (receipt.undoOperation.type === 'restore_removed_arc') {
    const goalIds = new Set(receipt.undoOperation.goals.map(({ goal }) => goal.id));
    if (current || store.getGoals().some((goal) => goalIds.has(goal.id)) ||
        store.getActivities().some((activity) =>
          receipt.undoOperation.type === 'restore_removed_arc' &&
          receipt.undoOperation.activities.some(({ activity: prior }) => prior.id === activity.id))) {
      throw new ArcMutationConflictError('Kwilt will not overwrite Arc dependencies that changed after deletion.');
    }
    store.restoreRemovedArc({
      ...receipt.undoOperation,
      arc: { ...receipt.undoOperation.arc, updatedAt: undoneAt },
    });
    return { undoneAt };
  }
  if (!current || current.updatedAt !== receipt.undoOperation.expectedUpdatedAt) {
    throw new ArcMutationConflictError('The Arc changed after apply, so Kwilt will not overwrite it during undo.');
  }
  if (receipt.undoOperation.type === 'delete_created_arc') {
    if (store.getGoals().some((goal) => goal.arcId === current.id)) {
      throw new ArcMutationConflictError('This Arc now has Goals, so Kwilt will not cascade-delete them during undo.');
    }
    store.removeArc(current.id);
  } else {
    const prior = receipt.undoOperation.arc;
    store.updateArc(current.id, () => ({ ...prior, updatedAt: undoneAt }));
  }
  return { undoneAt };
}

export function hydrateArcMutationReceipt(stored: UnifiedChatMutationReceipt): ArcMutationReceipt | null {
  const undo = stored.undoOperation;
  const state = stored.resultState;
  if (stored.capabilityId !== 'arcs' || stored.status !== 'applied' || !undo ||
      !['restore_arc', 'delete_created_arc', 'restore_removed_arc'].includes(String(undo.type)) ||
      typeof state.name !== 'string' || !['active', 'paused', 'archived'].includes(String(state.status)) ||
      typeof state.updatedAt !== 'string' || !stored.resultingObjectId) return null;
  if ((undo.type === 'restore_arc' || undo.type === 'restore_removed_arc') &&
      (!undo.arc || typeof undo.arc !== 'object')) return null;
  if ((undo.type === 'restore_arc' || undo.type === 'delete_created_arc') &&
      typeof undo.expectedUpdatedAt !== 'string') return null;
  if (undo.type === 'restore_removed_arc' &&
      (typeof undo.arcIndex !== 'number' || !Array.isArray(undo.goals) ||
        !Array.isArray(undo.activities) || !Array.isArray(undo.goalRecommendations))) return null;
  return {
    proposalId: stored.proposalId, operationId: stored.operationId,
    idempotencyKey: stored.idempotencyKey, resultingObjectId: stored.resultingObjectId,
    resultState: state as ArcMutationReceipt['resultState'], returnTarget: stored.returnTarget ?? {},
    undoOperation: undo as ArcMutationReceipt['undoOperation'],
    appliedAt: stored.appliedAt ?? state.updatedAt,
  };
}

export function recoverReservedArcProposal({ receipt, proposal, store }: {
  receipt: UnifiedChatMutationReceipt; proposal: UnifiedChatProposal; store: ArcStoreBoundary;
}): ArcMutationReceipt {
  if (proposal.capabilityId !== 'arcs' || receipt.capabilityId !== 'arcs' || receipt.status !== 'reserved' ||
      !receipt.undoOperation || !receipt.resultingObjectId || typeof receipt.resultState.name !== 'string' ||
      !['active', 'paused', 'archived'].includes(String(receipt.resultState.status)) ||
      typeof receipt.resultState.updatedAt !== 'string') {
    throw new ArcMutationConflictError('This Arc receipt cannot be recovered safely.');
  }
  const appliedAt = receipt.appliedAt ?? receipt.resultState.updatedAt;
  const current = store.getArcs().find((arc) => arc.id === receipt.resultingObjectId);
  const storedResult = (): ArcMutationReceipt => ({
    proposalId: proposal.id, operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: receipt.resultingObjectId as string,
    resultState: receipt.resultState as ArcMutationReceipt['resultState'],
    returnTarget: receipt.returnTarget ?? {},
    undoOperation: receipt.undoOperation as ArcMutationReceipt['undoOperation'], appliedAt,
  });

  if (proposal.operation.type === 'create_arc') {
    if (receipt.undoOperation.type !== 'delete_created_arc' ||
        typeof receipt.undoOperation.expectedUpdatedAt !== 'string') {
      throw new ArcMutationConflictError('This Arc creation receipt cannot be recovered safely.');
    }
    if (current?.updatedAt === receipt.undoOperation.expectedUpdatedAt) return storedResult();
    if (current) throw new ArcMutationConflictError('The Arc changed after this proposal was prepared.');
    return applyApprovedArcProposal({ proposal: { ...proposal, status: 'approved' }, store, now: () => appliedAt });
  }

  if (proposal.operation.type === 'update_arc') {
    if (receipt.undoOperation.type !== 'restore_arc' ||
        typeof receipt.undoOperation.expectedUpdatedAt !== 'string' ||
        !receipt.undoOperation.arc || typeof receipt.undoOperation.arc !== 'object') {
      throw new ArcMutationConflictError('This Arc update receipt cannot be recovered safely.');
    }
    if (current?.updatedAt === receipt.undoOperation.expectedUpdatedAt) return storedResult();
    if (!current || current.updatedAt !== proposal.operation.payload.expectedUpdatedAt) {
      throw new ArcMutationConflictError('The Arc changed after this proposal was prepared.');
    }
    return applyApprovedArcProposal({ proposal: { ...proposal, status: 'approved' }, store, now: () => appliedAt });
  }

  if (receipt.undoOperation.type !== 'restore_removed_arc' ||
      !receipt.undoOperation.arc || typeof receipt.undoOperation.arc !== 'object' ||
      !Array.isArray(receipt.undoOperation.goals) || !Array.isArray(receipt.undoOperation.activities) ||
      !Array.isArray(receipt.undoOperation.goalRecommendations)) {
    throw new ArcMutationConflictError('This Arc deletion receipt cannot be recovered safely.');
  }
  if (!current) return storedResult();
  if (current.updatedAt !== proposal.operation.payload.expectedUpdatedAt) {
    throw new ArcMutationConflictError('The Arc changed after this proposal was prepared.');
  }
  return applyApprovedArcProposal({ proposal: { ...proposal, status: 'approved' }, store, now: () => appliedAt });
}
