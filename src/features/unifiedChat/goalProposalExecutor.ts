import type { Activity, Goal } from '../../domain/types';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

type GoalProposal = Extract<UnifiedChatProposal, { capabilityId: 'goals' }>;

export type GoalStoreBoundary = {
  getGoals: () => readonly Goal[];
  getArcIds: () => readonly string[];
  getActivities: () => readonly Activity[];
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updater: (goal: Goal) => Goal) => void;
  removeGoal: (id: string) => void;
  restoreRemovedGoal: (input: {
    goal: Goal; goalIndex?: number;
    activities?: Array<{ activity: Activity; originalIndex?: number }>;
  }) => void;
};

export type GoalMutationReceipt = {
  proposalId: string;
  operationId: string;
  idempotencyKey: string;
  resultingObjectId: string;
  resultState: { title: string; status: Goal['status']; arcId: string | null; updatedAt: string };
  returnTarget: Record<string, unknown>;
  undoOperation:
    | { type: 'restore_goal'; goal: Goal; expectedUpdatedAt: string }
    | { type: 'delete_created_goal'; expectedUpdatedAt: string }
    | {
        type: 'restore_removed_goal'; goal: Goal; goalIndex: number;
        activities: Array<{ activity: Activity; originalIndex: number }>;
      };
  appliedAt: string;
};

export class GoalMutationConflictError extends Error {}

function computeGoalMutation(proposal: UnifiedChatProposal, store: GoalStoreBoundary, appliedAt: string) {
  if (proposal.capabilityId !== 'goals' || proposal.operation.type !== 'update_goal' || proposal.status !== 'approved') {
    throw new GoalMutationConflictError('This Goal proposal is not approved.');
  }
  const current = store.getGoals().find((goal) => goal.id === proposal.operation.targetId);
  if (!current || current.updatedAt !== proposal.operation.payload.expectedUpdatedAt) {
    throw new GoalMutationConflictError('The Goal changed after this proposal was prepared.');
  }
  const { expectedUpdatedAt: _expected, ...patch } = proposal.operation.payload;
  if (patch.arcId && !store.getArcIds().includes(patch.arcId)) {
    throw new GoalMutationConflictError('The selected Arc is no longer available.');
  }
  const next: Goal = { ...current, updatedAt: appliedAt };
  if (patch.title !== undefined) next.title = patch.title;
  if ('description' in patch) {
    if (patch.description === null) delete next.description;
    else next.description = patch.description;
  }
  if ('arcId' in patch) next.arcId = patch.arcId ?? null;
  if (patch.status !== undefined) next.status = patch.status;
  if ('priority' in patch) {
    if (patch.priority === null) delete next.priority;
    else next.priority = patch.priority;
  }
  if ('targetDate' in patch) {
    if (patch.targetDate === null) delete next.targetDate;
    else next.targetDate = patch.targetDate;
  }
  return { current, next };
}

function receiptFor(proposal: GoalProposal, current: Goal, next: Goal, appliedAt: string): GoalMutationReceipt {
  return {
    proposalId: proposal.id, operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: current.id,
    resultState: { title: next.title, status: next.status, arcId: next.arcId, updatedAt: next.updatedAt },
    returnTarget: {
      capabilityId: 'goals', object: { type: 'goal', id: current.id }, label: next.title,
      route: { name: 'MainTabs', params: { screen: 'GoalsTab', params: { screen: 'GoalDetail', params: { goalId: current.id } } } },
    },
    undoOperation: { type: 'restore_goal', goal: current, expectedUpdatedAt: next.updatedAt },
    appliedAt,
  };
}

