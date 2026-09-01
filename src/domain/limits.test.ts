import { canCreateArc, canCreateGoalInArc, countActiveGoalsForArc, isActiveGoalForLimit } from './limits';
import type { Arc, Goal } from './types';

const FIXED_ISO = '2026-01-01T12:00:00.000Z';

function arc(overrides: Partial<Arc> = {}): Arc {
  return {
    id: 'arc-1',
    name: 'Arc',
    status: 'active',
    startDate: FIXED_ISO,
    endDate: null,
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    arcId: 'arc-1',
    title: 'Goal',
    status: 'planned',
    forceIntent: {},
    metrics: [],
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    ...overrides,
  };
}

describe('non-monetized structure helpers', () => {
  it('still classifies active goals for analytics', () => {
    expect(isActiveGoalForLimit(goal())).toBe(true);
    expect(isActiveGoalForLimit(goal({ status: 'archived' }))).toBe(false);
    expect(isActiveGoalForLimit(goal({ qualityState: 'draft' }))).toBe(false);
  });

  it('counts only active goals for the requested Arc', () => {
    const goals = [
      goal({ id: 'g1' }),
      goal({ id: 'g2', status: 'archived' }),
      goal({ id: 'g3', arcId: 'arc-2' }),
    ];
    expect(countActiveGoalsForArc(goals, 'arc-1')).toBe(1);
  });

  it('allows a Free account to create more than three goals', () => {
    const goals = Array.from({ length: 10 }, (_, index) => goal({ id: `g${index}` }));
    expect(canCreateGoalInArc({ isPro: false, goals, arcId: 'arc-1' })).toEqual({
      ok: true,
      activeCount: 10,
    });
  });

  it('allows a Free account to create multiple Arcs', () => {
    const arcs = Array.from({ length: 5 }, (_, index) => arc({ id: `a${index}` }));
    expect(canCreateArc({ isPro: false, arcs })).toEqual({ ok: true, count: 5 });
  });
});
