import type { Activity, ActivityRepeatCustom } from './types';

const CLOSED_STATUSES = new Set(['done', 'skipped', 'cancelled']);

function isFiniteDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const local = new Date(year, month - 1, day, 12, 0, 0, 0);
    return isFiniteDate(local) ? local : null;
  }
  const date = new Date(value);
  return isFiniteDate(date) ? date : null;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfLocalWeek(date: Date): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetweenLocalDates(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsClamped(date: Date, months: number, desiredDay = date.getDate()): Date {
  const next = new Date(date);
  const target = new Date(
    next.getFullYear(),
    next.getMonth() + months,
    1,
    next.getHours(),
    next.getMinutes(),
    next.getSeconds(),
    next.getMilliseconds(),
  );
  target.setDate(Math.min(Math.max(1, desiredDay), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

function addYearsClamped(date: Date, years: number, desiredDay = date.getDate(), desiredMonth = date.getMonth()): Date {
  const target = new Date(
    date.getFullYear() + years,
    desiredMonth,
    1,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
  target.setDate(Math.min(Math.max(1, desiredDay), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

function positiveInterval(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;
}

function normalizeWeekdays(days: unknown, fallback: number): number[] {
  if (!Array.isArray(days)) return [fallback];
  const picked = Array.from(new Set(days))
    .filter((day): day is number => typeof day === 'number' && Number.isFinite(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
  return picked.length > 0 ? picked : [fallback];
}

function activityAnchor(activity: Activity): Date | null {
  const dateAnchor = parseDate(activity.scheduledDate) ?? parseDate(activity.reminderAt) ?? parseDate(activity.createdAt);
  if (!dateAnchor) return null;
  return copyTime(parseDate(activity.reminderAt) ?? parseDate(activity.scheduledAt), dateAnchor);
}

function copyTime(from: Date | null, to: Date): Date {
  if (!from) return to;
  const next = new Date(to);
  next.setHours(from.getHours(), from.getMinutes(), from.getSeconds(), from.getMilliseconds());
  return next;
}

function nextEveryNDays(anchor: Date, after: Date, intervalDays: number): Date {
  const step = positiveInterval(intervalDays);
  let next = new Date(anchor);
  while (startOfLocalDay(next).getTime() <= startOfLocalDay(after).getTime()) {
    next = addDays(next, step);
  }
  return next;
}

function nextWeekdays(anchor: Date, after: Date): Date {
  let next = addDays(startOfLocalDay(after), 1);
  for (let i = 0; i < 8; i += 1) {
    if (next.getDay() >= 1 && next.getDay() <= 5) return copyTime(anchor, next);
    next = addDays(next, 1);
  }
  return copyTime(anchor, next);
}

function nextWeekly(anchor: Date, after: Date, intervalWeeks: number, weekdays?: number[]): Date {
  const stepWeeks = positiveInterval(intervalWeeks);
  const pickedDays = normalizeWeekdays(weekdays, anchor.getDay());
  const anchorWeek = startOfLocalWeek(anchor);
  const afterDay = startOfLocalDay(after);

  for (let offset = 0; offset < 520; offset += 1) {
    const weekStart = addDays(anchorWeek, offset * 7);
    const weekDelta = Math.floor(daysBetweenLocalDates(anchorWeek, weekStart) / 7);
    if (weekDelta % stepWeeks !== 0) continue;
    for (const weekday of pickedDays) {
      const candidate = copyTime(anchor, addDays(weekStart, weekday));
      if (startOfLocalDay(candidate).getTime() > afterDay.getTime()) {
        return candidate;
      }
    }
  }

  return copyTime(anchor, addDays(afterDay, stepWeeks * 7));
}

function nextEveryNMonths(anchor: Date, after: Date, intervalMonths: number): Date {
  const step = positiveInterval(intervalMonths);
  const desiredDay = anchor.getDate();
  let next = new Date(anchor);
  while (startOfLocalDay(next).getTime() <= startOfLocalDay(after).getTime()) {
    next = addMonthsClamped(next, step, desiredDay);
  }
  return next;
}

function nextEveryNYears(anchor: Date, after: Date, intervalYears: number): Date {
  const step = positiveInterval(intervalYears);
  const desiredDay = anchor.getDate();
  const desiredMonth = anchor.getMonth();
  let next = new Date(anchor);
  while (startOfLocalDay(next).getTime() <= startOfLocalDay(after).getTime()) {
    next = addYearsClamped(next, step, desiredDay, desiredMonth);
  }
  return next;
}

function nextForCustom(anchor: Date, after: Date, custom: ActivityRepeatCustom | undefined): Date | null {
  if (!custom) return null;
  if (custom.cadence === 'days') return nextEveryNDays(anchor, after, custom.interval);
  if (custom.cadence === 'weeks') return nextWeekly(anchor, after, custom.interval, custom.weekdays);
  if (custom.cadence === 'months') return nextEveryNMonths(anchor, after, custom.interval);
  return nextEveryNYears(anchor, after, custom.interval);
}

export function isClosedActivityStatus(status: Activity['status']): boolean {
  return CLOSED_STATUSES.has(status);
}

export function hasRepeatSchedule(activity: Activity): boolean {
  if (!activity.repeatRule) return false;
  return activity.repeatRule !== 'custom' || Boolean(activity.repeatCustom);
}

export function getRepeatSeriesId(activity: Activity): string {
  return activity.repeatSeriesId || activity.id;
}

export function getNextOccurrenceDate(params: {
  activity: Activity;
  closedAt: Date;
}): Date | null {
  const { activity, closedAt } = params;
  if (!hasRepeatSchedule(activity)) return null;

  const anchor = activityAnchor(activity);
  if (!anchor) return null;

  const basis = activity.repeatBasis ?? 'scheduled';
  const after = basis === 'after_completion' ? closedAt : closedAt;

  switch (activity.repeatRule) {
    case 'daily':
      return nextEveryNDays(basis === 'after_completion' ? copyTime(anchor, closedAt) : anchor, after, 1);
    case 'weekdays':
      return nextWeekdays(anchor, after);
    case 'weekly':
      return nextWeekly(anchor, after, 1);
    case 'monthly':
      return nextEveryNMonths(basis === 'after_completion' ? copyTime(anchor, closedAt) : anchor, after, 1);
    case 'yearly':
      return nextEveryNYears(basis === 'after_completion' ? copyTime(anchor, closedAt) : anchor, after, 1);
    case 'custom':
      return nextForCustom(basis === 'after_completion' ? copyTime(anchor, closedAt) : anchor, after, activity.repeatCustom);
    default:
      return null;
  }
}

export function buildNextRecurringActivity(params: {
  activity: Activity;
  closedAtIso: string;
}): Activity | null {
  const { activity, closedAtIso } = params;
  const closedAt = parseDate(closedAtIso);
  if (!closedAt) return null;
  const nextDate = getNextOccurrenceDate({ activity, closedAt });
  if (!nextDate) return null;

  const seriesId = getRepeatSeriesId(activity);
  const nextDateKey = localDateKey(nextDate);
  const nextReminderAt = activity.reminderAt ? copyTime(parseDate(activity.reminderAt), nextDate).toISOString() : null;
  const nextScheduledAt = activity.scheduledAt ? copyTime(parseDate(activity.scheduledAt), nextDate).toISOString() : null;
  const nextSteps = activity.steps?.map((step) => ({ ...step, completedAt: null })) ?? activity.steps;

  return {
    ...activity,
    id: `activity-repeat-${seriesId}-${nextDateKey}`,
    repeatSeriesId: seriesId,
    repeatBasis: activity.repeatBasis ?? 'scheduled',
    repeatCreatedFromActivityId: activity.id,
    scheduledDate: activity.scheduledDate ? nextDateKey : activity.scheduledDate,
    scheduledAt: nextScheduledAt,
    reminderAt: nextReminderAt,
    status: 'planned',
    completedAt: null,
    startedAt: null,
    actualMinutes: null,
    steps: nextSteps,
    createdAt: closedAtIso,
    updatedAt: closedAtIso,
  };
}

export function shouldAdvanceRecurringActivity(params: {
  prev: Activity;
  next: Activity;
}): boolean {
  const { prev, next } = params;
  if (!hasRepeatSchedule(prev)) return false;
  if (isClosedActivityStatus(prev.status)) return false;
  return next.status === 'done' || next.status === 'skipped';
}

export function describeRepeatLifecycle(activity: Pick<Activity, 'repeatRule' | 'repeatCustom' | 'repeatBasis'>): string | null {
  if (!activity.repeatRule) return null;
  const basis = activity.repeatBasis ?? 'scheduled';
  const lead =
    basis === 'after_completion'
      ? 'Repeats after you complete or skip it.'
      : 'Kwilt shows one copy at a time.';
  return `${lead} Missed copies will not pile up.`;
}
