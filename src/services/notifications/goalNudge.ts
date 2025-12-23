import type * as Notifications from 'expo-notifications';
import type { Arc, Goal, Activity } from '../../domain/types';

export type GoalNudgeCandidate = {
  goalId: string;
  goalTitle: string;
  arcName?: string | null;
};

export function localDateKey(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isIncompleteActivity(a: Activity): boolean {
  return a.status !== 'done' && a.status !== 'skipped' && a.status !== 'cancelled';
}

function isActiveGoal(g: Goal): boolean {
  return g.status === 'planned' || g.status === 'in_progress';
}

function isActiveArc(a: Arc): boolean {
  return a.status === 'active';
}

function activityIsScheduledForLocalDate(activity: Activity, dateKey: string): boolean {
  if (activity.scheduledDate && activity.scheduledDate === dateKey) return true;
  if (activity.scheduledAt) {
    const dt = new Date(activity.scheduledAt);
    if (!Number.isNaN(dt.getTime()) && localDateKey(dt) === dateKey) return true;
  }
  return false;
}

export function pickGoalNudgeCandidate(params: {
  arcs: Arc[];
  goals: Goal[];
  activities: Activity[];
  now: Date;
}): GoalNudgeCandidate | null {
  const { arcs, goals, activities, now } = params;
  const activeArcIds = new Set(arcs.filter(isActiveArc).map((a) => a.id));
  if (activeArcIds.size === 0) return null;

  const todayKey = localDateKey(now);
  const goalsById = new Map(goals.map((g) => [g.id, g]));
  const arcsById = new Map(arcs.map((a) => [a.id, a]));

  const goalActivityCounts = new Map<string, { incomplete: number; hasToday: boolean; earliestTodayTs?: number }>();
  for (const a of activities) {
    if (!a.goalId) continue;
    const g = goalsById.get(a.goalId);
    if (!g || !g.arcId) continue;
    if (!activeArcIds.has(g.arcId)) continue;
    if (!isActiveGoal(g)) continue;
    if (!isIncompleteActivity(a)) continue;

    const entry = goalActivityCounts.get(g.id) ?? { incomplete: 0, hasToday: false };
    entry.incomplete += 1;
    if (activityIsScheduledForLocalDate(a, todayKey)) {
      entry.hasToday = true;
      const ts = a.scheduledAt ? new Date(a.scheduledAt).getTime() : undefined;
      if (ts && Number.isFinite(ts)) {
        entry.earliestTodayTs = Math.min(entry.earliestTodayTs ?? ts, ts);
      }
    }
    goalActivityCounts.set(g.id, entry);
  }

  const eligibleGoalIds = Array.from(goalActivityCounts.keys());
  if (eligibleGoalIds.length === 0) return null;

  // Prefer a goal with a scheduled Activity today, else most incomplete activities.
  eligibleGoalIds.sort((aId, bId) => {
    const a = goalActivityCounts.get(aId)!;
    const b = goalActivityCounts.get(bId)!;
    if (a.hasToday !== b.hasToday) return a.hasToday ? -1 : 1;
    if (a.hasToday && b.hasToday) {
      return (a.earliestTodayTs ?? 0) - (b.earliestTodayTs ?? 0);
    }
    return b.incomplete - a.incomplete;
  });

  const goal = goalsById.get(eligibleGoalIds[0]!)!;
  const arcName = goal.arcId ? arcsById.get(goal.arcId)?.name ?? null : null;
  return {
    goalId: goal.id,
    goalTitle: goal.title,
    arcName,
  };
}

export function buildGoalNudgeContent(params: {
  goalTitle: string;
  arcName?: string | null;
}): Notifications.NotificationContentInput {
  const goalTitle = params.goalTitle.trim();
  const arcName = (params.arcName ?? '').trim();
  const title = `Tiny step for: ${goalTitle}`;
  const body = arcName.length > 0
    ? `Open Kwilt to pick one activity for ${goalTitle} (${arcName}).`
    : 'Open Kwilt to choose one activity and keep momentum.';
  return {
    title,
    body,
  };
}


