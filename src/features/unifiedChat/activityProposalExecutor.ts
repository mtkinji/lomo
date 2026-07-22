import type { Activity, Goal } from '../../domain/types';
import { assertActivityProposalCanApply, type ActivityMutationPatch } from './activityProposal';
import { todosChatAdapter } from './capabilityAdapters';
import type { CapabilityNativeReturnTarget } from './capabilityContracts';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

export type ActivityStoreBoundary = {
  getActivities: () => readonly Activity[];
  getGoals: () => readonly Goal[];
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, updater: (current: Activity) => Activity) => void;
  removeActivity: (id: string) => void;
};

export type ActivityUndoOperation =
  | { type: 'remove_created_activity'; expectedUpdatedAt: string }
  | { type: 'restore_activity'; activity: Activity; expectedUpdatedAt: string };

export type ActivityMutationReceipt = {
  proposalId: string;
  operationId: string;
  idempotencyKey: string;
  status: 'applied' | 'undone';
  resultingObjectId: string;
  resultState: {
    title: string;
    status: Activity['status'];
    goalId: string | null;
    scheduledDate: string | null | undefined;
    reminderAt: string | null | undefined;
    estimateMinutes: number | null | undefined;
    updatedAt: string;
  };
  returnTarget: CapabilityNativeReturnTarget;
  undoOperation: ActivityUndoOperation;
  appliedAt: string;
  undoneAt: string | null;
};

export type ActivityMutationReservation = Omit<ActivityMutationReceipt, 'status'> & {
  status: 'reserved';
};

export class ActivityMutationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivityMutationConflictError';
  }
}

function deterministicActivityId(operationId: string): string {
  return `activity-chat-${operationId}`.slice(0, 200);
}

function applyPatch(current: Activity, patch: ActivityMutationPatch, at: string): Activity {
  const next: Activity = { ...current, updatedAt: at };
  if (patch.title !== undefined) next.title = patch.title;
  if ('notes' in patch) next.notes = patch.notes ?? undefined;
  if ('goalId' in patch) next.goalId = patch.goalId ?? null;
  if (patch.type !== undefined) next.type = patch.type;
  if (patch.status !== undefined) {
    next.status = patch.status;
    next.completedAt = patch.status === 'done' ? (current.completedAt ?? at) : null;
  }
  if (patch.tags !== undefined) next.tags = [...patch.tags];
  if ('priority' in patch) next.priority = patch.priority ?? undefined;
  if ('scheduledDate' in patch) next.scheduledDate = patch.scheduledDate;
  if ('estimateMinutes' in patch) next.estimateMinutes = patch.estimateMinutes;
  if ('difficulty' in patch) next.difficulty = patch.difficulty ?? undefined;
  return next;
}

function resultState(activity: Activity): ActivityMutationReceipt['resultState'] {
  return {
    title: activity.title,
    status: activity.status,
    goalId: activity.goalId,
    scheduledDate: activity.scheduledDate,
    reminderAt: activity.reminderAt,
    estimateMinutes: activity.estimateMinutes,
    updatedAt: activity.updatedAt,
  };
}

export function refreshCreatedActivityReceipt(
  receipt: ActivityMutationReceipt,
  activity: Activity,
): ActivityMutationReceipt {
  if (receipt.undoOperation.type !== 'remove_created_activity' || receipt.resultingObjectId !== activity.id) {
    throw new ActivityMutationConflictError('Only the matching created To-do receipt can be refreshed.');
  }
  const object = { type: 'activity', id: activity.id, label: activity.title };
  return {
    ...receipt,
    resultState: resultState(activity),
    returnTarget: todosChatAdapter.return.targetFor(object),
    undoOperation: { type: 'remove_created_activity', expectedUpdatedAt: activity.updatedAt },
  };
}

function receiptFor(params: {
  proposal: UnifiedChatProposal;
  activity: Activity;
  undoOperation: ActivityUndoOperation;
  appliedAt: string;
}): ActivityMutationReceipt {
  const object = {
    type: 'activity',
    id: params.activity.id,
    label: params.activity.title,
  };
  return {
    proposalId: params.proposal.id,
    operationId: params.proposal.operation.id,
    idempotencyKey: params.proposal.operation.idempotencyKey,
    status: 'applied',
    resultingObjectId: params.activity.id,
    resultState: resultState(params.activity),
    returnTarget: todosChatAdapter.return.targetFor(object),
    undoOperation: params.undoOperation,
    appliedAt: params.appliedAt,
    undoneAt: null,
  };
}

