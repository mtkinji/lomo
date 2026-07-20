import type { Activity, ActivityArea, Arc, Goal, UserProfile } from '../../domain/types';
import { getActivityPriorityState, sortActivitiesByPriorityRanking } from '../../features/activities/activityPriority';
import type { BusyInterval, ProposedEvent } from '../scheduling/schedulingEngine';
import { inferSchedulingDomain } from '../scheduling/inferSchedulingDomain';
import { clampToNextQuarterHour, formatTimeLabel, setTimeOnDate, toLocalDateKey } from './planDates';
import { getAvailabilityForDate, getWindowsForMode, resolvePlanModeForArea, type PlanMode } from './planAvailability';

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

function resolveFallbackModeForActivity(activity: Activity, goals: Goal[]): PlanMode {
  const domain = inferSchedulingDomain(activity, goals).toLowerCase();
  if (domain.includes('work')) return 'work';
  return 'personal';
}

function resolveModeForActivity(activity: Activity, goals: Goal[], activityAreas?: ActivityArea[]): PlanMode {
  return resolvePlanModeForArea(activityAreas, activity.areaId ?? null, resolveFallbackModeForActivity(activity, goals));
}

export type DailyPlanProposal = ProposedEvent & {
  goalId?: string | null;
  arcId?: string | null;
  priorityPosition?: number;
};

export type DailyPlanProposeResult = {
  proposals: DailyPlanProposal[];
  /**
   * Activities that are due on the target day but couldn't be placed (constraints/conflicts).
   * This enables an explicit warning surface rather than silently dropping them.
   */
  unplacedDueActivityIds: string[];
  unplacedPriorityCandidates: PlanUnplacedPriorityCandidate[];
};

export type PlanUnplacedPriorityReason =
  | 'no_write_calendar'
  | 'no_matching_window'
  | 'needs_larger_window'
  | 'no_open_slot';

export type PlanUnplacedPriorityCandidate = {
  activityId: string;
  reason: PlanUnplacedPriorityReason;
  durationMinutes: number;
  mode: PlanMode;
  priorityPosition: number;
};

export type PlanCandidateEligibilityReason =
  | 'closed'
  | 'not_active'
  | 'already_scheduled'
  | 'dismissed';

export type PlanCandidateEligibility = {
  eligible: boolean;
  reason: PlanCandidateEligibilityReason | null;
  scheduleState: 'unscheduled' | 'scheduled' | 'stale';
};

