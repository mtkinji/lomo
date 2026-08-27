import type { Activity, ActivityCalendarBinding } from '../../domain/types';
import {
  type CalendarEventRef,
} from '../../services/plan/calendarApi';
import {
  DEFAULT_PLAN_CALENDAR_ACTION_BOUNDARY,
  PlanActionUnconfirmedError,
  removePlanCalendarSession,
  reschedulePlanCalendarSession,
  schedulePlanCalendarSession,
  type PlanCalendarActionBoundary,
} from '../../capabilities/plan/actions/planActions';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

type PlanProposal = Extract<UnifiedChatProposal, { capabilityId: 'plan' }>;

export type PlanStoreBoundary = {
  getActivities: () => readonly Activity[];
  updateActivity: (id: string, updater: (activity: Activity) => Activity) => void;
  addDailyPlanCommitment: (dateKey: string, activityId: string) => void;
  removeDailyPlanCommitment: (dateKey: string, activityId: string) => void;
};

export type PlanCalendarBoundary = PlanCalendarActionBoundary;

const DEFAULT_CALENDAR = DEFAULT_PLAN_CALENDAR_ACTION_BOUNDARY;

export type PlanUndoOperation =
  | {
      type: 'delete_created_plan_chunk';
      groupId: string;
      chunkId: string;
      eventRef: CalendarEventRef;
      targetDateKey: string;
      expectedUpdatedAt: string;
    }
  | {
      type: 'delete_created_plan_event';
      previousActivity: Activity;
      eventRef: CalendarEventRef;
      targetDateKey: string;
      expectedUpdatedAt: string;
    }
  | {
      type: 'restore_moved_plan_event';
      previousActivity: Activity;
      binding: ActivityCalendarBinding;
      previousStartDate: string;
      previousEndDate: string;
      previousTargetDateKey: string;
      targetDateKey: string;
      expectedUpdatedAt: string;
    }
  | {
      type: 'recreate_removed_plan_event';
      previousActivity: Activity;
      binding: Extract<ActivityCalendarBinding, { kind: 'provider' }>;
      previousStartDate: string;
      previousEndDate: string;
      previousTargetDateKey: string;
      expectedUpdatedAt: string;
    };

export type PlanMutationReceipt = {
  proposalId: string;
  operationId: string;
  idempotencyKey: string;
  resultingObjectId: string;
  resultState: {
    title: string;
    scheduledAt: string | null;
    targetDateKey: string;
    eventId: string;
    provider: CalendarEventRef['provider'];
    accountId: string;
    calendarId: string;
    updatedAt: string;
  };
  returnTarget: Record<string, unknown>;
  undoOperation: PlanUndoOperation;
  appliedAt: string;
};

export class PlanMutationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanMutationConflictError';
  }
}

export class PlanMutationUnconfirmedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanMutationUnconfirmedError';
  }
}

function planReturnTarget(dateKey: string): Record<string, unknown> {
  return {
    capabilityId: 'plan',
    object: { type: 'plan_day', id: dateKey },
    label: 'Review in Plan',
    route: {
      name: 'MainTabs',
      params: { screen: 'PlanTab', params: { dateKey } },
    },
  };
}

function providerEventRef(binding: ActivityCalendarBinding): CalendarEventRef | null {
  return binding.kind === 'provider'
    ? {
        provider: binding.provider, accountId: binding.accountId,
        calendarId: binding.calendarId, eventId: binding.eventId,
      }
    : null;
}

function clearedPlanActivity(activity: Activity, updatedAt: string): Activity {
  return {
    ...activity,
    scheduledAt: null,
    calendarBinding: null,
    scheduledProvider: null,
    scheduledProviderAccountId: null,
    scheduledProviderCalendarId: null,
    scheduledProviderEventId: null,
    updatedAt,
  };
}

