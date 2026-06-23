import type { Activity, Goal } from '../../domain/types';
import {
  createRankKeyBetween,
  getActivityPriorityReasonLabel,
  getActivityPriorityState,
  getRecommendedPriorityActivities,
  rankActivitiesBySmartOrder,
} from './activityPriority';

const NOW = new Date('2026-06-22T12:00:00.000Z');

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    arcId: null,
    title: 'Goal',
    status: 'planned',
    forceIntent: {},
    metrics: [],
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  };
}

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: null,
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

describe('activity priority model', () => {
  it('treats missing priorityState as active', () => {
    expect(getActivityPriorityState(activity())).toBe('active');
  });

  it('excludes exception and closed states from recommendations', () => {
    const recommendations = getRecommendedPriorityActivities({
      activities: [
        activity({ id: 'ready', priority: 1 }),
        activity({ id: 'later', priority: 1, priorityState: 'later' }),
        activity({ id: 'waiting', priority: 1, priorityState: 'waiting' }),
        activity({ id: 'review', priority: 1, priorityState: 'needs_review' }),
        activity({ id: 'done', priority: 1, status: 'done' }),
        activity({ id: 'skipped', priority: 1, status: 'skipped' }),
        activity({ id: 'cancelled', priority: 1, status: 'cancelled' }),
      ],
      goals: [],
      now: NOW,
    });

    expect(recommendations.map((row) => row.activity.id)).toEqual(['ready']);
  });

  it('ranks explicit activity priority and parent goal priority above ordinary active to-dos', () => {
    const ranked = rankActivitiesBySmartOrder({
      activities: [
        activity({ id: 'ordinary', goalId: null }),
        activity({ id: 'activity-priority', priority: 1 }),
        activity({ id: 'goal-priority', goalId: 'goal-important' }),
      ],
      goals: [goal({ id: 'goal-important', priority: 1 })],
      now: NOW,
    });

    expect(ranked.map((row) => row.activity.id)).toEqual([
      'activity-priority',
      'goal-priority',
      'ordinary',
    ]);
  });

  it('uses due and reminder dates as ranking signals', () => {
    const ranked = rankActivitiesBySmartOrder({
      activities: [
        activity({ id: 'no-date' }),
        activity({ id: 'reminder-soon', reminderAt: '2026-06-22T13:00:00.000Z' }),
        activity({ id: 'due-today', scheduledDate: '2026-06-22' }),
      ],
      goals: [],
      now: NOW,
    });

    expect(ranked.map((row) => row.activity.id)).toEqual([
      'due-today',
      'reminder-soon',
      'no-date',
    ]);
  });

  it('caps recommendations at the requested limit', () => {
    const recommendations = getRecommendedPriorityActivities({
      activities: [1, 2, 3, 4, 5].map((n) =>
        activity({ id: `act-${n}`, priority: 1, updatedAt: `2026-06-0${n}T12:00:00.000Z` }),
      ),
      goals: [],
      now: NOW,
      limit: 3,
    });

    expect(recommendations).toHaveLength(3);
  });

  it('returns the highest priority visible reason label', () => {
    expect(getActivityPriorityReasonLabel(['recently_updated', 'due_today', 'goal_priority'])).toBe(
      'Due today',
    );
    expect(getActivityPriorityReasonLabel([])).toBeNull();
  });

  it('creates sortable rank keys at the beginning, middle, and end', () => {
    const first = createRankKeyBetween(null, 'm');
    const middle = createRankKeyBetween('m', 't');
    const last = createRankKeyBetween('t', null);

    expect(first < 'm').toBe(true);
    expect(middle > 'm').toBe(true);
    expect(middle < 't').toBe(true);
    expect(last > 't').toBe(true);
  });
});