function createGoalForProposal(proposal: GoalProposal, store: GoalStoreBoundary, appliedAt: string): Goal {
  if (proposal.operation.type !== 'create_goal') {
    throw new GoalMutationConflictError('This is not a Goal creation proposal.');
  }
  const input = proposal.operation.payload;
  if (input.arcId && !store.getArcIds().includes(input.arcId)) {
    throw new GoalMutationConflictError('The selected Arc is no longer available.');
  }
  const id = `goal-${proposal.operation.id}`;
  if (store.getGoals().some((goal) => goal.id === id)) {
    throw new GoalMutationConflictError('This Goal creation has already been applied.');
  }
  return {
    id, arcId: input.arcId ?? null, title: input.title,
    ...(input.description ? { description: input.description } : {}),
    status: input.status ?? 'planned', qualityState: 'draft',
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.targetDate ? { targetDate: input.targetDate } : {}),
    forceIntent: {}, metrics: [], createdAt: appliedAt, updatedAt: appliedAt,
  };
}

function creationReceipt(proposal: GoalProposal, goal: Goal, appliedAt: string): GoalMutationReceipt {
  return {
    proposalId: proposal.id, operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: goal.id,
    resultState: { title: goal.title, status: goal.status, arcId: goal.arcId, updatedAt: goal.updatedAt },
    returnTarget: {
      capabilityId: 'goals', object: { type: 'goal', id: goal.id }, label: goal.title,
      route: { name: 'MainTabs', params: { screen: 'GoalsTab', params: { screen: 'GoalDetail', params: { goalId: goal.id } } } },
    },
    undoOperation: { type: 'delete_created_goal', expectedUpdatedAt: goal.updatedAt }, appliedAt,
  };
}

function deletionReceipt(proposal: GoalProposal, store: GoalStoreBoundary, appliedAt: string): GoalMutationReceipt {
  if (proposal.operation.type !== 'delete_goal') {
    throw new GoalMutationConflictError('This is not a Goal deletion proposal.');
  }
  const goals = store.getGoals();
  const goalIndex = goals.findIndex((goal) => goal.id === proposal.operation.targetId);
  const goal = goals[goalIndex];
  if (!goal || goal.updatedAt !== proposal.operation.payload.expectedUpdatedAt) {
    throw new GoalMutationConflictError('The Goal changed after this proposal was prepared.');
  }
  const activities = store.getActivities()
    .map((activity, originalIndex) => ({ activity, originalIndex }))
    .filter(({ activity }) => activity.goalId === goal.id);
  return {
    proposalId: proposal.id, operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: goal.id,
    resultState: { title: goal.title, status: goal.status, arcId: goal.arcId, updatedAt: appliedAt },
    returnTarget: {
      capabilityId: 'goals', object: { type: 'goals', id: 'goals' }, label: 'Review Goals',
      route: { name: 'MainTabs', params: { screen: 'GoalsTab' } },
    },
    undoOperation: { type: 'restore_removed_goal', goal, goalIndex, activities }, appliedAt,
  };
}

export function prepareApprovedGoalProposal({ proposal, store, appliedAt }: {
  proposal: UnifiedChatProposal; store: GoalStoreBoundary; appliedAt: string;
}): GoalMutationReceipt {
  if (proposal.capabilityId === 'goals' && proposal.operation.type === 'create_goal') {
    const approved = proposal as GoalProposal;
    return creationReceipt(approved, createGoalForProposal(approved, store, appliedAt), appliedAt);
  }
  if (proposal.capabilityId === 'goals' && proposal.operation.type === 'delete_goal') {
    return deletionReceipt(proposal as GoalProposal, store, appliedAt);
  }
  const { current, next } = computeGoalMutation(proposal, store, appliedAt);
  return receiptFor(proposal as GoalProposal, current, next, appliedAt);
}

