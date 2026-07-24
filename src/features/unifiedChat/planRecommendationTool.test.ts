import type { Activity, Goal, UserProfile } from '../../domain/types';
import {
  buildPlanRecommendations,
  resolvePlanTargetDate,
} from './planRecommendationTool';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1', goalId: null, title: 'Call the school', type: 'task', tags: [],
    status: 'planned', forceActual: {}, createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z', reminderAt: null, scheduledDate: null,
    scheduledAt: null, estimateMinutes: 30, ...overrides,
  } as Activity;
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1', arcId: null, title: 'Get ready for school', status: 'planned',
    forceIntent: {}, metrics: [], createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z', ...overrides,
  };
}

function profile(): UserProfile {
  return {
    planAvailability: {
      days: {
        4: {
          enabled: true,
          windows: [
            { start: '09:00', end: '12:00', mode: 'personal' },
            { start: '09:00', end: '12:00', mode: 'work' },
          ],
        },
      },
    },
  } as unknown as UserProfile;
}

describe('planRecommendationTool', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 22, 8));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('resolves tomorrow in local calendar time', () => {
    const target = resolvePlanTargetDate(new Date(2026, 6, 22, 23, 45), 'tomorrow');
    expect([target.getFullYear(), target.getMonth(), target.getDate(), target.getHours()]).toEqual([
      2026, 6, 23, 12,
    ]);
  });

  test('returns a bounded ordered set and excludes closed or already scheduled Activities', () => {
    const result = buildPlanRecommendations({
      activities: [
        activity({ id: 'first', title: 'Call the school', goalId: 'goal-1', priority: 1 }),
        activity({ id: 'done', title: 'Already finished', status: 'done', priority: 1 }),
        activity({ id: 'scheduled', title: 'Already placed', scheduledAt: '2099-07-23T10:00:00.000Z', priority: 1 }),
        activity({ id: 'second', title: 'Pack lunch', priority: 2 }),
        activity({ id: 'third', title: 'Set clothes out', priority: 3 }),
      ],
      goals: [goal()], arcs: [], userProfile: profile(),
      targetDate: new Date(2026, 6, 23, 12), busyIntervals: [],
      writeCalendarId: 'calendar-1', maxItems: 2,
    });

    expect(result.recommendations.map((item) => item.activityId)).toEqual(['first', 'second']);
    expect(result.recommendations[0]).toEqual(expect.objectContaining({
      title: 'Call the school', goalTitle: 'Get ready for school', priorityPosition: 0,
      placement: expect.objectContaining({ status: 'placed' }),
    }));
  });

  test.each([
    { writeCalendarId: null, busyIntervals: [], reason: 'no_write_calendar' },
    {
      writeCalendarId: 'calendar-1',
      busyIntervals: [{ start: new Date(2026, 6, 23, 0), end: new Date(2026, 6, 24, 0) }],
      reason: 'no_open_slot',
    },
  ])('keeps a recommendation visible when placement is limited: $reason', ({ writeCalendarId, busyIntervals, reason }) => {
    const result = buildPlanRecommendations({
      activities: [activity({ priority: 1 })], goals: [], arcs: [], userProfile: profile(),
      targetDate: new Date(2026, 6, 23, 12), busyIntervals, writeCalendarId, maxItems: 1,
    });

    expect(result.recommendations).toEqual([
      expect.objectContaining({
        activityId: 'activity-1',
        placement: { status: 'unplaced', reason },
      }),
    ]);
  });
});