export async function applyApprovedPlanProposal({
  proposal,
  store,
  calendar = DEFAULT_CALENDAR,
  now = () => new Date().toISOString(),
  allowAlreadyApplied = false,
}: {
  proposal: PlanProposal;
  store: PlanStoreBoundary;
  calendar?: PlanCalendarBoundary;
  now?: () => string;
  allowAlreadyApplied?: boolean;
}): Promise<PlanMutationReceipt> {
  if (proposal.status !== 'approved') {
    throw new PlanMutationConflictError('This Plan recommendation is not approved.');
  }
  const current = store.getActivities().find((activity) => activity.id === proposal.operation.payload.activityId);
  if (!current) throw new PlanMutationConflictError('This Activity is no longer available.');

  if (proposal.operation.type === 'schedule_activity_chunk') {
    const { payload } = proposal.operation;
    const bindings = current.calendarChunkBindings ?? [];
    const alreadyLinked = bindings.find((candidate) =>
      candidate.groupId === payload.groupId && candidate.chunkId === payload.chunkId);
    const latestBinding = bindings[bindings.length - 1];
    const followsOwnGroup = Boolean(latestBinding) &&
      latestBinding.groupId === payload.groupId &&
      latestBinding.activityUpdatedAt === current.updatedAt;
    if (!alreadyLinked && current.updatedAt !== payload.expectedUpdatedAt && !followsOwnGroup) {
      throw new PlanMutationConflictError('This Activity changed while its calendar chunks were being prepared.');
    }
    let eventRef = alreadyLinked
      ? {
          provider: alreadyLinked.binding.provider,
          accountId: alreadyLinked.binding.accountId,
          calendarId: alreadyLinked.binding.calendarId,
          eventId: alreadyLinked.binding.eventId,
        }
      : null;
    if (!eventRef) {
      try {
        const receipt = await schedulePlanCalendarSession({
          operationId: 'plan.schedule_chunks',
          title: payload.title,
          startDate: payload.startDate,
          endDate: payload.endDate,
          writeCalendarRef: payload.writeCalendarRef,
          confirmed: true,
        }, calendar);
        eventRef = receipt.result.eventRef;
      } catch {
        throw new PlanMutationUnconfirmedError('Kwilt could not confirm this calendar chunk.');
      }
    }
    const appliedAt = alreadyLinked ? current.updatedAt : now();
    if (!alreadyLinked) {
      store.updateActivity(current.id, (activity) => ({
        ...activity,
        calendarChunkBindings: [
          ...(activity.calendarChunkBindings ?? []),
          {
            groupId: payload.groupId, chunkId: payload.chunkId, title: payload.title,
            startDate: payload.startDate, endDate: payload.endDate,
            targetDateKey: payload.targetDateKey,
            binding: { kind: 'provider', ...eventRef!, createdBy: 'plan' },
            activityUpdatedAt: appliedAt,
          },
        ],
        updatedAt: appliedAt,
      }));
    }
    store.addDailyPlanCommitment(payload.targetDateKey, current.id);
    return {
      proposalId: proposal.id, operationId: proposal.operation.id,
      idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: current.id,
      resultState: {
        title: payload.title, scheduledAt: payload.startDate, targetDateKey: payload.targetDateKey,
        eventId: eventRef.eventId, provider: eventRef.provider, accountId: eventRef.accountId,
        calendarId: eventRef.calendarId, updatedAt: appliedAt,
      },
      returnTarget: planReturnTarget(payload.targetDateKey),
      undoOperation: {
        type: 'delete_created_plan_chunk', groupId: payload.groupId, chunkId: payload.chunkId,
        eventRef, targetDateKey: payload.targetDateKey, expectedUpdatedAt: appliedAt,
      },
      appliedAt,
    };
  }

  if (proposal.operation.type === 'reschedule_activity') {
    const { payload } = proposal.operation;
    const alreadyMoved = current.scheduledAt === payload.startDate && Boolean(current.calendarBinding);
    if (!alreadyMoved && current.updatedAt !== payload.expectedUpdatedAt) {
      throw new PlanMutationConflictError('This Activity changed after the move was prepared.');
    }
    const binding = current.calendarBinding;
    if (!binding) throw new PlanMutationConflictError('This calendar block is no longer managed by Kwilt.');
    if (!alreadyMoved) {
      try {
        await reschedulePlanCalendarSession({
          binding,
          startDate: payload.startDate,
          endDate: payload.endDate,
          confirmed: true,
        }, calendar);
      } catch {
        throw new PlanMutationUnconfirmedError('Kwilt could not confirm the calendar move.');
      }
    }
    const appliedAt = alreadyMoved ? current.updatedAt : now();
    if (!alreadyMoved) {
      store.updateActivity(current.id, (activity) => ({ ...activity, scheduledAt: payload.startDate, updatedAt: appliedAt }));
    }
    if (payload.previousTargetDateKey !== payload.targetDateKey) {
      store.removeDailyPlanCommitment(payload.previousTargetDateKey, current.id);
    }
    store.addDailyPlanCommitment(payload.targetDateKey, current.id);
    const ref = providerEventRef(binding);
    if (!ref) throw new PlanMutationUnconfirmedError('Device-calendar moves must finish in Plan.');
    return {
      proposalId: proposal.id, operationId: proposal.operation.id,
      idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: current.id,
      resultState: {
        title: current.title, scheduledAt: payload.startDate, targetDateKey: payload.targetDateKey,
        eventId: ref.eventId, provider: ref.provider, accountId: ref.accountId,
        calendarId: ref.calendarId, updatedAt: appliedAt,
      },
      returnTarget: planReturnTarget(payload.targetDateKey), appliedAt,
      undoOperation: {
        type: 'restore_moved_plan_event',
        previousActivity: alreadyMoved
          ? { ...current, scheduledAt: payload.previousStartDate, updatedAt: payload.expectedUpdatedAt }
          : current,
        binding,
        previousStartDate: payload.previousStartDate, previousEndDate: payload.previousEndDate,
        previousTargetDateKey: payload.previousTargetDateKey, targetDateKey: payload.targetDateKey,
        expectedUpdatedAt: appliedAt,
      },
    };
  }

  if (proposal.operation.type === 'remove_activity_from_plan') {
    const { payload } = proposal.operation;
    const alreadyRemoved = current.scheduledAt == null && current.calendarBinding == null;
    if (alreadyRemoved && !allowAlreadyApplied) {
      throw new PlanMutationConflictError('This Activity is already absent from Plan.');
    }
    if (!alreadyRemoved && current.updatedAt !== payload.expectedUpdatedAt) {
      throw new PlanMutationConflictError('This Activity changed after removal was prepared.');
    }
    const binding = alreadyRemoved ? payload.previousBinding : current.calendarBinding;
    if (!binding || binding.kind !== 'provider') {
      throw new PlanMutationConflictError('This provider calendar block is no longer managed by Kwilt.');
    }
    if (!alreadyRemoved) {
      try {
        await removePlanCalendarSession({ binding, confirmed: true }, calendar);
      } catch {
        throw new PlanMutationUnconfirmedError('Kwilt could not confirm calendar removal.');
      }
    }
    const appliedAt = alreadyRemoved ? current.updatedAt : now();
    if (!alreadyRemoved) {
      store.updateActivity(current.id, (activity) => clearedPlanActivity(activity, appliedAt));
    }
    store.removeDailyPlanCommitment(payload.previousTargetDateKey, current.id);
    return {
      proposalId: proposal.id, operationId: proposal.operation.id,
      idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: current.id,
      resultState: {
        title: current.title, scheduledAt: null, targetDateKey: payload.previousTargetDateKey,
        eventId: binding.eventId, provider: binding.provider, accountId: binding.accountId,
        calendarId: binding.calendarId, updatedAt: appliedAt,
      },
      returnTarget: planReturnTarget(payload.previousTargetDateKey), appliedAt,
      undoOperation: {
        type: 'recreate_removed_plan_event',
        previousActivity: alreadyRemoved
          ? {
              ...current, scheduledAt: payload.previousStartDate, calendarBinding: payload.previousBinding,
              scheduledProvider: payload.previousBinding.provider,
              scheduledProviderAccountId: payload.previousBinding.accountId,
              scheduledProviderCalendarId: payload.previousBinding.calendarId,
              scheduledProviderEventId: payload.previousBinding.eventId,
              updatedAt: payload.expectedUpdatedAt,
            }
          : current,
        binding,
        previousStartDate: payload.previousStartDate, previousEndDate: payload.previousEndDate,
        previousTargetDateKey: payload.previousTargetDateKey, expectedUpdatedAt: appliedAt,
      },
    };
  }

  const { payload } = proposal.operation;
  const alreadyLinked = current.scheduledAt === payload.startDate &&
    current.scheduledProvider === payload.writeCalendarRef.provider &&
    current.scheduledProviderAccountId === payload.writeCalendarRef.accountId &&
    current.scheduledProviderCalendarId === payload.writeCalendarRef.calendarId &&
    Boolean(current.scheduledProviderEventId);
  if (!alreadyLinked && current.updatedAt !== payload.expectedUpdatedAt) {
    throw new PlanMutationConflictError('This Activity changed after the recommendation was prepared.');
  }

  const writeRef = payload.writeCalendarRef;
  let eventRef: CalendarEventRef | null = alreadyLinked
    ? {
        ...writeRef,
        eventId: current.scheduledProviderEventId!,
      }
    : null;

  if (!eventRef) {
    try {
      const receipt = await schedulePlanCalendarSession({
        operationId: 'plan.schedule_activity',
        title: current.title,
        startDate: payload.startDate,
        endDate: payload.endDate,
        writeCalendarRef: writeRef,
        confirmed: true,
      }, calendar);
      eventRef = receipt.result.eventRef;
    } catch (error) {
      throw new PlanMutationUnconfirmedError(
        error instanceof PlanActionUnconfirmedError && error.recoveryStatus === 'unlinked'
          ? 'The calendar block may exist, but Kwilt could not link it safely.'
          : 'Kwilt could not confirm the calendar block.',
      );
    }
  }

  const appliedAt = now();
  if (!alreadyLinked) {
    store.updateActivity(current.id, (activity) => ({
      ...activity,
      scheduledAt: payload.startDate,
      calendarBinding: {
        kind: 'provider',
        provider: eventRef!.provider,
        accountId: eventRef!.accountId,
        calendarId: eventRef!.calendarId,
        eventId: eventRef!.eventId,
        createdBy: 'plan',
      },
      scheduledProvider: eventRef!.provider,
      scheduledProviderAccountId: eventRef!.accountId,
      scheduledProviderCalendarId: eventRef!.calendarId,
      scheduledProviderEventId: eventRef!.eventId,
      updatedAt: appliedAt,
    }));
  }
  store.addDailyPlanCommitment(payload.targetDateKey, current.id);
  const authoritative = store.getActivities().find((activity) => activity.id === current.id) ?? current;
  const previousActivity = alreadyLinked
    ? clearedPlanActivity(current, payload.expectedUpdatedAt)
    : current;
  return {
    proposalId: proposal.id,
    operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey,
    resultingObjectId: current.id,
    resultState: {
      title: authoritative.title,
      scheduledAt: payload.startDate,
      targetDateKey: payload.targetDateKey,
      eventId: eventRef.eventId,
      provider: eventRef.provider,
      accountId: eventRef.accountId,
      calendarId: eventRef.calendarId,
      updatedAt: authoritative.updatedAt,
    },
    returnTarget: planReturnTarget(payload.targetDateKey),
    undoOperation: {
      type: 'delete_created_plan_event', previousActivity, eventRef,
      targetDateKey: payload.targetDateKey, expectedUpdatedAt: authoritative.updatedAt,
    },
    appliedAt,
  };
}

