import type { Activity, Arc, Goal } from '../../domain/types';

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
  const raw = activity.scheduledAt ?? activity.scheduledDate ?? null;
  if (!raw) return false;
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) return false;
  return localDateKey(when) === dateKey;
}

function isActionable(activity: Activity): boolean {
  return activity.status !== 'done' && activity.status !== 'cancelled';
}

type ScoredActivity = { activity: Activity; score: number };

function scoreActivities(params: { activities: Activity[]; now: Date }): ScoredActivity[] {
  const todayKey = localDateKey(params.now);
  const actionable = params.activities.filter(isActionable);
  return actionable
    .map((activity) => {
      const scheduledToday = isScheduledForLocalDay(activity, todayKey) ? 1 : 0;
      const priority = activity.priority === 1 ? 1 : activity.priority === 2 ? 0.5 : 0;
      const estimate = typeof activity.estimateMinutes === 'number' ? activity.estimateMinutes : null;
      // Prefer smaller estimates; cap to avoid overfitting.
      const estimateScore =
        estimate === null ? 0 : estimate <= 15 ? 1 : estimate <= 30 ? 0.6 : estimate <= 60 ? 0.2 : 0;
      const updatedAt = new Date(activity.updatedAt).getTime();
      const updatedScore = Number.isNaN(updatedAt)
        ? 0
        : Math.min(1, (Date.now() - updatedAt) / (7 * 24 * 60 * 60 * 1000));
      // Higher is better.
      const score = scheduledToday * 3 + priority * 2 + estimateScore * 1 + updatedScore * 0.2;
      return { activity, score };
    })
    .sort((a, b) => b.score - a.score);
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

  return scoreActivities({ activities, now })
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

  const todayKey = localDateKey(now);
  const scored = scoreActivities({ activities, now });
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


