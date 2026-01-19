import type { Activity, Arc, Goal, UserProfile } from '../../domain/types';
import { getSuggestedActivitiesRanked } from '../recommendations/nextStep';
import type { BusyInterval, ProposedEvent } from '../scheduling/schedulingEngine';
import { clampToNextQuarterHour, formatTimeLabel, setTimeOnDate } from './planDates';
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

function resolveModeForActivity(activity: Activity): PlanMode {
  const domain = (activity.schedulingDomain ?? '').toLowerCase();
  if (domain.includes('work')) return 'work';
  return 'personal';
}

export type DailyPlanProposal = ProposedEvent & {
  goalId?: string | null;
  arcId?: string | null;
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
}): DailyPlanProposal[] {
  const {
    activities,
    goals,
    arcs,
    userProfile,
    targetDate,
    busyIntervals,
    writeCalendarId,
    maxItems = 4,
  } = params;

  const dayAvailability = getAvailabilityForDate(userProfile, targetDate);
  if (!dayAvailability.enabled) return [];

  const ranked = getSuggestedActivitiesRanked({
    activities,
    goals,
    arcs,
    now: new Date(),
    limit: Math.max(10, maxItems * 3),
  });

  const proposals: DailyPlanProposal[] = [];
  const busy = normalizeBusy(busyIntervals);
  const now = new Date();
  const startCursor = clampToNextQuarterHour(now);

  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  for (const activity of ranked) {
    if (proposals.length >= maxItems) break;
    if (activity.status === 'done' || activity.status === 'cancelled') continue;
    if (activity.scheduledAt) continue;
    if (!writeCalendarId) continue;

    const mode = resolveModeForActivity(activity);
    const windows = getWindowsForMode(dayAvailability, mode);
    if (windows.length === 0) continue;

    const durationMinutes = Math.max(10, activity.estimateMinutes ?? 30);
    let placed = false;

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
          placed = true;
          break;
        }
        cursor = new Date(cursor.getTime() + 15 * 60 * 1000);
      }
      if (placed) break;
    }
  }

  return proposals;
}

export function formatProposalTimeLabel(proposal: DailyPlanProposal): string {
  const start = new Date(proposal.startDate);
  return formatTimeLabel(start);
}