export async function undoAppliedPlanProposal({
  receipt,
  store,
  calendar = DEFAULT_CALENDAR,
  now = () => new Date().toISOString(),
}: {
  receipt: PlanMutationReceipt;
  store: PlanStoreBoundary;
  calendar?: PlanCalendarBoundary;
  now?: () => string;
}): Promise<{ undoneAt: string }> {
  const undo = receipt.undoOperation;
  const current = store.getActivities().find((activity) => activity.id === receipt.resultingObjectId);
  if (!current) {
    throw new PlanMutationConflictError('The Activity is no longer available for undo.');
  }
  if (undo.type === 'delete_created_plan_chunk') {
    const bindings = current.calendarChunkBindings ?? [];
    const target = bindings.find((candidate) =>
      candidate.groupId === undo.groupId && candidate.chunkId === undo.chunkId);
    const latest = bindings[bindings.length - 1];
    if (!target || !latest || latest.activityUpdatedAt !== current.updatedAt) {
      throw new PlanMutationConflictError('The Activity changed after chunk scheduling, so Kwilt will not overwrite it during undo.');
    }
    await removePlanCalendarSession({
      binding: { kind: 'provider', ...undo.eventRef, createdBy: 'plan' },
      confirmed: true,
    }, calendar);
    const undoneAt = now();
    const remaining = bindings.filter((candidate) => candidate !== target);
    const nextBindings = remaining.map((candidate, index) => index === remaining.length - 1
      ? { ...candidate, activityUpdatedAt: undoneAt }
      : candidate);
    store.updateActivity(current.id, (activity) => ({
      ...activity, calendarChunkBindings: nextBindings, updatedAt: undoneAt,
    }));
    if (!remaining.some((candidate) => candidate.targetDateKey === undo.targetDateKey)) {
      store.removeDailyPlanCommitment(undo.targetDateKey, current.id);
    }
    return { undoneAt };
  }
  if (current.updatedAt !== undo.expectedUpdatedAt) {
    throw new PlanMutationConflictError('The Activity changed after apply, so Kwilt will not overwrite it during undo.');
  }
  const undoneAt = now();
  if (undo.type === 'delete_created_plan_event') {
    await removePlanCalendarSession({
      binding: { kind: 'provider', ...undo.eventRef, createdBy: 'plan' },
      confirmed: true,
    }, calendar);
    store.updateActivity(current.id, () => ({ ...undo.previousActivity, updatedAt: undoneAt }));
    store.removeDailyPlanCommitment(undo.targetDateKey, current.id);
    return { undoneAt };
  }
  if (undo.type === 'restore_moved_plan_event') {
    await reschedulePlanCalendarSession({
      binding: undo.binding,
      startDate: undo.previousStartDate,
      endDate: undo.previousEndDate,
      confirmed: true,
    }, calendar);
    store.updateActivity(current.id, () => ({ ...undo.previousActivity, updatedAt: undoneAt }));
    if (undo.targetDateKey !== undo.previousTargetDateKey) {
      store.removeDailyPlanCommitment(undo.targetDateKey, current.id);
    }
    store.addDailyPlanCommitment(undo.previousTargetDateKey, current.id);
    return { undoneAt };
  }

  const writeRef = {
    provider: undo.binding.provider,
    accountId: undo.binding.accountId,
    calendarId: undo.binding.calendarId,
  } as const;
  try {
    const actionReceipt = await schedulePlanCalendarSession({
      operationId: 'plan.schedule_activity',
      title: undo.previousActivity.title,
      startDate: undo.previousStartDate,
      endDate: undo.previousEndDate,
      writeCalendarRef: writeRef,
      confirmed: true,
    }, calendar);
    const eventRef = actionReceipt.result.eventRef;
    store.updateActivity(current.id, () => ({
      ...undo.previousActivity,
      calendarBinding: { kind: 'provider', ...eventRef, createdBy: 'plan' },
      scheduledProvider: eventRef.provider,
      scheduledProviderAccountId: eventRef.accountId,
      scheduledProviderCalendarId: eventRef.calendarId,
      scheduledProviderEventId: eventRef.eventId,
      updatedAt: undoneAt,
    }));
  } catch {
    throw new PlanMutationUnconfirmedError('Kwilt could not confirm recreation of the removed calendar block.');
  }
  store.addDailyPlanCommitment(undo.previousTargetDateKey, current.id);
  return { undoneAt };
}

