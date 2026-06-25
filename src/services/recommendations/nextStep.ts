import type { Activity, Arc, Goal } from '../../domain/types';
import { getActivityPriorityState, rankActivitiesBySmartOrder } from '../../features/activities/activityPriority';

export type SuggestedNextStep =
  | {
      kind: 'setup';
      reason: 'no_goals' | 'no_activities';
    }
  | {
      kind: 'activity';
      activityId: string;
      goalId: string | null;
    };

function localDateKey(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isScheduledForLocalDay(activity: Activity, dateKey: string): boolean {
  const raw = activity.scheduledAt ?? null;
  if (!raw) return false;
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) return false;
  return localDateKey(when) === dateKey;
}

function isActionable(activity: Activity): boolean {
  return activity.status !== 'done' && activity.status !== 'cancelled';
}

type ScoredActivity = { activity: Activity; score: number };

function scoreActivities(params: { activities: Activity[]; goals: Goal[]; now: Date }): ScoredActivity[] {
  return rankActivitiesBySmartOrder({
    activities: params.activities,
    goals: params.goals,
    now: params.now,
  })
    .filter((row) => isActionable(row.activity))
    .filter((row) => getActivityPriorityState(row.activity) === 'active')
    .map((row) => ({ activity: row.activity, score: row.score }));
}

/**
 * Returns a ranked list of actionable Activities that are good candidates for
 * "Suggested next step" surfaces (widgets, Today canvas, nudges).
 */
export function getSuggestedActivitiesRanked(params: {
  arcs: Arc[];
  goals: Goal[];
  activities: Activity[];
  now: Date;
  limit?: number;
}): Activity[] {
  const { goals, activities, now, limit = 8 } = params;

  if (!goals || goals.length === 0) return [];
  if (!activities || activities.length === 0) return [];

  return scoreActivities({ activities, goals, now })
    .slice(0, Math.max(1, Math.round(limit)))
    .map((s) => s.activity);
}

export function getSuggestedNextStep(params: {
  arcs: Arc[];
  goals: Goal[];
  activities: Activity[];
  now: Date;
}): SuggestedNextStep | null {
  const { goals, activities, now } = params;

  if (!goals || goals.length === 0) {
    return { kind: 'setup', reason: 'no_goals' };
  }

  if (!activities || activities.length === 0) {
    return { kind: 'setup', reason: 'no_activities' };
  }

  const scored = scoreActivities({ activities, goals, now });
  if (scored.length === 0) {
    return { kind: 'setup', reason: 'no_activities' };
  }

  const top = scored[0]?.activity;
  if (!top) return null;

  return { kind: 'activity', activityId: top.id, goalId: top.goalId };
}

export function hasAnyActivitiesScheduledForToday(params: { activities: Activity[]; now: Date }): boolean {
  const todayKey = localDateKey(params.now);
  return params.activities.some((a) => isActionable(a) && isScheduledForLocalDay(a, todayKey));
}
