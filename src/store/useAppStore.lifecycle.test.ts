import {
  mergeActivityViewsWithSystemDefaults,
  useAppStore,
  resetUserSpecificState,
} from './useAppStore';
import { useEntitlementsStore } from './useEntitlementsStore';
import { canCreateArc, canCreateGoalInArc, countActiveGoalsForArc } from '../domain/limits';
import type { Activity, ActivityView, Arc, Goal } from '../domain/types';

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

describe('activity view migrations', () => {
  it('preserves saved edits to system views during rehydrate migration', () => {
    const customizedDefault: ActivityView = {
      id: 'default',
      name: '🗂️ All to-dos',
      filterMode: 'all',
      sortMode: 'manual',
      sorts: [{ field: 'createdAt', direction: 'desc' }],
      showCompleted: false,
      isSystem: true,
    };

    const migrated = mergeActivityViewsWithSystemDefaults([customizedDefault]);
    const defaultView = migrated.find((view) => view.id === 'default');

    expect(defaultView?.sorts).toEqual([{ field: 'createdAt', direction: 'desc' }]);
    expect(defaultView?.showCompleted).toBe(false);
    expect(defaultView?.isSystem).toBe(true);
  });

  it('adds missing system views while preserving custom views', () => {
    const customView: ActivityView = {
      id: 'view-custom',
      name: 'Custom',
      filterMode: 'all',
      sortMode: 'manual',
      sorts: [{ field: 'priority', direction: 'asc' }],
      isSystem: false,
    };

    const migrated = mergeActivityViewsWithSystemDefaults([customView]);

    expect(migrated.map((view) => view.id)).toEqual([
      'default',
      'dueToday',
      'pastDue',
      'view-custom',
    ]);
    expect(migrated.find((view) => view.id === 'view-custom')?.sorts).toEqual([
      { field: 'priority', direction: 'asc' },
    ]);
  });
});