export function hydratePlanMutationReceipt(stored: UnifiedChatMutationReceipt): PlanMutationReceipt | null {
  const undo = stored.undoOperation as Partial<PlanUndoOperation> | null;
  const state = stored.resultState;
  if (
    stored.capabilityId !== 'plan' || stored.status !== 'applied' || !undo ||
    typeof undo.type !== 'string' || typeof undo.expectedUpdatedAt !== 'string' ||
    typeof state.title !== 'string' ||
    (typeof state.scheduledAt !== 'string' && state.scheduledAt !== null) ||
    typeof state.targetDateKey !== 'string' || typeof state.eventId !== 'string' ||
    (state.provider !== 'google' && state.provider !== 'microsoft') ||
    typeof state.accountId !== 'string' || typeof state.calendarId !== 'string' ||
    typeof state.updatedAt !== 'string'
  ) return null;
  if (!['delete_created_plan_chunk', 'delete_created_plan_event', 'restore_moved_plan_event', 'recreate_removed_plan_event'].includes(undo.type)) {
    return null;
  }
  if (undo.type === 'delete_created_plan_chunk') {
    const eventRef = undo.eventRef as Partial<CalendarEventRef> | undefined;
    if (
      typeof undo.groupId !== 'string' || typeof undo.chunkId !== 'string' ||
      typeof undo.targetDateKey !== 'string' || !eventRef ||
      (eventRef.provider !== 'google' && eventRef.provider !== 'microsoft') ||
      typeof eventRef.accountId !== 'string' || typeof eventRef.calendarId !== 'string' ||
      typeof eventRef.eventId !== 'string'
    ) return null;
  }
  return {
    proposalId: stored.proposalId,
    operationId: stored.operationId,
    idempotencyKey: stored.idempotencyKey,
    resultingObjectId: stored.resultingObjectId ?? '',
    resultState: {
      title: state.title,
      scheduledAt: state.scheduledAt,
      targetDateKey: state.targetDateKey,
      eventId: state.eventId,
      provider: state.provider,
      accountId: state.accountId,
      calendarId: state.calendarId,
      updatedAt: state.updatedAt,
    },
    returnTarget: stored.returnTarget ?? {},
    undoOperation: undo as PlanUndoOperation,
    appliedAt: stored.appliedAt ?? state.updatedAt,
  };
}
