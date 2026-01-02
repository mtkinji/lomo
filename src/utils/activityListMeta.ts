import type { Activity } from '../domain/types';

export type ActivityMetaLeadingIconName = 'today' | 'bell' | 'paperclip';

function formatActivityMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs} hr${hrs === 1 ? '' : 's'}`;
  return `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min`;
}

function formatActivityRepeatRule(rule: Activity['repeatRule'] | undefined): string | null {
  if (!rule) return null;
  return rule === 'weekdays' ? 'Weekdays' : rule.charAt(0).toUpperCase() + rule.slice(1);
}

function formatActivityDueDateLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatActivityReminderLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;

  const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${day} ${time}`;
}

export function buildActivityListMeta(args: {
  activity: Activity;
  /**
   * Optional contextual label (e.g. parent goal title) to match the Activities list metadata row.
   */
  goalTitle?: string;
}): {
  meta?: string;
  /**
   * Legacy single-leading-icon support (kept for backward compatibility).
   */
  metaLeadingIconName?: ActivityMetaLeadingIconName;
  /**
   * Preferred: multiple leading icons (e.g. calendar/bell + paperclip).
   */
  metaLeadingIconNames?: ActivityMetaLeadingIconName[];
} {
  const { activity, goalTitle } = args;

  const parts: string[] = [];

  // Scheduling / effort metadata (these are what quick-add sets today).
  if (activity.scheduledDate) {
    parts.push(formatActivityDueDateLabel(activity.scheduledDate));
  }
  if (activity.reminderAt) {
    parts.push(formatActivityReminderLabel(activity.reminderAt));
  }
  if (activity.estimateMinutes != null) {
    parts.push(formatActivityMinutes(activity.estimateMinutes));
  }
  const repeatLabel = formatActivityRepeatRule(activity.repeatRule);
  if (repeatLabel) {
    parts.push(repeatLabel);
  }

  // Contextual metadata.
  if (activity.phase) {
    parts.push(activity.phase);
  }
  if (goalTitle) {
    parts.push(goalTitle);
  }

  const meta = parts.length > 0 ? parts.join(' · ') : undefined;
  const metaLeadingIconNames: ActivityMetaLeadingIconName[] = [];
  const scheduleIcon: ActivityMetaLeadingIconName | null = activity.scheduledDate
    ? 'today'
    : activity.reminderAt
      ? 'bell'
      : null;
  if (scheduleIcon) metaLeadingIconNames.push(scheduleIcon);

  const attachments = (activity as any).attachments;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if (hasAttachments) metaLeadingIconNames.push('paperclip');

  const metaLeadingIconName: ActivityMetaLeadingIconName | undefined =
    metaLeadingIconNames.length > 0 ? metaLeadingIconNames[0] : undefined;

  return {
    meta,
    metaLeadingIconName,
    metaLeadingIconNames: metaLeadingIconNames.length > 0 ? metaLeadingIconNames : undefined,
  };
}


