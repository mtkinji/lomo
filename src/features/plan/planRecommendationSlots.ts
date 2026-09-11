import { setTimeOnDate } from '../../services/plan/planDates';
import type { BusyInterval } from '../../services/scheduling/schedulingEngine';

export function getPlanRecommendationSlots({
  targetDate,
  windows,
  durationMinutes,
  busyIntervals,
  otherProposalIntervals,
  now = new Date(),
}: {
  targetDate: Date;
  windows: Array<{ start: string; end: string }>;
  durationMinutes: number;
  busyIntervals: BusyInterval[];
  otherProposalIntervals: BusyInterval[];
  now?: Date;
}): string[] {
  const stepMinutes = 15;
  const candidates: Date[] = [];
  const earliestStart = now;

  function roundUpToStep(d: Date): Date {
    const next = new Date(d);
    next.setSeconds(0, 0);
    const mins = next.getMinutes();
    const remainder = mins % stepMinutes;
    if (remainder !== 0) next.setMinutes(mins + (stepMinutes - remainder));
    return next;
  }

  for (const w of windows) {
    const ws = setTimeOnDate(targetDate, w.start);
    const we = setTimeOnDate(targetDate, w.end);
    if (!ws || !we) continue;

    let cursor = roundUpToStep(ws);
    const latestStart = new Date(we.getTime() - durationMinutes * 60000);
    while (cursor <= latestStart) {
      const newStart = cursor;
      const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
      const conflicts =
        busyIntervals.some((b) => b.start < newEnd && newStart < b.end) ||
        otherProposalIntervals.some((b) => b.start < newEnd && newStart < b.end);
      if (!conflicts && newStart >= earliestStart) {
        candidates.push(new Date(newStart));
      }
      cursor = new Date(cursor.getTime() + stepMinutes * 60000);
    }
  }

  // The picker is scrollable: expose every valid time in clock order.
  return Array.from(new Set(candidates.map((date) => date.getTime())))
    .sort((a, b) => a - b)
    .map((time) => new Date(time).toISOString());
}