export function getPlanCandidateEligibility(params: {
  activity: Activity;
  now: Date;
  dismissedActivityIds?: string[] | Set<string>;
}): PlanCandidateEligibility {
  const { activity, now, dismissedActivityIds } = params;
  const dismissed =
    dismissedActivityIds instanceof Set
      ? dismissedActivityIds
      : new Set(Array.isArray(dismissedActivityIds) ? dismissedActivityIds : []);

  if (activity.status === 'done' || activity.status === 'skipped' || activity.status === 'cancelled') {
    return { eligible: false, reason: 'closed', scheduleState: 'unscheduled' };
  }
  if (getActivityPriorityState(activity) !== 'active') {
    return { eligible: false, reason: 'not_active', scheduleState: 'unscheduled' };
  }
  if (dismissed.has(activity.id)) {
    return { eligible: false, reason: 'dismissed', scheduleState: 'unscheduled' };
  }

  const scheduledStartMs = activity.scheduledAt ? Date.parse(activity.scheduledAt) : Number.NaN;
  if (Number.isFinite(scheduledStartMs)) {
    const durationMinutes = Math.max(10, activity.estimateMinutes ?? 30);
    const scheduledEndMs = scheduledStartMs + durationMinutes * 60_000;
    if (scheduledEndMs > now.getTime()) {
      return { eligible: false, reason: 'already_scheduled', scheduleState: 'scheduled' };
    }
    return { eligible: true, reason: null, scheduleState: 'stale' };
  }

  return { eligible: true, reason: null, scheduleState: 'unscheduled' };
}

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
  activityAreas?: ActivityArea[];
}): DailyPlanProposeResult {
  const {
    activities,
    goals,
    userProfile,
    targetDate,
    busyIntervals,
    writeCalendarId,
    maxItems = 4,
    dismissedActivityIds,
    activityAreas,
  } = params;

  const dayAvailability = getAvailabilityForDate(userProfile, targetDate);
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

  const proposals: DailyPlanProposal[] = [];
  const unplacedPriorityCandidates: PlanUnplacedPriorityCandidate[] = [];
  const busy = normalizeBusy(busyIntervals);
  const startCursor = clampToNextQuarterHour(now);

  function canConsiderActivity(activity: Activity): boolean {
    return getPlanCandidateEligibility({
      activity,
      now,
      dismissedActivityIds: dismissed,
    }).eligible;
  }

  const ranked = sortActivitiesByPriorityRanking({
    activities,
    goals,
    // For non-today days, anchor ranking to the target day (so "what's next" can vary by day).
    // Using midday avoids edge cases around midnight/timezone boundaries.
    now: isToday ? now : new Date(new Date(targetDate).setHours(12, 0, 0, 0)),
  })
    .filter(canConsiderActivity);

  function isDueOnTargetDay(activity: Activity): boolean {
    const raw = activity.scheduledDate ?? null;
    if (!raw) return false;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    return toLocalDateKey(d) === targetKey;
  }

  function tryPlace(
    activity: Activity,
    priorityPosition: number,
  ): { placed: boolean; unplaced?: PlanUnplacedPriorityCandidate } {
    const mode = resolveModeForActivity(activity, goals, activityAreas);
    const durationMinutes = Math.max(10, activity.estimateMinutes ?? 30);
    const unplaced = (reason: PlanUnplacedPriorityReason): PlanUnplacedPriorityCandidate => ({
      activityId: activity.id,
      reason,
      durationMinutes,
      mode,
      priorityPosition,
    });
    if (!writeCalendarId) return { placed: false, unplaced: unplaced('no_write_calendar') };

    const windows = getWindowsForMode(dayAvailability, mode);
    if (windows.length === 0) return { placed: false, unplaced: unplaced('no_matching_window') };

    const hasLargeEnoughWindow = windows.some((window) => {
      const windowStart = setTimeOnDate(targetDate, window.start);
      const windowEnd = setTimeOnDate(targetDate, window.end);
      if (!windowStart || !windowEnd) return false;
      const usableStart = isToday && windowStart < startCursor ? startCursor : windowStart;
      return usableStart.getTime() + durationMinutes * 60_000 <= windowEnd.getTime();
    });
    if (!hasLargeEnoughWindow) {
      return { placed: false, unplaced: unplaced('needs_larger_window') };
    }

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
            domain: mode,
            goalId: activity.goalId ?? null,
            priorityPosition,
          });
          busy.push(candidate);
          return { placed: true };
        }
        cursor = new Date(cursor.getTime() + 15 * 60 * 1000);
      }
    }
    return { placed: false, unplaced: unplaced('no_open_slot') };
  }

  const unplacedDueActivityIds: string[] = [];
  const priorityCandidates = ranked.slice(0, maxItems);
  for (const [priorityPosition, activity] of priorityCandidates.entries()) {
    const attempt = tryPlace(activity, priorityPosition);
    if (!attempt.placed) {
      if (isDueOnTargetDay(activity)) unplacedDueActivityIds.push(activity.id);
      if (attempt.unplaced) unplacedPriorityCandidates.push(attempt.unplaced);
    }
  }

  return { proposals, unplacedDueActivityIds, unplacedPriorityCandidates };
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
  activityAreas?: ActivityArea[];
}): DailyPlanProposal[] {
  const { activity, goals, userProfile, targetDate, busyIntervals, writeCalendarId, limit = 6, activityAreas } = params;
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

  const mode = resolveModeForActivity(activity, goals, activityAreas);
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
          domain: mode,
          goalId: activity.goalId ?? null,
        });
        busy.push(candidate);
      }
      cursor = new Date(cursor.getTime() + 15 * 60 * 1000);
    }
  }

  return proposals;
}