export function prepareApprovedActivityProposal({
  proposal,
  store,
  appliedAt,
}: {
  proposal: UnifiedChatProposal;
  store: ActivityStoreBoundary;
  appliedAt: string;
}): ActivityMutationReservation {
  assertActivityProposalCanApply(proposal.status);
  const operation = proposal.operation;
  let predicted: Activity;
  let undoOperation: ActivityUndoOperation;

  if (operation.type === 'create_activity') {
    const id = deterministicActivityId(operation.id);
    const existing = store.getActivities().find((activity) => activity.id === id);
    if (existing) {
      if (existing.title !== operation.payload.title) {
        throw new ActivityMutationConflictError('The idempotent create target no longer matches this proposal.');
      }
      predicted = existing;
      undoOperation = { type: 'remove_created_activity', expectedUpdatedAt: existing.updatedAt };
    } else {
      const goalId = operation.payload.goalId ?? null;
      if (goalId && !store.getGoals().some((goal) => goal.id === goalId)) {
        throw new ActivityMutationConflictError('The proposed Goal is no longer available.');
      }
      predicted = applyPatch({
        id, goalId, title: operation.payload.title, type: operation.payload.type ?? 'task',
        tags: operation.payload.tags ?? [], status: operation.payload.status ?? 'planned',
        creationSource: 'ai', forceActual: {}, createdAt: appliedAt, updatedAt: appliedAt,
      }, operation.payload, appliedAt);
      undoOperation = { type: 'remove_created_activity', expectedUpdatedAt: predicted.updatedAt };
    }
  } else {
    const current = store.getActivities().find((activity) => activity.id === operation.targetId);
    if (!current) throw new ActivityMutationConflictError('The proposed To-do is no longer available.');
    if (current.updatedAt !== operation.payload.expectedUpdatedAt) {
      throw new ActivityMutationConflictError('The To-do changed after this proposal was prepared.');
    }
    const { expectedUpdatedAt: _expectedUpdatedAt, ...patch } = operation.payload;
    predicted = applyPatch(current, patch, appliedAt);
    undoOperation = { type: 'restore_activity', activity: current, expectedUpdatedAt: predicted.updatedAt };
  }

  return {
    ...receiptFor({ proposal, activity: predicted, undoOperation, appliedAt }),
    status: 'reserved',
  };
}

export function applyApprovedActivityProposal({
  proposal,
  store,
  now = () => new Date().toISOString(),
}: {
  proposal: UnifiedChatProposal;
  store: ActivityStoreBoundary;
  now?: () => string;
}): ActivityMutationReceipt {
  assertActivityProposalCanApply(proposal.status);
  const operation = proposal.operation;
  const at = now();

  if (operation.type === 'create_activity') {
    const id = deterministicActivityId(operation.id);
    const existing = store.getActivities().find((activity) => activity.id === id);
    if (existing) {
      if (existing.title !== operation.payload.title) {
        throw new ActivityMutationConflictError('The idempotent create target no longer matches this proposal.');
      }
      return receiptFor({
        proposal,
        activity: existing,
        undoOperation: { type: 'remove_created_activity', expectedUpdatedAt: existing.updatedAt },
        appliedAt: at,
      });
    }
    const goalId = operation.payload.goalId ?? null;
    if (goalId && !store.getGoals().some((goal) => goal.id === goalId)) {
      throw new ActivityMutationConflictError('The proposed Goal is no longer available.');
    }
    const base: Activity = {
      id,
      goalId,
      title: operation.payload.title,
      type: operation.payload.type ?? 'task',
      tags: operation.payload.tags ?? [],
      status: operation.payload.status ?? 'planned',
      creationSource: 'ai',
      forceActual: {},
      createdAt: at,
      updatedAt: at,
    };
    const created = applyPatch(base, operation.payload, at);
    store.addActivity(created);
    const authoritative = store.getActivities().find((activity) => activity.id === id);
    if (!authoritative) throw new ActivityMutationConflictError('The new To-do could not be reloaded.');
    return receiptFor({
      proposal,
      activity: authoritative,
      undoOperation: { type: 'remove_created_activity', expectedUpdatedAt: authoritative.updatedAt },
      appliedAt: at,
    });
  }

  const targetId = operation.targetId;
  const current = store.getActivities().find((activity) => activity.id === targetId);
  if (!current) throw new ActivityMutationConflictError('The proposed To-do is no longer available.');
  const expectedUpdatedAt = operation.payload.expectedUpdatedAt;
  if (typeof expectedUpdatedAt !== 'string' || current.updatedAt !== expectedUpdatedAt) {
    throw new ActivityMutationConflictError('The To-do changed after this proposal was prepared.');
  }
  const { expectedUpdatedAt: _expectedUpdatedAt, ...patch } = operation.payload;
  const next = applyPatch(current, patch, at);
  store.updateActivity(targetId, () => next);
  const authoritative = store.getActivities().find((activity) => activity.id === targetId);
  if (!authoritative) throw new ActivityMutationConflictError('The updated To-do could not be reloaded.');
  return receiptFor({
    proposal,
    activity: authoritative,
    undoOperation: { type: 'restore_activity', activity: current, expectedUpdatedAt: authoritative.updatedAt },
    appliedAt: at,
  });
}

