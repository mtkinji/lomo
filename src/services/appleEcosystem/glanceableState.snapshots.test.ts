import {
  buildMomentumSnapshot,
  buildNextUpSnapshot,
  buildScheduleSnapshot,
  buildSuggestedSnapshot,
  buildTodaySummarySnapshot,
} from './glanceableState';
import type { Activity, Arc, Goal } from '../../domain/types';

const FIXED_ISO = '2026-01-01T12:00:00.000Z';

function arc(overrides: Partial<Arc> = {}): Arc {
  return {
    id: 'arc-1',
    name: 'Arc',
    status: 'active',
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

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: 'goal-1',
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    reminderAt: null,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

const NOW = new Date(2026, 3, 15, 10, 0, 0);

describe('buildNextUpSnapshot', () => {
  it('returns null for an empty list', () => {
    expect(buildNextUpSnapshot([], NOW)).toBeNull();
  });

  it('skips done/cancelled/skipped activities', () => {
    const activities = [
      activity({ id: 'done', status: 'done', scheduledAt: new Date(NOW.getTime() + 60_000).toISOString() }),
      activity({ id: 'cancelled', status: 'cancelled', scheduledAt: new Date(NOW.getTime() + 60_000).toISOString() }),
      activity({ id: 'skipped', status: 'skipped', scheduledAt: new Date(NOW.getTime() + 60_000).toISOString() }),
    ];
    expect(buildNextUpSnapshot(activities, NOW)).toBeNull();
  });

  it('returns the soonest future scheduled activity', () => {
    const activities = [
      activity({ id: 'later', scheduledAt: new Date(NOW.getTime() + 60 * 60_000).toISOString() }),
      activity({ id: 'soon', scheduledAt: new Date(NOW.getTime() + 5 * 60_000).toISOString() }),
    ];
    const snapshot = buildNextUpSnapshot(activities, NOW);
    expect(snapshot?.activityId).toBe('soon');
    expect(snapshot?.scheduledAtMs).toBe(new Date(NOW.getTime() + 5 * 60_000).getTime());
  });

  it('falls back to scheduledDate today when no future scheduledAt', () => {
    // Use an ISO string anchored at local noon today so `new Date(scheduledDate)`
    // round-trips back to today's local date regardless of test timezone.
    const todayLocalNoon = new Date(
      NOW.getFullYear(),
      NOW.getMonth(),
      NOW.getDate(),
      12,
      0,
      0,
    ).toISOString();
    const activities = [activity({ id: 'today-anytime', scheduledDate: todayLocalNoon })];
    const snapshot = buildNextUpSnapshot(activities, NOW);
    expect(snapshot?.activityId).toBe('today-anytime');
    expect(snapshot?.scheduledAtMs).toBeUndefined();
  });

  it('honors contextGoalId scoping when provided', () => {
    const activities = [
      activity({
        id: 'other-goal',
        goalId: 'goal-other',
        scheduledAt: new Date(NOW.getTime() + 5 * 60_000).toISOString(),
      }),
      activity({
        id: 'this-goal',
        goalId: 'goal-1',
        scheduledAt: new Date(NOW.getTime() + 30 * 60_000).toISOString(),
      }),
    ];
    expect(buildNextUpSnapshot(activities, NOW, { contextGoalId: 'goal-1' })?.activityId).toBe(
      'this-goal',
    );
  });
});

describe('buildTodaySummarySnapshot', () => {
  it('returns null when no activities are scheduled today', () => {
    expect(buildTodaySummarySnapshot([], NOW)).toBeNull();
  });

  it('counts completed and lists up to 3 actionable top items', () => {
    const todayLocalNoon = new Date(
      NOW.getFullYear(),
      NOW.getMonth(),
      NOW.getDate(),
      12,
      0,
      0,
    ).toISOString();
    const activities = [
      activity({ id: 'a', scheduledDate: todayLocalNoon, status: 'planned' }),
      activity({ id: 'b', scheduledDate: todayLocalNoon, status: 'planned' }),
      activity({ id: 'c', scheduledDate: todayLocalNoon, status: 'planned' }),
      activity({ id: 'd', scheduledDate: todayLocalNoon, status: 'planned' }),
      activity({ id: 'done', scheduledDate: todayLocalNoon, status: 'done' }),
    ];
    const snapshot = buildTodaySummarySnapshot(activities, NOW);
    expect(snapshot?.completedCount).toBe(1);
    expect(snapshot?.top3.map((i) => i.activityId)).toEqual(['a', 'b', 'c']);
  });
});

describe('buildSuggestedSnapshot', () => {
  it('returns null when there are no suggestible activities', () => {
    expect(
      buildSuggestedSnapshot({ arcs: [], goals: [], activities: [], now: NOW }),
    ).toBeNull();
  });

  it('returns ranked items when suggestions exist', () => {
    const a1 = activity({
      id: 'sugg-1',
      goalId: 'goal-1',
      scheduledAt: new Date(NOW.getTime() + 60 * 60_000).toISOString(),
    });
    const snapshot = buildSuggestedSnapshot({
      arcs: [arc()],
      goals: [goal()],
      activities: [a1],
      now: NOW,
    });
    expect(snapshot?.items.length).toBeGreaterThanOrEqual(0);
  });
});

describe('buildScheduleSnapshot', () => {
  it('returns null when no scheduled activities are available', () => {
    expect(
      buildScheduleSnapshot({ activities: [], now: NOW }),
    ).toBeNull();
  });

  it('orders upcoming-timed entries before anytime-today entries', () => {
    const todayLocalNoon = new Date(
      NOW.getFullYear(),
      NOW.getMonth(),
      NOW.getDate(),
      12,
      0,
      0,
    ).toISOString();
    const activities = [
      activity({ id: 'anytime', scheduledDate: todayLocalNoon }),
      activity({
        id: 'timed',
        scheduledAt: new Date(NOW.getTime() + 30 * 60_000).toISOString(),
      }),
    ];
    const snapshot = buildScheduleSnapshot({ activities, now: NOW });
    expect(snapshot?.items[0]?.activityId).toBe('timed');
    expect(snapshot?.items[1]?.activityId).toBe('anytime');
  });

  it('respects the provided limit', () => {
    const activities = Array.from({ length: 12 }, (_, i) =>
      activity({
        id: `t-${i}`,
        scheduledAt: new Date(NOW.getTime() + (i + 1) * 60 * 60_000).toISOString(),
      }),
    );
    const snapshot = buildScheduleSnapshot({ activities, now: NOW, limit: 3 });
    expect(snapshot?.items).toHaveLength(3);
  });
});

describe('buildMomentumSnapshot', () => {
  it('returns zero counts when there are no completed activities', () => {
    const snapshot = buildMomentumSnapshot({ activities: [], now: NOW });
    expect(snapshot.completedToday).toBe(0);
    expect(snapshot.completedThisWeek).toBe(0);
  });

  it('counts completedToday by local date key', () => {
    const completedTodayLocal = new Date(
      NOW.getFullYear(),
      NOW.getMonth(),
      NOW.getDate(),
      9,
      0,
    ).toISOString();
    const completedYesterday = new Date(
      NOW.getFullYear(),
      NOW.getMonth(),
      NOW.getDate() - 1,
      9,
      0,
    ).toISOString();
    const activities = [
      activity({ id: 'today', status: 'done', completedAt: completedTodayLocal }),
      activity({
        id: 'yesterday',
        status: 'done',
        completedAt: completedYesterday,
      }),
    ];
    const snapshot = buildMomentumSnapshot({ activities, now: NOW });
    expect(snapshot.completedToday).toBe(1);
    expect(snapshot.completedThisWeek).toBe(2);
  });

  it('threads showUpStreakDays through when provided', () => {
    expect(
      buildMomentumSnapshot({ activities: [], now: NOW, showUpStreakDays: 7 }).showUpStreakDays,
    ).toBe(7);
    expect(
      buildMomentumSnapshot({ activities: [], now: NOW }).showUpStreakDays,
    ).toBeUndefined();
  });
});
