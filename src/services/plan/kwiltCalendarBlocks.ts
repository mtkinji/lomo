import type { Activity, ActivityScheduleSession } from '../../domain/types';
import { toLocalDateKey } from './planDates';
import { getActiveActivityScheduleSessions } from './activityScheduleSessions';

export type KwiltCalendarBlock = {
  activity: Activity;
  sessionId: string;
  binding: ActivityScheduleSession['calendarBinding'] | null;
  start: Date;
  end: Date;
};

export function getKwiltCalendarBlocksForDay(
  activities: Activity[] | null | undefined,
  targetDate: Date,
): KwiltCalendarBlock[] {
  const targetDateKey = toLocalDateKey(targetDate);

  return (activities ?? []).flatMap((activity) => {
    const sessions = getActiveActivityScheduleSessions(activity);
    if (sessions.length === 0 && activity.scheduledAt) {
      const start = new Date(activity.scheduledAt);
      if (Number.isNaN(start.getTime()) || toLocalDateKey(start) !== targetDateKey) return [];
      const durationMinutes = Math.max(10, activity.estimateMinutes ?? 30);
      return [{
        activity,
        sessionId: `legacy:unmanaged:${activity.id}`,
        binding: activity.calendarBinding ?? null,
        start,
        end: new Date(start.getTime() + durationMinutes * 60_000),
      }];
    }
    return sessions
      .filter((session) => toLocalDateKey(new Date(session.start)) === targetDateKey)
      .map((session) => ({
        activity,
        sessionId: session.id,
        binding: session.calendarBinding,
        start: new Date(session.start),
        end: new Date(session.end),
      }));
  });
}
