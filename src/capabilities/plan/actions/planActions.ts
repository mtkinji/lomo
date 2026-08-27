import type { ActivityCalendarBinding } from '../../../domain/types';
import {
  createCalendarEvent,
  type CalendarEventRef,
  type CalendarRef,
} from '../../../services/plan/calendarApi';
import {
  resolveCalendarEventRefAfterCreate,
  resolveCalendarEventRefBeforeCreate,
  type CalendarEventCommitRecoveryResult,
} from '../../../services/plan/calendarEventCommit';
import { deleteManagedEvent, moveManagedEvent } from '../../../services/calendar/managedEvents';

export type PlanCalendarActionBoundary = {
  resolveBeforeCreate: (args: {
    block: { startDate: string; endDate: string };
    writeRef: CalendarRef;
  }) => Promise<{ status: 'linked'; eventRef: CalendarEventRef } | null>;
  createEvent: typeof createCalendarEvent;
  resolveAfterCreate: (args: {
    createResult: unknown;
    block: { startDate: string; endDate: string };
    writeRef: CalendarRef;
  }) => Promise<CalendarEventCommitRecoveryResult>;
  moveEvent: (args: {
    binding: ActivityCalendarBinding;
    start: Date;
    end: Date;
  }) => Promise<void>;
  deleteEvent: (binding: ActivityCalendarBinding) => Promise<void>;
};

export const DEFAULT_PLAN_CALENDAR_ACTION_BOUNDARY: PlanCalendarActionBoundary = {
  resolveBeforeCreate: resolveCalendarEventRefBeforeCreate,
  createEvent: createCalendarEvent,
  resolveAfterCreate: resolveCalendarEventRefAfterCreate,
  moveEvent: moveManagedEvent,
  deleteEvent: deleteManagedEvent,
};

export type PlanCalendarActionReceipt<Result> = {
  operationId: 'plan.schedule_activity' | 'plan.schedule_chunks' | 'plan.reschedule_activity' | 'plan.remove_activity';
  status: 'completed';
  resultRefs: readonly [{ kind: 'calendar_event'; id: string }];
  reversible: true;
  result: Result;
};

export class PlanActionConfirmationError extends Error {
  constructor() {
    super('This Plan calendar change requires explicit confirmation.');
    this.name = 'PlanActionConfirmationError';
  }
}

export class PlanActionUnconfirmedError extends Error {
  readonly recoveryStatus: Exclude<CalendarEventCommitRecoveryResult['status'], 'linked'>;
  readonly originalError: unknown;

  constructor(
    recoveryStatus: Exclude<CalendarEventCommitRecoveryResult['status'], 'linked'>,
    originalError: unknown = null,
  ) {
    super(recoveryStatus === 'unlinked'
      ? 'The calendar block may exist, but Kwilt could not link it safely.'
      : 'Kwilt could not confirm the calendar block.');
    this.name = 'PlanActionUnconfirmedError';
    this.recoveryStatus = recoveryStatus;
    this.originalError = originalError;
  }
}

function assertConfirmed(confirmed: boolean): void {
  if (!confirmed) throw new PlanActionConfirmationError();
}

function eventRefId(ref: CalendarEventRef): string {
  return `${ref.provider}:${ref.accountId}:${ref.calendarId}:${ref.eventId}`;
}

function bindingRefId(binding: ActivityCalendarBinding): string {
  return binding.kind === 'provider'
    ? eventRefId(binding)
    : `device:${binding.calendarId}:${binding.eventId}`;
}

export async function schedulePlanCalendarSession(
  input: {
    operationId: 'plan.schedule_activity' | 'plan.schedule_chunks';
    title: string;
    startDate: string;
    endDate: string;
    writeCalendarRef: CalendarRef;
    confirmed: boolean;
  },
  calendar: PlanCalendarActionBoundary = DEFAULT_PLAN_CALENDAR_ACTION_BOUNDARY,
): Promise<PlanCalendarActionReceipt<{ eventRef: CalendarEventRef; recovered: boolean }>> {
  assertConfirmed(input.confirmed);
  const block = { startDate: input.startDate, endDate: input.endDate };
  const existing = await calendar.resolveBeforeCreate({ block, writeRef: input.writeCalendarRef });
  if (existing?.status === 'linked') {
    return {
      operationId: input.operationId,
      status: 'completed',
      resultRefs: [{ kind: 'calendar_event', id: eventRefId(existing.eventRef) }],
      reversible: true,
      result: { eventRef: existing.eventRef, recovered: true },
    };
  }

  let createResult: unknown = null;
  let createError: unknown = null;
  try {
    createResult = await calendar.createEvent({
      title: input.title,
      start: input.startDate,
      end: input.endDate,
      writeCalendarRef: input.writeCalendarRef,
    });
  } catch (error) {
    createResult = null;
    createError = error;
  }
  const recovered = await calendar.resolveAfterCreate({
    createResult,
    block,
    writeRef: input.writeCalendarRef,
  });
  if (recovered.status !== 'linked') throw new PlanActionUnconfirmedError(recovered.status, createError);
  return {
    operationId: input.operationId,
    status: 'completed',
    resultRefs: [{ kind: 'calendar_event', id: eventRefId(recovered.eventRef) }],
    reversible: true,
    result: { eventRef: recovered.eventRef, recovered: createResult == null },
  };
}

export async function reschedulePlanCalendarSession(
  input: {
    binding: ActivityCalendarBinding;
    startDate: string;
    endDate: string;
    confirmed: boolean;
  },
  calendar: PlanCalendarActionBoundary = DEFAULT_PLAN_CALENDAR_ACTION_BOUNDARY,
): Promise<PlanCalendarActionReceipt<{ binding: ActivityCalendarBinding; startDate: string; endDate: string }>> {
  assertConfirmed(input.confirmed);
  await calendar.moveEvent({
    binding: input.binding,
    start: new Date(input.startDate),
    end: new Date(input.endDate),
  });
  return {
    operationId: 'plan.reschedule_activity',
    status: 'completed',
    resultRefs: [{ kind: 'calendar_event', id: bindingRefId(input.binding) }],
    reversible: true,
    result: { binding: input.binding, startDate: input.startDate, endDate: input.endDate },
  };
}

export async function removePlanCalendarSession(
  input: { binding: ActivityCalendarBinding; confirmed: boolean },
  calendar: PlanCalendarActionBoundary = DEFAULT_PLAN_CALENDAR_ACTION_BOUNDARY,
): Promise<PlanCalendarActionReceipt<{ binding: ActivityCalendarBinding }>> {
  assertConfirmed(input.confirmed);
  await calendar.deleteEvent(input.binding);
  return {
    operationId: 'plan.remove_activity',
    status: 'completed',
    resultRefs: [{ kind: 'calendar_event', id: bindingRefId(input.binding) }],
    reversible: true,
    result: { binding: input.binding },
  };
}
