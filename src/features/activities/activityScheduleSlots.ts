import type { Activity, ActivityArea, Goal, UserProfile } from '../../domain/types';
import { clampToNextQuarterHour, setTimeOnDate, toLocalDateKey } from '../../services/plan/planDates';
import { getAvailabilityForDate, getWindowsForMode, resolvePlanModeForArea } from '../../services/plan/planAvailability';
import { inferSchedulingDomain } from '../../services/scheduling/inferSchedulingDomain';

export type ScheduleBusyInterval = { start: Date; end: Date };
export type ManualScheduleSlot = { startDate: string; endDate: string };

export type ManualScheduleSlotRejectionReason =
  | 'invalid-date'
  | 'end-of-day'
  | 'past-today';

export type ManualScheduleSlotAdvisory =
  | 'day-disabled'
  | 'no-window'
  | 'outside-window'
  | 'busy';

type ScheduleSlotToast = {
  message: string;
  durationMs: number;
};

export type ManualScheduleSlotResult =
  | { ok: true; slot: ManualScheduleSlot; advisories: ManualScheduleSlotAdvisory[] }
  | { ok: false; reason: ManualScheduleSlotRejectionReason; toast?: ScheduleSlotToast };

type ResolveManualScheduleSlotParams = {
  activity: Activity;
  activityAreas: ActivityArea[];
  goals: Goal[];
  userProfile: UserProfile | null;
  date: Date;
  durationMinutes: number;
  busyIntervals: ScheduleBusyInterval[];
  now?: Date;
};

const REJECTION_TOASTS = {
  endOfDay: { message: 'Not enough time before the end of day.', durationMs: 2200 },
  pastToday: { message: 'Pick a time later today.', durationMs: 2200 },
} satisfies Record<string, ScheduleSlotToast>;

export function resolveManualScheduleSlot(params: ResolveManualScheduleSlotParams): ManualScheduleSlotResult {
  const start = new Date(params.date);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, reason: 'invalid-date' };
  }
  start.setSeconds(0, 0);

  const durationMinutes = Math.max(10, params.durationMinutes);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  if (end > dayEnd) {
    return { ok: false, reason: 'end-of-day', toast: REJECTION_TOASTS.endOfDay };
  }

  const now = params.now ?? new Date();
  const isToday = toLocalDateKey(now) === toLocalDateKey(start);
  if (isToday) {
    const cursor = clampToNextQuarterHour(now);
    if (start < cursor) {
      return { ok: false, reason: 'past-today', toast: REJECTION_TOASTS.pastToday };
    }
  }

  const advisories: ManualScheduleSlotAdvisory[] = [];
  const dayAvailability = getAvailabilityForDate(params.userProfile, start);
  if (!dayAvailability.enabled) {
    advisories.push('day-disabled');
  } else {
    const inferredMode = inferSchedulingDomain(params.activity, params.goals).toLowerCase().includes('work')
      ? 'work'
      : 'personal';
    const mode = resolvePlanModeForArea(params.activityAreas, params.activity.areaId ?? null, inferredMode);
    const windows = getWindowsForMode(dayAvailability, mode);
    if (windows.length === 0) {
      advisories.push('no-window');
    } else {
      const insideWindow = windows.some((window) => {
        const windowStart = setTimeOnDate(start, window.start);
        const windowEnd = setTimeOnDate(start, window.end);
        if (!windowStart || !windowEnd) return false;
        return start >= windowStart && end <= windowEnd;
      });
      if (!insideWindow) advisories.push('outside-window');
    }
  }

  if (params.busyIntervals.some((busy) => start < busy.end && busy.start < end)) {
    advisories.push('busy');
  }

  return {
    ok: true,
    slot: { startDate: start.toISOString(), endDate: end.toISOString() },
    advisories,
  };
}
