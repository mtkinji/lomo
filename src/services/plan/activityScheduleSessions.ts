import type { Activity, ActivityCalendarBinding, ActivityScheduleSession } from '../../domain/types';

function validDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function bindingKey(binding: ActivityCalendarBinding): string {
  if (binding.kind === 'device') return `device:${binding.calendarId}:${binding.eventId}`;
  return `${binding.provider}:${binding.accountId}:${binding.calendarId}:${binding.eventId}`;
}

function sameCalendar(a: ActivityCalendarBinding, b: ActivityCalendarBinding): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'device' && b.kind === 'device') return a.calendarId === b.calendarId;
  return a.kind === 'provider' && b.kind === 'provider' &&
    a.provider === b.provider && a.accountId === b.accountId && a.calendarId === b.calendarId;
}

function legacySession(activity: Activity): ActivityScheduleSession | null {
  if (!activity.scheduledAt || !validDate(activity.scheduledAt) || !activity.calendarBinding) return null;
  const start = new Date(activity.scheduledAt);
  const durationMinutes = Math.max(10, activity.estimateMinutes ?? 30);
  const timestamp = activity.updatedAt || activity.createdAt;
  return {
    id: `legacy:${bindingKey(activity.calendarBinding)}`,
    activityId: activity.id,
    start: start.toISOString(),
    end: new Date(start.getTime() + durationMinutes * 60_000).toISOString(),
    calendarBinding: activity.calendarBinding,
    source: activity.calendarBinding.createdBy,
    status: 'scheduled',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function storedOrLegacySessions(activity: Activity): ActivityScheduleSession[] {
  if (Array.isArray(activity.scheduleSessions) && activity.scheduleSessions.length > 0) {
    return activity.scheduleSessions.filter((session) =>
      Boolean(session) && session.activityId === activity.id && validDate(session.start) && validDate(session.end),
    );
  }
  const legacy = legacySession(activity);
  return legacy ? [legacy] : [];
}

export function getActiveActivityScheduleSessions(activity: Activity): ActivityScheduleSession[] {
  return storedOrLegacySessions(activity)
    .filter((session) => session.status === 'scheduled')
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export function getActivityScheduleSessionCount(activity: Activity): number {
  const activeCount = getActiveActivityScheduleSessions(activity).length;
  if (activeCount > 0) return activeCount;
  return activity.scheduledAt && validDate(activity.scheduledAt) ? 1 : 0;
}

function deriveCompatibility(
  activity: Activity,
  sessions: ActivityScheduleSession[],
  now: Date,
): Activity {
  const active = sessions
    .filter((session) => session.status === 'scheduled' && validDate(session.start) && validDate(session.end))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const next = active.find((session) => Date.parse(session.end) >= now.getTime()) ?? active.at(-1) ?? null;
  const providerBinding = next?.calendarBinding.kind === 'provider' ? next.calendarBinding : null;
  return {
    ...activity,
    scheduleSessions: sessions,
    scheduledAt: next?.start ?? null,
    calendarBinding: next?.calendarBinding ?? null,
    scheduledProvider: providerBinding?.provider ?? null,
    scheduledProviderAccountId: providerBinding?.accountId ?? null,
    scheduledProviderCalendarId: providerBinding?.calendarId ?? null,
    scheduledProviderEventId: providerBinding?.eventId ?? null,
  };
}

export function upsertActivityScheduleSession(
  activity: Activity,
  session: ActivityScheduleSession,
  now = new Date(),
): Activity {
  const sessions = storedOrLegacySessions(activity);
  const existingIndex = sessions.findIndex((item) =>
    item.id === session.id || bindingKey(item.calendarBinding) === bindingKey(session.calendarBinding),
  );
  const nextSessions = existingIndex >= 0
    ? sessions.map((item, index) => index === existingIndex ? session : item)
    : [...sessions, session];
  return deriveCompatibility(activity, nextSessions, now);
}

export function findMatchingActivityScheduleSession(
  activity: Activity,
  candidate: { start: string; end: string; calendarBinding: ActivityCalendarBinding },
): ActivityScheduleSession | null {
  const toleranceMs = 2 * 60_000;
  return getActiveActivityScheduleSessions(activity).find((session) =>
    sameCalendar(session.calendarBinding, candidate.calendarBinding) &&
    Math.abs(Date.parse(session.start) - Date.parse(candidate.start)) <= toleranceMs &&
    Math.abs(Date.parse(session.end) - Date.parse(candidate.end)) <= toleranceMs,
  ) ?? null;
}

export function findMatchingActivityScheduleSessionInCalendar(
  activity: Activity,
  candidate: { start: string; end: string; calendarId: string },
): ActivityScheduleSession | null {
  const toleranceMs = 2 * 60_000;
  return getActiveActivityScheduleSessions(activity).find((session) =>
    session.calendarBinding.calendarId === candidate.calendarId &&
    Math.abs(Date.parse(session.start) - Date.parse(candidate.start)) <= toleranceMs &&
    Math.abs(Date.parse(session.end) - Date.parse(candidate.end)) <= toleranceMs,
  ) ?? null;
}

export function moveActivityScheduleSession(
  activity: Activity,
  sessionId: string,
  update: { start: string; end: string; updatedAt: string },
  now = new Date(),
): Activity {
  const sessions = storedOrLegacySessions(activity).map((session) =>
    session.id === sessionId ? { ...session, ...update } : session,
  );
  return deriveCompatibility(activity, sessions, now);
}

export function cancelActivityScheduleSession(
  activity: Activity,
  sessionId: string,
  updatedAt: string,
  now = new Date(),
): Activity {
  const sessions: ActivityScheduleSession[] = storedOrLegacySessions(activity).map((session) =>
    session.id === sessionId ? { ...session, status: 'cancelled', updatedAt } : session,
  );
  return deriveCompatibility(activity, sessions, now);
}
