import type { Activity, Arc, Goal, UserProfile } from '../../domain/types';
import { getSuggestedActivitiesRanked } from '../recommendations/nextStep';
import type { BusyInterval, ProposedEvent } from '../scheduling/schedulingEngine';
import { inferSchedulingDomain } from '../scheduling/inferSchedulingDomain';
import { clampToNextQuarterHour, formatTimeLabel, setTimeOnDate, toLocalDateKey } from './planDates';
import { getAvailabilityForDate, getWindowsForMode, type PlanMode } from './planAvailability';

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

function resolveModeForActivity(activity: Activity, goals: Goal[]): PlanMode {
  const domain = inferSchedulingDomain(activity, goals).toLowerCase();
  if (domain.includes('work')) return 'work';
  return 'personal';
}

export type DailyPlanProposal = ProposedEvent & {
  goalId?: string | null;
  arcId?: string | null;
};

export type DailyPlanProposeResult = {
  proposals: DailyPlanProposal[];
  /**
   * Activities that are due on the target day but couldn't be placed (constraints/conflicts).
   * This enables an explicit warning surface rather than silently dropping them.
   */
  unplacedDueActivityIds: string[];
};

export function proposeDailyPlan(params: {
  activities: Activity[];
  goals: Goal[];
  arcs: Arc[];
  userProfile: UserProfile | null;
  targetDate: Date;
  busyIntervals: BusyInterval[];
  writeCalendarId: string | null;
  maxItems?: number;
  dismissedActivityIds?: string[] | Set<string>;
}): DailyPlanProposeResult {
  const {
    activities,
    goals,
    arcs,
    userProfile,
    targetDate,
    busyIntervals,
    writeCalendarId,
    maxItems = 4,
    dismissedActivityIds,
  } = params;

  const dayAvailability = getAvailabilityForDate(userProfile, targetDate);
  if (!dayAvailability.enabled) return { proposals: [], unplacedDueActivityIds: [] };

  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  const targetKey = toLocalDateKey(targetDate);
  const dismissed =
    dismissedActivityIds instanceof Set
      ? dismissedActivityIds
      : new Set(Array.isArray(dismissedActivityIds) ? dismissedActivityIds : []);

  const ranked = getSuggestedActivitiesRanked({
    activities,
    goals,
    arcs,
    // For non-today days, anchor ranking to the target day (so "what's next" can vary by day).
    // Using midday avoids edge cases around midnight/timezone boundaries.
    now: isToday ? now : new Date(new Date(targetDate).setHours(12, 0, 0, 0)),
    limit: Math.max(10, maxItems * 3),
  });

  const proposals: DailyPlanProposal[] = [];
  const busy = normalizeBusy(busyIntervals);
  const startCursor = clampToNextQuarterHour(now);

  function canConsiderActivity(activity: Activity): boolean {
    if (activity.status === 'done' || activity.status === 'cancelled') return false;
    if (activity.scheduledAt) return false;
    if (dismissed.has(activity.id)) return false;
    return true;
  }

  function isDueOnTargetDay(activity: Activity): boolean {
    const raw = activity.scheduledDate ?? null;
    if (!raw) return false;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    return toLocalDateKey(d) === targetKey;
  }

  function tryPlace(activity: Activity): boolean {
    if (!writeCalendarId) return false;

    const mode = resolveModeForActivity(activity, goals);
    const windows = getWindowsForMode(dayAvailability, mode);
    if (windows.length === 0) return false;

    const durationMinutes = Math.max(10, activity.estimateMinutes ?? 30);

    for (const window of windows) {
      const windowStart = setTimeOnDate(targetDate, window.start);
      const windowEnd = setTimeOnDate(targetDate, window.end);
      if (!windowStart || !windowEnd) continue;

      let cursor = new Date(windowStart);
      if (isToday && cursor < startCursor) cursor = new Date(startCursor);
      cursor.setSeconds(0, 0);

      while (cursor.getTime() + durationMinutes * 60000 <= windowEnd.getTime()) {
        const candidate: BusyInterval = {
          start: cursor,
          end: new Date(cursor.getTime() + durationMinutes * 60000),
        };
        const conflict = busy.some((b) => overlaps(b, candidate));
        if (!conflict) {
          proposals.push({
            activityId: activity.id,
            title: activity.title,
            startDate: candidate.start.toISOString(),
            endDate: candidate.end.toISOString(),
            calendarId: writeCalendarId,
            domain: activity.schedulingDomain ?? 'personal',
            goalId: activity.goalId ?? null,
          });
          busy.push(candidate);
          return true;
        }
        cursor = new Date(cursor.getTime() + 15 * 60 * 1000);
      }
    }
    return false;
  }

  // 1) Force-schedule due-on-target-day activities first (unless dismissed).
  const dueCandidates = ranked.filter((a) => canConsiderActivity(a) && isDueOnTargetDay(a));
  const unplacedDueActivityIds: string[] = [];
  for (const activity of dueCandidates) {
    if (proposals.length >= maxItems) break;
    const placed = tryPlace(activity);
    if (!placed) unplacedDueActivityIds.push(activity.id);
  }

  // 2) Fill remaining slots with the normal ranked list.
  for (const activity of ranked) {
    if (proposals.length >= maxItems) break;
    if (!canConsiderActivity(activity)) continue;
    // Skip if it was already attempted as a due candidate.
    if (isDueOnTargetDay(activity)) continue;
    void tryPlace(activity);
  }

  return { proposals, unplacedDueActivityIds };
}

