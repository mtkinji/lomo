import type { Activity } from './types';
import {
  buildNextRecurringActivity,
  describeRepeatLifecycle,
  getNextOccurrenceDate,
  shouldAdvanceRecurringActivity,
} from './activityRecurrence';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: 'goal-1',
    title: 'Weekly react',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-06-08T12:00:00.000Z',
    updatedAt: '2026-06-08T12:00:00.000Z',
    scheduledDate: '2026-06-08',
    reminderAt: '2026-06-08T15:00:00.000Z',
    repeatRule: 'weekly',
    repeatCustom: undefined,
    ...overrides,
  } as Activity;
}

describe('activity recurrence lifecycle', () => {
  it('advances an overdue weekly occurrence to the next future weekly date without backfilling missed weeks', () => {
    const next = buildNextRecurringActivity({
      activity: activity(),
      closedAtIso: '2026-07-06T18:00:00.000Z',
    });

    expect(next).toMatchObject({
      id: 'activity-repeat-act-1-2026-07-13',
      repeatSeriesId: 'act-1',
      repeatCreatedFromActivityId: 'act-1',
      scheduledDate: '2026-07-13',
      reminderAt: '2026-07-13T15:00:00.000Z',
      status: 'planned',
      completedAt: null,
    });
  });

  it('resets copied checklist steps on the next occurrence', () => {
    const next = buildNextRecurringActivity({
      activity: activity({
        steps: [
          { id: 's1', title: 'Open notes', completedAt: '2026-07-06T18:00:00.000Z' },
          { id: 's2', title: 'Write reaction', completedAt: null },
        ],
      }),
      closedAtIso: '2026-07-06T18:00:00.000Z',
    });

    expect(next?.steps).toEqual([
      { id: 's1', title: 'Open notes', completedAt: null },
      { id: 's2', title: 'Write reaction', completedAt: null },
    ]);
  });

  it('advances weekdays to the next weekday after the closed occurrence', () => {
    const nextDate = getNextOccurrenceDate({
      activity: activity({
        repeatRule: 'weekdays',
        scheduledDate: '2026-07-03',
        reminderAt: '2026-07-03T14:00:00.000Z',
      }),
      closedAt: new Date('2026-07-03T16:00:00.000Z'),
    });

    expect(nextDate?.toISOString()).toBe('2026-07-06T14:00:00.000Z');
  });

  it('supports custom weekly intervals with selected weekdays', () => {
    const nextDate = getNextOccurrenceDate({
      activity: activity({
        repeatRule: 'custom',
        repeatCustom: { cadence: 'weeks', interval: 2, weekdays: [1, 4] },
        scheduledDate: '2026-06-08',
        reminderAt: '2026-06-08T15:00:00.000Z',
      }),
      closedAt: new Date('2026-06-09T18:00:00.000Z'),
    });

    expect(nextDate?.toISOString()).toBe('2026-06-11T15:00:00.000Z');
  });

  it('supports after-completion custom day intervals', () => {
    const next = buildNextRecurringActivity({
      activity: activity({
        repeatRule: 'custom',
        repeatCustom: { cadence: 'days', interval: 10 },
        repeatBasis: 'after_completion',
        scheduledDate: '2026-06-08',
        reminderAt: '2026-06-08T09:30:00.000Z',
      }),
      closedAtIso: '2026-07-06T18:00:00.000Z',
    });

    expect(next?.scheduledDate).toBe('2026-07-16');
    expect(next?.reminderAt).toBe('2026-07-16T09:30:00.000Z');
  });

  it('only advances when an open recurring activity is completed or skipped', () => {
    expect(
      shouldAdvanceRecurringActivity({
        prev: activity({ status: 'planned' }),
        next: activity({ status: 'done' }),
      }),
    ).toBe(true);
    expect(
      shouldAdvanceRecurringActivity({
        prev: activity({ status: 'planned' }),
        next: activity({ status: 'skipped' }),
      }),
    ).toBe(true);
    expect(
      shouldAdvanceRecurringActivity({
        prev: activity({ status: 'done' }),
        next: activity({ status: 'planned' }),
      }),
    ).toBe(false);
    expect(
      shouldAdvanceRecurringActivity({
        prev: activity({ repeatRule: undefined }),
        next: activity({ repeatRule: undefined, status: 'done' }),
      }),
    ).toBe(false);
  });

  it('describes the one-copy lifecycle in product language', () => {
    expect(describeRepeatLifecycle(activity())).toBe(
      'Kwilt shows one copy at a time. Missed copies will not pile up.',
    );
    expect(describeRepeatLifecycle(activity({ repeatBasis: 'after_completion' }))).toBe(
      'Repeats after you complete or skip it. Missed copies will not pile up.',
    );
  });
});
