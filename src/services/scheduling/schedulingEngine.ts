import { Activity, UserProfile } from '../../domain/types';

export interface ProposedEvent {
  activityId: string;
  title: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  calendarId: string;
  domain: string;
}

export type BusyInterval = {
  start: Date;
  end: Date;
};

export interface SchedulingOptions {
  now?: Date;
  activities: Activity[];
  userProfile: UserProfile | null;
  defaultCalendarId: string | null;
  /**
   * Existing calendar events keyed by calendarId, used for conflict avoidance.
   */
  busyByCalendarId?: Record<string, BusyInterval[]>;
}

function toLocalDateKey(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function overlaps(a: BusyInterval, b: BusyInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

function normalizeBusy(intervals: BusyInterval[]): BusyInterval[] {
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: BusyInterval[] = [];
  for (const it of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ start: new Date(it.start), end: new Date(it.end) });
      continue;
    }
    if (it.start <= last.end) {
      last.end = new Date(Math.max(last.end.getTime(), it.end.getTime()));
    } else {
      merged.push({ start: new Date(it.start), end: new Date(it.end) });
    }
  }
  return merged;
}

function resolvePreferredWindows(userProfile: UserProfile | null): Array<{ startHour: number; endHour: number }> {
  const preferred = userProfile?.preferences?.scheduling?.preferredWindows ?? null;
  const windows = Array.isArray(preferred) ? preferred : [];

  // Default: 9am–9pm.
  if (windows.length === 0) return [{ startHour: 9, endHour: 21 }];

  const out: Array<{ startHour: number; endHour: number }> = [];
  for (const w of windows) {
    switch (w) {
      case 'morning':
        out.push({ startHour: 8, endHour: 12 });
        break;
      case 'afternoon':
        out.push({ startHour: 12, endHour: 17 });
        break;
      case 'evening':
        out.push({ startHour: 17, endHour: 21 });
        break;
      default:
        break;
    }
  }

  return out.length > 0 ? out : [{ startHour: 9, endHour: 21 }];
}

/**
 * Deterministic scheduling engine for Kwilt Scheduling Assist.
 * Proposes placements for activities based on user preferences and simple heuristics.
 */
export function proposeSchedule(options: SchedulingOptions): ProposedEvent[] {
  const { activities, userProfile, defaultCalendarId, now: nowInput, busyByCalendarId } = options;
  const now = nowInput ?? new Date();
  
  const proposals: ProposedEvent[] = [];
  const domainMapping = userProfile?.preferences?.scheduling?.domainCalendarMapping ?? {};
  const preferredWindows = resolvePreferredWindows(userProfile);

  const busyByCal: Record<string, BusyInterval[]> = {};
  if (busyByCalendarId) {
    for (const [calId, intervals] of Object.entries(busyByCalendarId)) {
      busyByCal[calId] = normalizeBusy(intervals ?? []);
    }
  }
  const busyAll = busyByCal['__all__'] ?? [];

  // Proposed events should also block future placements in that calendar.
  const proposedBusyByCal: Record<string, BusyInterval[]> = {};
  const proposedBusyAll: BusyInterval[] = [];

  const findNextSlot = (params: {
    calendarId: string;
    durationMinutes: number;
    startAt: Date;
    horizonDays: number;
  }): { start: Date; end: Date } | null => {
    const { calendarId, durationMinutes, startAt, horizonDays } = params;
    const durationMs = Math.max(5, Math.round(durationMinutes)) * 60 * 1000;
    const gapMs = 15 * 60 * 1000;

    const startDay = startOfLocalDay(startAt);
    const startDayKey = toLocalDateKey(startDay);
    const existing = busyByCal[calendarId] ?? [];
    const proposed = proposedBusyByCal[calendarId] ?? [];
    const combined = normalizeBusy([...busyAll, ...proposedBusyAll, ...existing, ...proposed]);

    for (let dayOffset = 0; dayOffset <= Math.max(1, horizonDays); dayOffset++) {
      const day = new Date(startDay.getTime());
      day.setDate(day.getDate() + dayOffset);
      const dayKey = toLocalDateKey(day);

      for (const w of preferredWindows) {
        const windowStart = new Date(day);
        windowStart.setHours(w.startHour, 0, 0, 0);
        const windowEnd = new Date(day);
        windowEnd.setHours(w.endHour, 0, 0, 0);

        // If this is the starting day, don't schedule earlier than startAt.
        let cursor = new Date(windowStart);
        if (dayKey === startDayKey && cursor < startAt) {
          cursor = new Date(startAt);
          cursor.setSeconds(0, 0);
          // Snap forward to next 15 min boundary for cleanliness.
          const minutes = cursor.getMinutes();
          const remainder = minutes % 15;
          if (remainder !== 0) {
            cursor = addMinutes(cursor, 15 - remainder);
          }
        }

        while (cursor.getTime() + durationMs <= windowEnd.getTime()) {
          const candidate: BusyInterval = { start: cursor, end: new Date(cursor.getTime() + durationMs) };
          const hasConflict = combined.some((b) => overlaps(b, candidate));
          if (!hasConflict) {
            return { start: candidate.start, end: candidate.end };
          }

          // Step by 15 minutes.
          cursor = new Date(cursor.getTime() + gapMs);
        }
      }
    }

    return null;
  };

  // Start from the next 15-min boundary.
  const startCursor = (() => {
    const c = new Date(now);
    c.setSeconds(0, 0);
    const remainder = c.getMinutes() % 15;
    if (remainder !== 0) c.setMinutes(c.getMinutes() + (15 - remainder));
    return c;
  })();

  for (const activity of activities) {
    // Skip already scheduled or done activities
    if (activity.status === 'done' || activity.scheduledAt) continue;

    const duration = activity.estimateMinutes ?? 30;
    const domain = activity.schedulingDomain ?? 'personal';
    const calendarId = activity.calendarId || domainMapping[domain] || defaultCalendarId;

    if (!calendarId) continue;

    const nextSlot = findNextSlot({
      calendarId,
      durationMinutes: duration,
      startAt: startCursor,
      horizonDays: 7,
    });
    if (!nextSlot) continue;

    proposals.push({
      activityId: activity.id,
      title: activity.title,
      startDate: nextSlot.start.toISOString(),
      endDate: nextSlot.end.toISOString(),
      calendarId,
      domain,
    });

    // Block this slot for subsequent proposals in the same calendar.
    proposedBusyByCal[calendarId] = normalizeBusy([
      ...(proposedBusyByCal[calendarId] ?? []),
      { start: nextSlot.start, end: nextSlot.end },
    ]);
    proposedBusyAll.push({ start: nextSlot.start, end: nextSlot.end });
  }

  return proposals;
}