export function formatProposalTimeLabel(proposal: DailyPlanProposal): string {
  const start = new Date(proposal.startDate);
  return formatTimeLabel(start);
}

/**
 * Suggest multiple candidate slots for a single activity on a target day.
 * This is used by the Activity Detail "Schedule" surface (hybrid: slots + optional day view).
 */
export function proposeSlotsForActivity(params: {
  activity: Activity;
  goals: Goal[];
  userProfile: UserProfile | null;
  targetDate: Date;
  busyIntervals: BusyInterval[];
  writeCalendarId: string | null;
  limit?: number;
}): DailyPlanProposal[] {
  const { activity, goals, userProfile, targetDate, busyIntervals, writeCalendarId, limit = 6 } = params;
  if (!writeCalendarId) return [];

  const dayAvailability = getAvailabilityForDate(userProfile, targetDate);
  if (!dayAvailability.enabled) return [];

  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  const busy = normalizeBusy(busyIntervals);
  const startCursor = clampToNextQuarterHour(now);

  const mode = resolveModeForActivity(activity, goals);
  const windows = getWindowsForMode(dayAvailability, mode);
  if (windows.length === 0) return [];

  const durationMinutes = Math.max(10, activity.estimateMinutes ?? 30);
  const proposals: DailyPlanProposal[] = [];

  for (const window of windows) {
    if (proposals.length >= limit) break;
    const windowStart = setTimeOnDate(targetDate, window.start);
    const windowEnd = setTimeOnDate(targetDate, window.end);
    if (!windowStart || !windowEnd) continue;

    let cursor = new Date(windowStart);
    if (isToday && cursor < startCursor) cursor = new Date(startCursor);
    cursor.setSeconds(0, 0);

    while (cursor.getTime() + durationMinutes * 60000 <= windowEnd.getTime()) {
      if (proposals.length >= limit) break;
      const candidate: BusyInterval = {
        start: cursor,
        end: new Date(cursor.getTime() + durationMinutes * 60000),
      };
      const conflict = busy.some((b) => overlaps(b, candidate));
      if (!conflict) {
        proposals.push({
          activityId: activity.id,
          title: activity.title,
          startDate: candidate.start.toISOString(),
          endDate: candidate.end.toISOString(),
          calendarId: writeCalendarId,
          domain: activity.schedulingDomain ?? 'personal',
          goalId: activity.goalId ?? null,
        });
        busy.push(candidate);
      }
      cursor = new Date(cursor.getTime() + 15 * 60 * 1000);
    }
  }

  return proposals;
}