export function applyApprovedGoalProposal({ proposal, store, now = () => new Date().toISOString() }: {
  proposal: UnifiedChatProposal; store: GoalStoreBoundary; now?: () => string;
}): GoalMutationReceipt {
  const appliedAt = now();
  if (proposal.capabilityId === 'goals' && proposal.operation.type === 'create_goal') {
    const approved = proposal as GoalProposal;
    const goal = createGoalForProposal(approved, store, appliedAt);
    store.addGoal(goal);
    return creationReceipt(approved, goal, appliedAt);
  }
  if (proposal.capabilityId === 'goals' && proposal.operation.type === 'delete_goal') {
    const approved = proposal as GoalProposal;
    const receipt = deletionReceipt(approved, store, appliedAt);
    store.removeGoal(receipt.resultingObjectId);
    return receipt;
  }
  const { current, next } = computeGoalMutation(proposal, store, appliedAt);
  store.updateGoal(current.id, () => next);
  return receiptFor(proposal as GoalProposal, current, next, appliedAt);
}

export function undoAppliedGoalProposal({ receipt, store, now = () => new Date().toISOString() }: {
  receipt: GoalMutationReceipt; store: GoalStoreBoundary; now?: () => string;
}): { undoneAt: string } {
  const current = store.getGoals().find((goal) => goal.id === receipt.resultingObjectId);
  if (receipt.undoOperation.type === 'restore_removed_goal') {
    if (current || receipt.undoOperation.activities.some(({ activity }) =>
      store.getActivities().some((candidate) => candidate.id === activity.id))) {
      throw new GoalMutationConflictError('Kwilt will not overwrite a Goal or Activity that changed after deletion.');
    }
    const undoneAt = now();
    store.restoreRemovedGoal({
      goal: { ...receipt.undoOperation.goal, updatedAt: undoneAt },
      goalIndex: receipt.undoOperation.goalIndex,
      activities: receipt.undoOperation.activities,
    });
    return { undoneAt };
  }
  if (!current || current.updatedAt !== receipt.undoOperation.expectedUpdatedAt) {
    throw new GoalMutationConflictError('The Goal changed after apply, so Kwilt will not overwrite it during undo.');
  }
  const undoneAt = now();
  if (receipt.undoOperation.type === 'delete_created_goal') {
    store.removeGoal(current.id);
  } else {
    const prior = receipt.undoOperation.goal;
    store.updateGoal(current.id, () => ({ ...prior, updatedAt: undoneAt }));
  }
  return { undoneAt };
}

export function hydrateGoalMutationReceipt(stored: UnifiedChatMutationReceipt): GoalMutationReceipt | null {
  const undo = stored.undoOperation;
  const state = stored.resultState;
  if (stored.capabilityId !== 'goals' || stored.status !== 'applied' || !undo ||
      (undo.type !== 'restore_goal' && undo.type !== 'delete_created_goal' && undo.type !== 'restore_removed_goal') ||
      (undo.type === 'restore_goal' && (!undo.goal || typeof undo.goal !== 'object')) ||
      (undo.type === 'restore_removed_goal' &&
        (!undo.goal || typeof undo.goal !== 'object' || typeof undo.goalIndex !== 'number' || !Array.isArray(undo.activities))) ||
      (undo.type !== 'restore_removed_goal' && typeof undo.expectedUpdatedAt !== 'string') ||
      typeof state.title !== 'string' ||
      typeof state.status !== 'string' || typeof state.updatedAt !== 'string') return null;
  return {
    proposalId: stored.proposalId, operationId: stored.operationId,
    idempotencyKey: stored.idempotencyKey, resultingObjectId: stored.resultingObjectId ?? '',
    resultState: state as GoalMutationReceipt['resultState'], returnTarget: stored.returnTarget ?? {},
    undoOperation: undo.type === 'restore_goal'
      ? { type: 'restore_goal', goal: undo.goal as Goal, expectedUpdatedAt: undo.expectedUpdatedAt as string }
      : undo.type === 'delete_created_goal'
        ? { type: 'delete_created_goal', expectedUpdatedAt: undo.expectedUpdatedAt as string }
        : {
            type: 'restore_removed_goal', goal: undo.goal as Goal, goalIndex: undo.goalIndex as number,
            activities: undo.activities as Array<{ activity: Activity; originalIndex: number }>,
          },
    appliedAt: stored.appliedAt ?? state.updatedAt,
  };
}