describe('recordShowUp streak grace', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setStreakState(overrides: {
    lastShowUpDate?: string;
    currentShowUpStreak?: number;
    streakGrace?: {
      freeDaysRemaining: number;
      lastFreeResetWeek: string | null;
      shieldsAvailable: number;
      graceDaysUsed: number;
    };
  }) {
    useAppStore.setState(overrides as any);
  }

  it('clears graceDaysUsed on a consecutive day so stale grace does not trigger false streak-saved', () => {
    // Simulate: grace was previously used (graceDaysUsed=1 is stale),
    // and the user's last show-up was yesterday (April 14).
    setStreakState({
      lastShowUpDate: '2026-04-14',
      currentShowUpStreak: 5,
      streakGrace: {
        freeDaysRemaining: 0,
        lastFreeResetWeek: '2026-W16',
        shieldsAvailable: 0,
        graceDaysUsed: 1, // stale from a previous grace event
      },
    });

    jest.setSystemTime(new Date(2026, 3, 15, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.lastShowUpDate).toBe('2026-04-15');
    expect(state.currentShowUpStreak).toBe(6);
    expect(state.lastStreakDateKey).toBe('2026-04-15');
    expect(state.currentCoveredShowUpStreak).toBe(6);
    expect(state.streakUpdatedAtIso).toBe('2026-04-15T16:00:00.000Z');
    expect(state.streakGrace?.graceDaysUsed).toBe(0);
  });

  it('sets graceDaysUsed when grace is legitimately used to cover missed days', () => {
    // User last showed up April 13, returns April 15 (missed April 14)
    setStreakState({
      lastShowUpDate: '2026-04-13',
      currentShowUpStreak: 5,
      streakGrace: {
        freeDaysRemaining: 1,
        lastFreeResetWeek: '2026-W16',
        shieldsAvailable: 0,
        graceDaysUsed: 0,
      },
    });

    jest.setSystemTime(new Date(2026, 3, 15, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.lastShowUpDate).toBe('2026-04-15');
    expect(state.currentShowUpStreak).toBe(6);
    expect(state.lastStreakDateKey).toBe('2026-04-15');
    expect(state.currentCoveredShowUpStreak).toBe(7);
    expect(state.streakUpdatedAtIso).toBe('2026-04-15T16:00:00.000Z');
    expect(state.streakGrace?.graceDaysUsed).toBe(1);
    expect(state.streakGrace?.freeDaysRemaining).toBe(0);
  });

  it('resets streak when missed days exceed available grace', () => {
    // User last showed up April 12, returns April 15 (missed 2 days, only 1 grace)
    setStreakState({
      lastShowUpDate: '2026-04-12',
      currentShowUpStreak: 5,
      streakGrace: {
        freeDaysRemaining: 1,
        lastFreeResetWeek: '2026-W16',
        shieldsAvailable: 0,
        graceDaysUsed: 0,
      },
    });

    jest.setSystemTime(new Date(2026, 3, 15, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.lastShowUpDate).toBe('2026-04-15');
    expect(state.currentShowUpStreak).toBe(1);
    expect(state.lastStreakDateKey).toBe('2026-04-15');
    expect(state.currentCoveredShowUpStreak).toBe(1);
    expect(state.streakUpdatedAtIso).toBe('2026-04-15T16:00:00.000Z');
    expect(state.streakGrace?.graceDaysUsed).toBe(0);
  });
});

describe('resetUserSpecificState', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
  });

  it('clears user-scoped fields', () => {
    // Set some user-specific state.
    useAppStore.setState({
      hasCompletedFirstTimeOnboarding: true,
      hasSeenFirstArcCelebration: true,
      hasSeenFirstGoalCelebration: true,
      lastOnboardingArcId: 'arc-123',
      lastOnboardingGoalId: 'goal-123',
      hasDismissedOnboardingGoalGuide: true,
      hasDismissedOnboardingActivitiesGuide: true,
      hasDismissedOnboardingPlanReadyGuide: true,
      lastShowUpDate: '2026-04-15',
      currentShowUpStreak: 6,
      lastStreakDateKey: '2026-04-15',
      currentCoveredShowUpStreak: 7,
      streakUpdatedAtIso: '2026-04-15T16:00:00.000Z',
    } as any);

    resetUserSpecificState();

    const state = useAppStore.getState();
    expect(state.hasCompletedFirstTimeOnboarding).toBe(false);
    expect(state.hasSeenFirstArcCelebration).toBe(false);
    expect(state.hasSeenFirstGoalCelebration).toBe(false);
    expect(state.lastOnboardingArcId).toBeNull();
    expect(state.lastOnboardingGoalId).toBeNull();
    expect(state.hasDismissedOnboardingGoalGuide).toBe(false);
    expect(state.hasDismissedOnboardingActivitiesGuide).toBe(false);
    expect(state.hasDismissedOnboardingPlanReadyGuide).toBe(false);
    expect(state.lastShowUpDate).toBeNull();
    expect(state.currentShowUpStreak).toBe(0);
    expect(state.lastStreakDateKey).toBeNull();
    expect(state.currentCoveredShowUpStreak).toBe(0);
    expect(state.streakUpdatedAtIso).toBeNull();
  });

  it('preserves device-level settings', () => {
    // Configure device-level prefs.
    useAppStore.setState({
      hapticsEnabled: false,
      soundscapeEnabled: false,
      focusOverlayColorIndex: 3,
      notificationPreferences: {
        ...useAppStore.getState().notificationPreferences,
        notificationsEnabled: true,
        allowDailyFocus: true,
      },
      // Also set something user-specific to verify it resets.
      hasCompletedFirstTimeOnboarding: true,
    } as any);

    resetUserSpecificState();

    const state = useAppStore.getState();
    // Device settings should be preserved.
    expect(state.hapticsEnabled).toBe(false);
    expect((state as any).soundscapeEnabled).toBe(false);
    expect((state as any).focusOverlayColorIndex).toBe(3);
    expect(state.notificationPreferences.notificationsEnabled).toBe(true);
    expect(state.notificationPreferences.allowDailyFocus).toBe(true);
    // User-specific should be reset.
    expect(state.hasCompletedFirstTimeOnboarding).toBe(false);
  });
});

