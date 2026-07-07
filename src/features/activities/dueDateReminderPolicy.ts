import type { Activity } from '../../domain/types';

export const REMINDER_SOURCE_DUE_DATE_DEFAULT = 'due_date_default' as const;
export const REMINDER_SOURCE_MANUAL = 'manual' as const;

const DEFAULT_REMINDER_HOUR = 9;
const SAME_DAY_FALLBACK_HOUR = 18;
const MIN_FALLBACK_LEAD_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type DueDateReminderPatch = Pick<Activity, 'scheduledDate'> &
  Partial<Pick<Activity, 'reminderAt' | 'reminderSource'>>;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDueDateCalendarDay(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const dateKey = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateKey) {
    const year = Number(dateKey[1]);
    const month = Number(dateKey[2]);
    const day = Number(dateKey[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) return null;
  return startOfLocalDay(parsed);
}

function daysBetweenLocalDates(from: Date, to: Date): number {
  const fromStart = startOfLocalDay(from).getTime();
  const toStart = startOfLocalDay(to).getTime();
  return Math.round((toStart - fromStart) / DAY_MS);
}

export function getDefaultReminderAtForDueDate(
  scheduledDate: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const dueDay = parseDueDateCalendarDay(scheduledDate);
  if (!dueDay) return null;

  const daysUntilDue = daysBetweenLocalDates(now, dueDay);
  if (daysUntilDue < 0) return null;

  const morningOf = new Date(
    dueDay.getFullYear(),
    dueDay.getMonth(),
    dueDay.getDate(),
    DEFAULT_REMINDER_HOUR,
    0,
    0,
    0,
  );
  if (morningOf.getTime() > now.getTime()) {
    return morningOf.toISOString();
  }

  if (daysUntilDue === 0) {
    const fallback = new Date(
      dueDay.getFullYear(),
      dueDay.getMonth(),
      dueDay.getDate(),
      SAME_DAY_FALLBACK_HOUR,
      0,
      0,
      0,
    );
    if (fallback.getTime() - now.getTime() >= MIN_FALLBACK_LEAD_MS) {
      return fallback.toISOString();
    }
  }

  return null;
}

function hasManualReminderClaim(activity: Pick<Activity, 'reminderAt' | 'reminderSource'>): boolean {
  if (activity.reminderSource === REMINDER_SOURCE_MANUAL) return true;
  if (activity.reminderAt && activity.reminderSource !== REMINDER_SOURCE_DUE_DATE_DEFAULT) return true;
  return false;
}

export function applyDueDateReminderPolicy({
  activity,
  nextScheduledDate,
  now = new Date(),
}: {
  activity: Pick<Activity, 'reminderAt' | 'reminderSource'>;
  nextScheduledDate: string | null;
  now?: Date;
}): DueDateReminderPatch {
  if (!nextScheduledDate) {
    if (activity.reminderSource === REMINDER_SOURCE_DUE_DATE_DEFAULT) {
      return {
        scheduledDate: null,
        reminderAt: null,
        reminderSource: undefined,
      };
    }
    return { scheduledDate: null };
  }

  if (hasManualReminderClaim(activity)) {
    return { scheduledDate: nextScheduledDate };
  }

  const reminderAt = getDefaultReminderAtForDueDate(nextScheduledDate, now);
  if (!reminderAt) {
    return {
      scheduledDate: nextScheduledDate,
      ...(activity.reminderSource === REMINDER_SOURCE_DUE_DATE_DEFAULT
        ? { reminderAt: null, reminderSource: undefined }
        : {}),
    };
  }

  return {
    scheduledDate: nextScheduledDate,
    reminderAt,
    reminderSource: REMINDER_SOURCE_DUE_DATE_DEFAULT,
  };
}
