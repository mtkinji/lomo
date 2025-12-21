import type { Arc, Goal } from './types';

export const FREE_MAX_ACTIVE_GOALS_PER_ARC = 3;
export const FREE_MAX_ARCS_TOTAL = 1;

/**
 * "Active goal" is only used for Free-tier limit enforcement.
 *
 * Current definition (confirmed):
 * - "Active" means "not archived".
 * - Completed goals still count toward the Free cap unless archived.
 */
export function isActiveGoalForLimit(goal: Goal): boolean {
  return goal.status !== 'archived';
}

export function countActiveGoalsForArc(goals: Goal[], arcId: string): number {
  return goals.filter((goal) => goal.arcId === arcId && isActiveGoalForLimit(goal)).length;
}

export function canCreateGoalInArc(params: {
  isPro: boolean;
  goals: Goal[];
  arcId: string;
}):
  | { ok: true; activeCount: number; limit: number }
  | { ok: false; reason: 'limit_goals_per_arc'; activeCount: number; limit: number } {
  if (params.isPro) {
    return {
      ok: true,
      activeCount: 0,
      limit: FREE_MAX_ACTIVE_GOALS_PER_ARC,
    };
  }

  const activeCount = countActiveGoalsForArc(params.goals, params.arcId);
  if (activeCount >= FREE_MAX_ACTIVE_GOALS_PER_ARC) {
    return {
      ok: false,
      reason: 'limit_goals_per_arc',
      activeCount,
      limit: FREE_MAX_ACTIVE_GOALS_PER_ARC,
    };
  }

  return {
    ok: true,
    activeCount,
    limit: FREE_MAX_ACTIVE_GOALS_PER_ARC,
  };
}

export function canCreateArc(params: {
  isPro: boolean;
  arcs: Arc[];
}):
  | { ok: true; count: number; limit: number }
  | { ok: false; reason: 'limit_arcs_total'; count: number; limit: number } {
  if (params.isPro) {
    return {
      ok: true,
      count: params.arcs.length,
      limit: FREE_MAX_ARCS_TOTAL,
    };
  }

  const count = params.arcs.length;
  if (count >= FREE_MAX_ARCS_TOTAL) {
    return {
      ok: false,
      reason: 'limit_arcs_total',
      count,
      limit: FREE_MAX_ARCS_TOTAL,
    };
  }

  return {
    ok: true,
    count,
    limit: FREE_MAX_ARCS_TOTAL,
  };
}


