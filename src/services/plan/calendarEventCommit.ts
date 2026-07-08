import {
  listBusyIntervals,
  listCalendarEvents,
  type CalendarEventRef,
  type CalendarRef,
} from './calendarApi';

export type CalendarEventCommitBlock = {
  startDate: string;
  endDate: string;
};

export type CalendarEventCommitRecoveryResult =
  | { status: 'linked'; eventRef: CalendarEventRef }
  | { status: 'unlinked' }
  | { status: 'unconfirmed' };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function getCalendarCommitAlertForError(err: unknown): { title: string; message: string } | null {
  const rawValue = err instanceof Error ? err.message : asRecord(err)?.message;
  const raw = typeof rawValue === 'string' ? rawValue : '';
  const msg = (raw ?? '').trim();
  const lower = msg.toLowerCase();

  if (lower.includes('sign-in cancelled') || lower.includes('signin cancelled') || lower.includes('cancelled')) {
    return null;
  }

  if (lower.includes('missing access token') || lower.includes('unauthorized') || lower.includes('access token')) {
    return {
      title: 'Sign in required',
      message: 'Please sign in again to connect calendars and commit your plan.',
    };
  }

  if (
    lower.includes('forbidden') ||
    lower.includes('insufficient') ||
    lower.includes('permission') ||
    lower.includes('(403)') ||
    lower.includes('request failed (403)')
  ) {
    return {
      title: 'Calendar access denied',
      message:
        'Kwilt can’t write to that calendar. Try picking a different write calendar or reconnecting your calendar account in Settings.',
    };
  }

  return { title: 'Unable to commit', message: 'Please check your calendar connection and try again.' };
}

export function hasBindableCalendarEventRef(value: unknown): value is CalendarEventRef {
  const ref = asRecord(value);
  return Boolean(ref?.provider && ref?.accountId && ref?.calendarId && ref?.eventId);
}

export async function verifyCalendarEventLikelySucceeded(args: {
  block: CalendarEventCommitBlock;
  writeRef: CalendarRef;
}): Promise<boolean> {
  try {
    const start = new Date(args.block.startDate);
    const end = new Date(args.block.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    const padMs = 5 * 60 * 1000;
    const paddedStart = new Date(start.getTime() - padMs);
    const paddedEnd = new Date(end.getTime() + padMs);
    const { intervals = [] } = await listBusyIntervals({
      start: paddedStart.toISOString(),
      end: paddedEnd.toISOString(),
      readCalendarRefs: [args.writeRef],
    });
    return intervals.some((i) => {
      const s = new Date(i.start);
      const e = new Date(i.end);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
      return s < end && start < e;
    });
  } catch {
    return false;
  }
}

export async function findEventRefForCalendarBlock(args: {
  block: CalendarEventCommitBlock;
  writeRef: CalendarRef;
}): Promise<CalendarEventRef | null> {
  try {
    const start = new Date(args.block.startDate);
    const end = new Date(args.block.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const padMs = 10 * 60 * 1000;
    const windowStart = new Date(start.getTime() - padMs).toISOString();
    const windowEnd = new Date(end.getTime() + padMs).toISOString();
    const { events } = await listCalendarEvents({
      start: windowStart,
      end: windowEnd,
      readCalendarRefs: [args.writeRef],
    });
    const candidates = Array.isArray(events) ? events : [];
    const match = candidates.find((e) => {
      if (e.provider !== args.writeRef.provider) return false;
      if (e.accountId !== args.writeRef.accountId) return false;
      if (e.calendarId !== args.writeRef.calendarId) return false;
      const s = new Date(e.start);
      const en = new Date(e.end);
      if (Number.isNaN(s.getTime()) || Number.isNaN(en.getTime())) return false;
      const startDiff = Math.abs(s.getTime() - start.getTime());
      const endDiff = Math.abs(en.getTime() - end.getTime());
      return startDiff < 90_000 && endDiff < 90_000;
    });
    if (!match) return null;
    return {
      provider: match.provider,
      accountId: match.accountId,
      calendarId: match.calendarId,
      eventId: match.eventId,
    };
  } catch {
    return null;
  }
}

export async function resolveCalendarEventRefBeforeCreate(args: {
  block: CalendarEventCommitBlock;
  writeRef: CalendarRef;
  findEventRef?: (args: { block: CalendarEventCommitBlock; writeRef: CalendarRef }) => Promise<CalendarEventRef | null>;
}): Promise<{ status: 'linked'; eventRef: CalendarEventRef } | null> {
  const find = args.findEventRef ?? findEventRefForCalendarBlock;
  const existing = await find({ block: args.block, writeRef: args.writeRef });
  if (!hasBindableCalendarEventRef(existing)) return null;
  return { status: 'linked', eventRef: existing };
}

export async function resolveCalendarEventRefAfterCreate(args: {
  createResult: unknown;
  block: CalendarEventCommitBlock;
  writeRef: CalendarRef;
  verifyLikelySucceeded?: (args: { block: CalendarEventCommitBlock; writeRef: CalendarRef }) => Promise<boolean>;
  findEventRef?: (args: { block: CalendarEventCommitBlock; writeRef: CalendarRef }) => Promise<CalendarEventRef | null>;
}): Promise<CalendarEventCommitRecoveryResult> {
  const directRef = asRecord(args.createResult)?.eventRef ?? null;
  if (hasBindableCalendarEventRef(directRef)) {
    return { status: 'linked', eventRef: directRef };
  }

  const verify = args.verifyLikelySucceeded ?? verifyCalendarEventLikelySucceeded;
  const likelySucceeded = await verify({ block: args.block, writeRef: args.writeRef });
  if (!likelySucceeded) return { status: 'unconfirmed' };

  const find = args.findEventRef ?? findEventRefForCalendarBlock;
  const recovered = await find({ block: args.block, writeRef: args.writeRef });
  if (hasBindableCalendarEventRef(recovered)) {
    return { status: 'linked', eventRef: recovered };
  }

  return { status: 'unlinked' };
}
