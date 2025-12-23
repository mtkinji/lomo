import { useAppStore } from './useAppStore';
import { canCreateArc, canCreateGoalInArc, countActiveGoalsForArc } from '../domain/limits';
import type { Activity, Arc, Goal } from '../domain/types';

function arc(overrides: Partial<Arc> = {}): Arc {
  const nowIso = new Date('2026-01-01T12:00:00.000Z').toISOString();
  return {
    id: 'arc-1',
    name: 'Arc',
    status: 'active',
    startDate: nowIso,
    endDate: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  const nowIso = new Date('2026-01-01T12:00:00.000Z').toISOString();
  return {
    id: 'goal-1',
    arcId: 'arc-1',
    title: 'Goal',
    status: 'planned',
    forceIntent: {},
    metrics: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    ...overrides,
  };
}

function activity(overrides: Partial<Activity> = {}): Activity {
  const nowIso = new Date('2026-01-01T12:00:00.000Z').toISOString();
  return {
    id: 'act-1',
    goalId: 'goal-1',
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: nowIso,
    updatedAt: nowIso,
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

describe('useAppStore object lifecycles', () => {
  beforeEach(() => {
    // Reset persisted state between tests (also keeps tests independent).
    useAppStore.getState().resetStore();
  });

  it('removeArc is destructive and cascades to goals + activities for that arc', () => {
    const a1 = arc({ id: 'arc-1', name: 'Arc 1' });
    const a2 = arc({ id: 'arc-2', name: 'Arc 2' });
    useAppStore.getState().addArc(a1);
    useAppStore.getState().addArc(a2);

    const g1 = goal({ id: 'goal-1', arcId: 'arc-1', title: 'G1' });
    const g2 = goal({ id: 'goal-2', arcId: 'arc-2', title: 'G2' });
    useAppStore.getState().addGoal(g1);
    useAppStore.getState().addGoal(g2);

    const act1 = activity({ id: 'act-1', goalId: 'goal-1', title: 'A1' });
    const act2 = activity({ id: 'act-2', goalId: 'goal-2', title: 'A2' });
    useAppStore.getState().addActivity(act1);
    useAppStore.getState().addActivity(act2);

    useAppStore.getState().removeArc('arc-1');

    const state = useAppStore.getState();
    expect(state.arcs.map((a) => a.id)).toEqual(['arc-2']);
    expect(state.goals.map((g) => g.id)).toEqual(['goal-2']);
    expect(state.activities.map((a) => a.id)).toEqual(['act-2']);
  });

  it('removeGoal is destructive and cascades to activities for that goal', () => {
    const a1 = arc({ id: 'arc-1' });
    useAppStore.getState().addArc(a1);

    const g1 = goal({ id: 'goal-1', arcId: 'arc-1' });
    const g2 = goal({ id: 'goal-2', arcId: 'arc-1' });
    useAppStore.getState().addGoal(g1);
    useAppStore.getState().addGoal(g2);

    useAppStore.getState().addActivity(activity({ id: 'act-1', goalId: 'goal-1' }));
    useAppStore.getState().addActivity(activity({ id: 'act-2', goalId: 'goal-2' }));

    useAppStore.getState().removeGoal('goal-1');

    const state = useAppStore.getState();
    expect(state.goals.map((g) => g.id)).toEqual(['goal-2']);
    expect(state.activities.map((a) => a.id)).toEqual(['act-2']);
  });

  it('archive/restore is a status change (non-destructive) for arcs', () => {
    useAppStore.getState().addArc(arc({ id: 'arc-1', status: 'active' }));

    useAppStore.getState().updateArc('arc-1', (prev) => ({ ...prev, status: 'archived' }));
    expect(useAppStore.getState().arcs[0]?.status).toBe('archived');

    useAppStore.getState().updateArc('arc-1', (prev) => ({ ...prev, status: 'active' }));
    expect(useAppStore.getState().arcs[0]?.status).toBe('active');
  });

  it('archiving a goal is non-destructive (goal + activities remain)', () => {
    useAppStore.getState().addArc(arc({ id: 'arc-1' }));
    useAppStore.getState().addGoal(goal({ id: 'goal-1', arcId: 'arc-1', status: 'planned' }));
    useAppStore.getState().addActivity(activity({ id: 'act-1', goalId: 'goal-1' }));

    useAppStore.getState().updateGoal('goal-1', (prev) => ({ ...prev, status: 'archived' }));

    const state = useAppStore.getState();
    expect(state.goals.find((g) => g.id === 'goal-1')?.status).toBe('archived');
    expect(state.activities.find((a) => a.id === 'act-1')?.goalId).toBe('goal-1');
  });

  it('free-tier arc limit counts total arcs, even if archived', () => {
    const isPro = false;
    const a1 = arc({ id: 'arc-1', status: 'archived' });
    expect(canCreateArc({ isPro, arcs: [a1] })).toEqual({
      ok: false,
      reason: 'limit_arcs_total',
      count: 1,
      limit: 1,
    });
  });

  it('free-tier goal limit counts non-archived goals (completed still counts unless archived)', () => {
    const isPro = false;
    const arcId = 'arc-1';

    const goals: Goal[] = [
      goal({ id: 'g1', arcId, status: 'planned' }),
      goal({ id: 'g2', arcId, status: 'completed' }), // still counts
      goal({ id: 'g3', arcId, status: 'archived' }), // does NOT count
    ];

    expect(countActiveGoalsForArc(goals, arcId)).toBe(2);
    expect(canCreateGoalInArc({ isPro, goals, arcId })).toEqual({
      ok: true,
      activeCount: 2,
      limit: 3,
    });
  });

  it('free-tier goal limit blocks creating the 4th non-archived goal in an arc', () => {
    const isPro = false;
    const arcId = 'arc-1';

    const goals: Goal[] = [
      goal({ id: 'g1', arcId, status: 'planned' }),
      goal({ id: 'g2', arcId, status: 'in_progress' }),
      goal({ id: 'g3', arcId, status: 'completed' }),
    ];

    expect(canCreateGoalInArc({ isPro, goals, arcId })).toEqual({
      ok: false,
      reason: 'limit_goals_per_arc',
      activeCount: 3,
      limit: 3,
    });
  });
});


