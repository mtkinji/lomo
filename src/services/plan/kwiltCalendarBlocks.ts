import type { Activity } from '../../domain/types';
import { toLocalDateKey } from './planDates';

export type KwiltCalendarBlock = {
  activity: Activity;
  start: Date;
  end: Date;
};

export function getKwiltCalendarBlocksForDay(
  activities: Activity[] | null | undefined,
  targetDate: Date,
): KwiltCalendarBlock[] {
  const targetDateKey = toLocalDateKey(targetDate);

  return (activities ?? [])
    .filter((activity) => {
      if (!activity?.scheduledAt) return false;
      const start = new Date(activity.scheduledAt);
      if (Number.isNaN(start.getTime())) return false;
      return toLocalDateKey(start) === targetDateKey;
    })
    .map((activity) => {
      const start = new Date(activity.scheduledAt as string);
      const durationMinutes = Math.max(10, activity.estimateMinutes ?? 30);
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      return { activity, start, end };
    });
}