describe('recordShowUp shield earning', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setStreakState(overrides: {
    lastShowUpDate?: string;
    currentShowUpStreak?: number;
    streakGrace?: {
      freeDaysRemaining: number;
      lastFreeResetWeek: string | null;
      shieldsAvailable: number;
      lastShieldEarnedWeekKey: string | null;
      graceDaysUsed: number;
    };
  }) {
    useAppStore.setState(overrides as any);
  }

  it('awards 1 shield when Pro user hits a 7-day streak milestone', () => {
    // User at day 6, about to become day 7.
    setStreakState({
      lastShowUpDate: '2026-01-06',
      currentShowUpStreak: 6,
      streakGrace: {
        freeDaysRemaining: 1,
        lastFreeResetWeek: '2026-W02',
        shieldsAvailable: 0,
        lastShieldEarnedWeekKey: null,
        graceDaysUsed: 0,
      },
    });

    useEntitlementsStore.setState({ isPro: true });
    jest.setSystemTime(new Date(2026, 0, 7, 10, 0, 0)); // Jan 7
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.currentShowUpStreak).toBe(7);
    expect(state.streakGrace?.shieldsAvailable).toBe(1);
    expect(state.streakGrace?.lastShieldEarnedWeekKey).not.toBeNull();
  });

  it('does not award a shield to free users', () => {
    setStreakState({
      lastShowUpDate: '2026-01-06',
      currentShowUpStreak: 6,
      streakGrace: {
        freeDaysRemaining: 1,
        lastFreeResetWeek: '2026-W02',
        shieldsAvailable: 0,
        lastShieldEarnedWeekKey: null,
        graceDaysUsed: 0,
      },
    });

    useEntitlementsStore.setState({ isPro: false });
    jest.setSystemTime(new Date(2026, 0, 7, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.currentShowUpStreak).toBe(7);
    expect(state.streakGrace?.shieldsAvailable).toBe(0);
  });

  it('does not exceed the cap of 3 shields', () => {
    setStreakState({
      lastShowUpDate: '2026-01-13',
      currentShowUpStreak: 13,
      streakGrace: {
        freeDaysRemaining: 1,
        lastFreeResetWeek: '2026-W03',
        shieldsAvailable: 3,
        lastShieldEarnedWeekKey: '2026-W02',
        graceDaysUsed: 0,
      },
    });

    useEntitlementsStore.setState({ isPro: true });
    jest.setSystemTime(new Date(2026, 0, 14, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.currentShowUpStreak).toBe(14);
    expect(state.streakGrace?.shieldsAvailable).toBe(3);
  });

  it('does not award more than 1 shield per week', () => {
    // Simulate a scenario where streak hits 14 (second multiple of 7)
    // but shield was already earned this week.
    const weekKey = '2026-W03';
    setStreakState({
      lastShowUpDate: '2026-01-13',
      currentShowUpStreak: 13,
      streakGrace: {
        freeDaysRemaining: 1,
        lastFreeResetWeek: weekKey,
        shieldsAvailable: 1,
        lastShieldEarnedWeekKey: weekKey,
        graceDaysUsed: 0,
      },
    });

    useEntitlementsStore.setState({ isPro: true });
    jest.setSystemTime(new Date(2026, 0, 14, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.currentShowUpStreak).toBe(14);
    expect(state.streakGrace?.shieldsAvailable).toBe(1);
  });

  it('does not award on non-multiple-of-7 streaks', () => {
    setStreakState({
      lastShowUpDate: '2026-01-05',
      currentShowUpStreak: 5,
      streakGrace: {
        freeDaysRemaining: 1,
        lastFreeResetWeek: '2026-W01',
        shieldsAvailable: 0,
        lastShieldEarnedWeekKey: null,
        graceDaysUsed: 0,
      },
    });

    useEntitlementsStore.setState({ isPro: true });
    jest.setSystemTime(new Date(2026, 0, 6, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.currentShowUpStreak).toBe(6);
    expect(state.streakGrace?.shieldsAvailable).toBe(0);
  });
});

describe('recordShowUp streak repair window', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setStreakState(overrides: Record<string, unknown>) {
    useAppStore.setState(overrides as any);
  }

  const REPAIR_WINDOW_MS = 48 * 60 * 60 * 1000;

  it('sets break state with 48h repair window when streak resets', () => {
    setStreakState({
      lastShowUpDate: '2026-04-12',
      currentShowUpStreak: 10,
      streakGrace: {
        freeDaysRemaining: 0,
        lastFreeResetWeek: '2026-W16',
        shieldsAvailable: 0,
        lastShieldEarnedWeekKey: null,
        graceDaysUsed: 0,
      },
    });

    const now = new Date(2026, 3, 15, 10, 0, 0);
    jest.setSystemTime(now);
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.currentShowUpStreak).toBe(1);
    expect(state.streakBreakState.brokenAtDateKey).toBe('2026-04-15');
    expect(state.streakBreakState.brokenStreakLength).toBe(10);
    expect(state.streakBreakState.eligibleRepairUntilMs).toBe(now.getTime() + REPAIR_WINDOW_MS);
    expect(state.streakBreakState.repairedAtMs).toBeNull();
  });

  it('restores streak when user returns within the repair window', () => {
    const breakTime = new Date(2026, 3, 15, 10, 0, 0);
    setStreakState({
      lastShowUpDate: '2026-04-15',
      currentShowUpStreak: 1,
      streakBreakState: {
        brokenAtDateKey: '2026-04-15',
        brokenStreakLength: 10,
        eligibleRepairUntilMs: breakTime.getTime() + REPAIR_WINDOW_MS,
        repairedAtMs: null,
      },
    });

    // Return the next day (within 48h window)
    const repairTime = new Date(2026, 3, 16, 8, 0, 0);
    jest.setSystemTime(repairTime);
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.currentShowUpStreak).toBe(11); // 10 + 1 (restored)
    expect(state.streakBreakState.brokenAtDateKey).toBeNull();
    expect(state.streakBreakState.repairedAtMs).toBe(repairTime.getTime());
  });

  it('does NOT restore streak when repair window has expired', () => {
    const breakTime = new Date(2026, 3, 13, 10, 0, 0);
    setStreakState({
      lastShowUpDate: '2026-04-13',
      currentShowUpStreak: 1,
      streakBreakState: {
        brokenAtDateKey: '2026-04-13',
        brokenStreakLength: 10,
        eligibleRepairUntilMs: breakTime.getTime() + REPAIR_WINDOW_MS, // expires April 15 10:00
        repairedAtMs: null,
      },
    });

    // Return after the window expired
    const lateReturn = new Date(2026, 3, 16, 12, 0, 0);
    jest.setSystemTime(lateReturn);
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.currentShowUpStreak).toBe(1); // stays at 1 (no repair)
    expect(state.streakBreakState.repairedAtMs).toBeNull();
  });

  it('clears break state on resetShowUpStreak', () => {
    setStreakState({
      streakBreakState: {
        brokenAtDateKey: '2026-04-15',
        brokenStreakLength: 5,
        eligibleRepairUntilMs: Date.now() + REPAIR_WINDOW_MS,
        repairedAtMs: null,
      },
    });

    useAppStore.getState().resetShowUpStreak();

    const state = useAppStore.getState();
    expect(state.streakBreakState.brokenAtDateKey).toBeNull();
    expect(state.streakBreakState.brokenStreakLength).toBeNull();
    expect(state.lastStreakDateKey).toBeNull();
    expect(state.currentCoveredShowUpStreak).toBe(0);
    expect(state.streakUpdatedAtIso).not.toBeNull();
  });

  it('does not set break state when prevStreak is 0 (fresh start)', () => {
    setStreakState({
      lastShowUpDate: null,
      currentShowUpStreak: 0,
    });

    jest.setSystemTime(new Date(2026, 3, 15, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    const state = useAppStore.getState();
    expect(state.currentShowUpStreak).toBe(1);
    expect(state.streakBreakState.brokenAtDateKey).toBeNull();
  });
});