export function recoverReservedGoalProposal({ receipt, proposal, store }: {
  receipt: UnifiedChatMutationReceipt; proposal: UnifiedChatProposal; store: GoalStoreBoundary;
}): GoalMutationReceipt {
  if (proposal.capabilityId !== 'goals' || receipt.status !== 'reserved' ||
      (receipt.undoOperation?.type !== 'restore_goal' && receipt.undoOperation?.type !== 'delete_created_goal' &&
        receipt.undoOperation?.type !== 'restore_removed_goal')) {
    throw new GoalMutationConflictError('This Goal receipt cannot be recovered safely.');
  }
  if (proposal.operation.type === 'create_goal') {
    if (receipt.undoOperation.type !== 'delete_created_goal' ||
        typeof receipt.undoOperation.expectedUpdatedAt !== 'string') {
      throw new GoalMutationConflictError('This Goal creation receipt cannot be recovered safely.');
    }
    const existing = store.getGoals().find((goal) => goal.id === receipt.resultingObjectId);
    const appliedAt = receipt.appliedAt ?? receipt.undoOperation.expectedUpdatedAt;
    if (existing && existing.updatedAt === receipt.undoOperation.expectedUpdatedAt) {
      return creationReceipt({ ...proposal, status: 'approved' } as GoalProposal, existing, appliedAt);
    }
    if (existing) throw new GoalMutationConflictError('The Goal changed after this proposal was prepared.');
    return applyApprovedGoalProposal({ proposal: { ...proposal, status: 'approved' }, store, now: () => appliedAt });
  }
  if (proposal.operation.type === 'delete_goal') {
    if (receipt.undoOperation.type !== 'restore_removed_goal' ||
        !receipt.undoOperation.goal || typeof receipt.undoOperation.goal !== 'object' ||
        !Array.isArray(receipt.undoOperation.activities)) {
      throw new GoalMutationConflictError('This Goal deletion receipt cannot be recovered safely.');
    }
    const existing = store.getGoals().find((goal) => goal.id === proposal.operation.targetId);
    const appliedAt = receipt.appliedAt ?? new Date().toISOString();
    if (!existing) {
      const prior = receipt.undoOperation.goal as Goal;
      return {
        proposalId: proposal.id, operationId: proposal.operation.id,
        idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: prior.id,
        resultState: { title: prior.title, status: prior.status, arcId: prior.arcId, updatedAt: appliedAt },
        returnTarget: receipt.returnTarget ?? {},
        undoOperation: receipt.undoOperation as GoalMutationReceipt['undoOperation'], appliedAt,
      };
    }
    return applyApprovedGoalProposal({ proposal: { ...proposal, status: 'approved' }, store, now: () => appliedAt });
  }
  if (receipt.undoOperation.type !== 'restore_goal' ||
      !receipt.undoOperation.goal || typeof receipt.undoOperation.goal !== 'object' ||
      typeof receipt.undoOperation.expectedUpdatedAt !== 'string') {
    throw new GoalMutationConflictError('This Goal update receipt cannot be recovered safely.');
  }
  const prior = receipt.undoOperation.goal as Goal;
  const existing = store.getGoals().find((goal) => goal.id === proposal.operation.targetId);
  const appliedAt = receipt.appliedAt ?? receipt.undoOperation.expectedUpdatedAt;
  if (existing?.updatedAt === receipt.undoOperation.expectedUpdatedAt) {
    return receiptFor(
      { ...proposal, status: 'approved' } as GoalProposal,
      prior,
      existing,
      appliedAt,
    );
  }
  return applyApprovedGoalProposal({ proposal: { ...proposal, status: 'approved' }, store, now: () => appliedAt });
}
