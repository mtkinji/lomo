import type { Arc, Goal } from './types';

/** Kept for non-monetization analytics and legacy compatibility. */
export function isActiveGoalForLimit(goal: Goal): boolean {
  return goal.status !== 'archived' && goal.qualityState !== 'draft';
}

export function countActiveGoalsForArc(goals: Goal[], arcId: string): number {
  return goals.filter((goal) => goal.arcId === arcId && isActiveGoalForLimit(goal)).length;
}

export function canCreateGoalInArc(params: {
  isPro: boolean;
  goals: Goal[];
  arcId: string;
}): { ok: true; activeCount: number } | { ok: false; activeCount: number; limit: number } {
  return { ok: true, activeCount: countActiveGoalsForArc(params.goals, params.arcId) };
}

export function canCreateArc(params: { isPro: boolean; arcs: Arc[] }): { ok: true; count: number } | { ok: false; count: number; limit: number } {
  return { ok: true, count: params.arcs.length };
}