describe('proPreview store actions', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
  });

  it('setProPreview sets the preview and clearProPreview clears it', () => {
    expect(useAppStore.getState().proPreview).toBeNull();

    useAppStore.getState().setProPreview({ feature: 'focus_mode', expiresAtMs: Date.now() + 86400000 });
    expect(useAppStore.getState().proPreview).toEqual({
      feature: 'focus_mode',
      expiresAtMs: expect.any(Number),
    });

    useAppStore.getState().clearProPreview();
    expect(useAppStore.getState().proPreview).toBeNull();
  });

  it('setProPreview replaces any existing preview', () => {
    useAppStore.getState().setProPreview({ feature: 'focus_mode', expiresAtMs: Date.now() + 86400000 });
    useAppStore.getState().setProPreview({ feature: 'saved_views', expiresAtMs: Date.now() + 259200000 });

    const preview = useAppStore.getState().proPreview;
    expect(preview?.feature).toBe('saved_views');
  });
});

describe('activityCompletionHours tracking', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('recordShowUp appends the current hour to activityCompletionHours', () => {
    jest.setSystemTime(new Date(2026, 3, 15, 14, 30, 0)); // 2:30 PM
    useAppStore.getState().recordShowUp();

    const hours = useAppStore.getState().activityCompletionHours;
    expect(hours).toContain(14);
  });

  it('caps activityCompletionHours at 14 entries', () => {
    useAppStore.setState({
      activityCompletionHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    } as any);

    jest.setSystemTime(new Date(2026, 3, 15, 7, 0, 0));
    useAppStore.getState().recordShowUp();

    const hours = useAppStore.getState().activityCompletionHours;
    expect(hours.length).toBe(14);
    expect(hours[hours.length - 1]).toBe(7);
    expect(hours[0]).toBe(9); // first entry (8) was dropped
  });

  it('does not duplicate hours when showing up twice on the same day', () => {
    jest.setSystemTime(new Date(2026, 3, 15, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    const hoursAfterFirst = useAppStore.getState().activityCompletionHours.length;

    jest.setSystemTime(new Date(2026, 3, 15, 14, 0, 0));
    useAppStore.getState().recordShowUp();

    // Second call on the same day should not add another entry
    expect(useAppStore.getState().activityCompletionHours.length).toBe(hoursAfterFirst);
  });
});

describe('weekly recap dismiss', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
  });

  it('dismissWeeklyRecap persists the week key', () => {
    expect(useAppStore.getState().lastWeeklyRecapDismissedWeekKey).toBeNull();

    useAppStore.getState().dismissWeeklyRecap('2026-W16');

    expect(useAppStore.getState().lastWeeklyRecapDismissedWeekKey).toBe('2026-W16');
  });
});
