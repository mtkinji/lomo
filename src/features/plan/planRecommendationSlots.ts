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
  // Prefix maxima answer overlap queries without rescanning the calendar for
  // every 15-minute candidate. Keep strict boundary comparisons unchanged.
  const busy = [...busyIntervals, ...otherProposalIntervals]
    .map(interval => ({ start: interval.start.getTime(), end: interval.end.getTime() }))
    .filter(interval => Number.isFinite(interval.start) && Number.isFinite(interval.end))
    .sort((a, b) => a.start - b.start);
  const maxEnd: number[] = [];
  busy.forEach((interval, index) => { maxEnd[index] = Math.max(maxEnd[index - 1] ?? -Infinity, interval.end); });
  const conflictsWithCalendar = (start: number, end: number) => {
    let low = 0;
    let high = busy.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (busy[middle].start < end) low = middle + 1;
      else high = middle;
    }
    return low > 0 && maxEnd[low - 1] > start;
  };


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
      const conflicts = conflictsWithCalendar(newStart.getTime(), newEnd.getTime());
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
