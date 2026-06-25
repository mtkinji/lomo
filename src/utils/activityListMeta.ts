import type { Activity } from '../domain/types';

export type ActivityMetaLeadingIconName = 'today' | 'bell' | 'paperclip';
export type ActivityMetaTone = 'urgent' | 'today' | 'tomorrow' | 'future';

/**
 * Checks if the given ISO date string is today (local timezone).
 */
export function isDateToday(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) return false;
  const date = parseActivityCalendarDate(iso);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function parseActivityCalendarDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(value);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetweenLocalDates(date: Date, now: Date): number {
  const targetStart = startOfLocalDay(date).getTime();
  const nowStart = startOfLocalDay(now).getTime();
  return Math.round((targetStart - nowStart) / 86_400_000);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getDecisionDay(date: Date, now: Date): { label: string; tone: ActivityMetaTone } {
  const days = daysBetweenLocalDates(date, now);
  if (days < 0) return { label: 'Past due', tone: 'urgent' };
  if (days === 0) return { label: 'Today', tone: 'today' };
  if (days === 1) return { label: 'Tomorrow', tone: 'tomorrow' };
  return { label: formatShortDate(date), tone: 'future' };
}

function formatActivityTimingLabel(activity: Activity, now: Date): { labels: string[]; tone?: ActivityMetaTone } {
  const scheduledDate = activity.scheduledDate ? parseActivityCalendarDate(activity.scheduledDate) : null;
  const reminderDate = activity.reminderAt ? new Date(activity.reminderAt) : null;
  const timingParts: string[] = [];
  let tone: ActivityMetaTone | undefined;

  if (scheduledDate) {
    const due = getDecisionDay(scheduledDate, now);
    tone = due.tone;
    timingParts.push(due.label);
  }

  if (reminderDate && !scheduledDate) {
    const reminder = getDecisionDay(reminderDate, now);
    tone = tone ?? reminder.tone;
    timingParts.push(reminder.label);
  }

  return { labels: timingParts, tone };
}

function formatCompactEstimate(minutes: number): string {
  const roundedMinutes = Math.round(minutes);
  if (roundedMinutes < 60) return `~${roundedMinutes} min`;
  if (roundedMinutes <= 120 && roundedMinutes !== 60) return `~${roundedMinutes} min`;

  const hours = roundedMinutes / 60;
  const compactHours = Number.isInteger(hours) ? String(hours) : Number(hours.toFixed(2)).toString();
  return `~${compactHours} hr`;
}

export function buildActivityListMeta(args: {
  activity: Activity;
  /**
   * Current time for relative timing labels. Defaults to now; injectable for tests.
   */
  now?: Date;
  /**
   * Optional contextual label (e.g. parent goal title) to match the Activities list metadata row.
   * Ignored by the decision-row metadata; kept for call-site compatibility.
   */
  goalTitle?: string;
}): {
  meta?: string;
  metaTone?: ActivityMetaTone;
  estimateMeta?: string;
  /**
   * Legacy single-leading-icon support (kept for backward compatibility).
   */
  metaLeadingIconName?: ActivityMetaLeadingIconName;
  /**
   * Preferred: multiple leading icons (e.g. calendar/bell + paperclip).
   */
  metaLeadingIconNames?: ActivityMetaLeadingIconName[];
  /**
   * True when the activity's due date is today (local timezone).
   * Use this to apply visual emphasis (e.g. red color) to the due date.
   */
  isDueToday?: boolean;
} {
  const { activity, now = new Date() } = args;

  const timing = formatActivityTimingLabel(activity, now);
  const meta = timing.labels.length > 0 ? timing.labels.join(' · ') : undefined;
  const estimateMeta =
    typeof activity.estimateMinutes === 'number' && Number.isFinite(activity.estimateMinutes) && activity.estimateMinutes > 0
      ? formatCompactEstimate(activity.estimateMinutes)
      : undefined;

  // Check if the scheduled due date is today
  const scheduledDate = activity.scheduledDate ? parseActivityCalendarDate(activity.scheduledDate) : null;
  const isDueToday = scheduledDate ? daysBetweenLocalDates(scheduledDate, now) <= 0 : false;

  return {
    meta,
    metaTone: meta ? timing.tone : undefined,
    estimateMeta,
    metaLeadingIconName: undefined,
    metaLeadingIconNames: undefined,
    isDueToday: isDueToday || undefined,
  };
}