export function undoAppliedActivityProposal({
  receipt,
  store,
  now = () => new Date().toISOString(),
}: {
  receipt: ActivityMutationReceipt;
  store: ActivityStoreBoundary;
  now?: () => string;
}): ActivityMutationReceipt {
  if (receipt.status !== 'applied') {
    throw new ActivityMutationConflictError('This capability receipt is not available to undo.');
  }
  const current = store.getActivities().find((activity) => activity.id === receipt.resultingObjectId);
  if (!current || current.updatedAt !== receipt.undoOperation.expectedUpdatedAt) {
    throw new ActivityMutationConflictError('The To-do changed after apply, so Kwilt will not overwrite it during undo.');
  }
  const at = now();
  if (receipt.undoOperation.type === 'remove_created_activity') {
    store.removeActivity(current.id);
  } else {
    const activityToRestore = receipt.undoOperation.activity;
    store.updateActivity(current.id, () => ({ ...activityToRestore, updatedAt: at }));
  }
  return { ...receipt, status: 'undone', undoneAt: at };
}

export function recoverReservedActivityProposal({
  receipt,
  proposal,
  store,
}: {
  receipt: UnifiedChatMutationReceipt;
  proposal: UnifiedChatProposal;
  store: ActivityStoreBoundary;
}): ActivityMutationReceipt {
  if (receipt.status !== 'reserved' || !receipt.undoOperation) {
    throw new ActivityMutationConflictError('This capability receipt is not reserved for recovery.');
  }
  const undo = receipt.undoOperation;
  if (typeof undo.type !== 'string' || typeof undo.expectedUpdatedAt !== 'string') {
    throw new ActivityMutationConflictError('The reserved receipt is missing its recovery boundary.');
  }
  const undoOperation: ActivityUndoOperation = undo.type === 'remove_created_activity'
    ? { type: 'remove_created_activity', expectedUpdatedAt: undo.expectedUpdatedAt }
    : undo.type === 'restore_activity' && undo.activity && typeof undo.activity === 'object'
      ? { type: 'restore_activity', activity: undo.activity as Activity, expectedUpdatedAt: undo.expectedUpdatedAt }
      : (() => { throw new ActivityMutationConflictError('The reserved receipt has an unsupported recovery operation.'); })();
  const approved = { ...proposal, status: 'approved' as const };
  const existing = receipt.resultingObjectId
    ? store.getActivities().find((activity) => activity.id === receipt.resultingObjectId)
    : undefined;
  const appliedAt = receipt.appliedAt ?? undoOperation.expectedUpdatedAt;
  if (existing?.updatedAt === undoOperation.expectedUpdatedAt) {
    return receiptFor({ proposal: approved, activity: existing, undoOperation, appliedAt });
  }
  return applyApprovedActivityProposal({ proposal: approved, store, now: () => appliedAt });
}

export function hydrateActivityMutationReceipt(
  stored: UnifiedChatMutationReceipt,
): ActivityMutationReceipt | null {
  const state = stored.resultState;
  const undo = stored.undoOperation;
  const target = stored.returnTarget;
  if (stored.status !== 'applied' || !undo || !target ||
      typeof state.title !== 'string' || typeof state.status !== 'string' ||
      typeof state.updatedAt !== 'string' || typeof undo.type !== 'string' ||
      typeof undo.expectedUpdatedAt !== 'string') return null;
  let undoOperation: ActivityUndoOperation;
  if (undo.type === 'remove_created_activity') {
    undoOperation = { type: 'remove_created_activity', expectedUpdatedAt: undo.expectedUpdatedAt };
  } else if (undo.type === 'restore_activity' && undo.activity && typeof undo.activity === 'object') {
    const activity = undo.activity as Activity;
    if (typeof activity.id !== 'string' || typeof activity.title !== 'string' || typeof activity.updatedAt !== 'string') return null;
    undoOperation = { type: 'restore_activity', activity, expectedUpdatedAt: undo.expectedUpdatedAt };
  } else return null;
  return {
    proposalId: stored.proposalId,
    operationId: stored.operationId,
    idempotencyKey: stored.idempotencyKey,
    status: 'applied',
    resultingObjectId: stored.resultingObjectId ?? '',
    resultState: {
      title: state.title,
      status: state.status as Activity['status'],
      goalId: typeof state.goalId === 'string' ? state.goalId : null,
      scheduledDate: typeof state.scheduledDate === 'string' || state.scheduledDate === null ? state.scheduledDate : undefined,
      reminderAt: typeof state.reminderAt === 'string' || state.reminderAt === null ? state.reminderAt : undefined,
      estimateMinutes: typeof state.estimateMinutes === 'number' || state.estimateMinutes === null
        ? state.estimateMinutes
        : undefined,
      updatedAt: state.updatedAt,
    },
    returnTarget: target as unknown as CapabilityNativeReturnTarget,
    undoOperation,
    appliedAt: stored.appliedAt ?? stored.resultState.updatedAt as string,
    undoneAt: null,
  };
}
