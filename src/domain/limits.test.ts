import {
  FREE_MAX_ACTIVE_GOALS_PER_ARC,
  FREE_MAX_ARCS_TOTAL,
  canCreateArc,
  canCreateGoalInArc,
  countActiveGoalsForArc,
  isActiveGoalForLimit,
} from './limits';
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

describe('isActiveGoalForLimit', () => {
  it('returns false for archived goals regardless of qualityState', () => {
    expect(isActiveGoalForLimit(goal({ status: 'archived' }))).toBe(false);
    expect(
      isActiveGoalForLimit(goal({ status: 'archived', qualityState: 'draft' })),
    ).toBe(false);
    expect(
      isActiveGoalForLimit(goal({ status: 'archived', qualityState: 'ready' })),
    ).toBe(false);
  });

  it('returns false for draft goals (regardless of status)', () => {
    expect(isActiveGoalForLimit(goal({ qualityState: 'draft' }))).toBe(false);
    expect(
      isActiveGoalForLimit(goal({ status: 'in_progress', qualityState: 'draft' })),
    ).toBe(false);
  });

  it('returns true for completed but not archived goals (still counts)', () => {
    expect(isActiveGoalForLimit(goal({ status: 'completed' }))).toBe(true);
    expect(
      isActiveGoalForLimit(goal({ status: 'completed', qualityState: 'ready' })),
    ).toBe(true);
  });

  it('returns true for in-progress / planned non-draft goals', () => {
    expect(isActiveGoalForLimit(goal({ status: 'planned' }))).toBe(true);
    expect(isActiveGoalForLimit(goal({ status: 'in_progress' }))).toBe(true);
    expect(
      isActiveGoalForLimit(goal({ qualityState: 'ready' })),
    ).toBe(true);
  });
});

describe('countActiveGoalsForArc', () => {
  it('counts only goals belonging to the requested arc', () => {
    const goals: Goal[] = [
      goal({ id: 'g1', arcId: 'arc-1' }),
      goal({ id: 'g2', arcId: 'arc-2' }),
      goal({ id: 'g3', arcId: 'arc-1' }),
    ];
    expect(countActiveGoalsForArc(goals, 'arc-1')).toBe(2);
    expect(countActiveGoalsForArc(goals, 'arc-2')).toBe(1);
    expect(countActiveGoalsForArc(goals, 'arc-missing')).toBe(0);
  });

  it('excludes archived and draft goals from the count', () => {
    const goals: Goal[] = [
      goal({ id: 'g1', arcId: 'arc-1' }),
      goal({ id: 'g2', arcId: 'arc-1', status: 'archived' }),
      goal({ id: 'g3', arcId: 'arc-1', qualityState: 'draft' }),
      goal({ id: 'g4', arcId: 'arc-1', status: 'completed' }),
    ];
    expect(countActiveGoalsForArc(goals, 'arc-1')).toBe(2);
  });
});

describe('canCreateGoalInArc', () => {
  it('returns ok=true for Pro users regardless of count', () => {
    const goals: Goal[] = Array.from({ length: 10 }, (_, i) =>
      goal({ id: `g${i}`, arcId: 'arc-1' }),
    );
    const result = canCreateGoalInArc({ isPro: true, goals, arcId: 'arc-1' });
    expect(result.ok).toBe(true);
    expect(result.limit).toBe(FREE_MAX_ACTIVE_GOALS_PER_ARC);
  });

  it('returns ok=true for free users below the limit', () => {
    const goals: Goal[] = [
      goal({ id: 'g1', arcId: 'arc-1' }),
      goal({ id: 'g2', arcId: 'arc-1' }),
    ];
    const result = canCreateGoalInArc({ isPro: false, goals, arcId: 'arc-1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.activeCount).toBe(2);
      expect(result.limit).toBe(FREE_MAX_ACTIVE_GOALS_PER_ARC);
    }
  });

  it('returns ok=false with reason when free user is at limit', () => {
    const goals: Goal[] = Array.from({ length: FREE_MAX_ACTIVE_GOALS_PER_ARC }, (_, i) =>
      goal({ id: `g${i}`, arcId: 'arc-1' }),
    );
    const result = canCreateGoalInArc({ isPro: false, goals, arcId: 'arc-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('limit_goals_per_arc');
      expect(result.activeCount).toBe(FREE_MAX_ACTIVE_GOALS_PER_ARC);
    }
  });

  it('does not count archived/draft goals towards the free limit', () => {
    const goals: Goal[] = [
      goal({ id: 'g1', arcId: 'arc-1' }),
      goal({ id: 'g2', arcId: 'arc-1', status: 'archived' }),
      goal({ id: 'g3', arcId: 'arc-1', qualityState: 'draft' }),
      goal({ id: 'g4', arcId: 'arc-1', status: 'archived', qualityState: 'draft' }),
    ];
    const result = canCreateGoalInArc({ isPro: false, goals, arcId: 'arc-1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.activeCount).toBe(1);
    }
  });

  it('does not let goals from other arcs cross-contaminate counts', () => {
    const goals: Goal[] = [
      goal({ id: 'g1', arcId: 'arc-1' }),
      goal({ id: 'g2', arcId: 'arc-1' }),
      goal({ id: 'g3', arcId: 'arc-1' }),
      goal({ id: 'g4', arcId: 'arc-2' }),
    ];
    const result = canCreateGoalInArc({ isPro: false, goals, arcId: 'arc-2' });
    expect(result.ok).toBe(true);
  });
});

describe('canCreateArc', () => {
  it('returns ok=true for Pro users regardless of count', () => {
    const arcs: Arc[] = Array.from({ length: 5 }, (_, i) =>
      arc({ id: `arc-${i}`, name: `Arc ${i}` }),
    );
    const result = canCreateArc({ isPro: true, arcs });
    expect(result.ok).toBe(true);
  });

  it('returns ok=true for free users below the limit', () => {
    const result = canCreateArc({ isPro: false, arcs: [] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.count).toBe(0);
      expect(result.limit).toBe(FREE_MAX_ARCS_TOTAL);
    }
  });

  it('returns ok=false with reason when free user is at the arc limit', () => {
    const arcs: Arc[] = Array.from({ length: FREE_MAX_ARCS_TOTAL }, (_, i) =>
      arc({ id: `arc-${i}`, name: `Arc ${i}` }),
    );
    const result = canCreateArc({ isPro: false, arcs });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('limit_arcs_total');
      expect(result.count).toBe(FREE_MAX_ARCS_TOTAL);
    }
  });
});
