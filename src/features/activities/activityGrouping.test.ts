import type { Activity, Goal } from '../../domain/types';
import {
  groupActivitiesForList,
  getActivityGroupingLabel,
  isClosedActivity,
} from './activityGrouping';

const NOW = new Date('2026-06-23T12:00:00.000Z');

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

describe('activity grouping', () => {
  it('returns no sections when grouping is none', () => {
    expect(
      groupActivitiesForList({
        activities: [activity()],
        goals: [],
        grouping: { field: 'none' },
        now: NOW,
      }),
    ).toEqual([]);
  });

  it('orders goal groups by goal priority, title, id, then None last', () => {
    const groups = groupActivitiesForList({
      activities: [
        activity({ id: 'none', goalId: null }),
        activity({ id: 'zeta', goalId: 'goal-z' }),
        activity({ id: 'alpha', goalId: 'goal-a' }),
        activity({ id: 'urgent', goalId: 'goal-u' }),
      ],
      goals: [
        goal({ id: 'goal-z', title: 'Zeta', priority: 2 }),
        goal({ id: 'goal-a', title: 'Alpha', priority: 2 }),
        goal({ id: 'goal-u', title: 'Urgent', priority: 1 }),
      ],
      grouping: { field: 'goal' },
      now: NOW,
    });

    expect(groups.map((group) => group.label)).toEqual(['Urgent', 'Alpha', 'Zeta', 'None']);
    expect(groups.map((group) => group.activities.map((item) => item.id))).toEqual([
      ['urgent'],
      ['alpha'],
      ['zeta'],
      ['none'],
    ]);
  });

  it('groups schedule by scheduledAt before scheduledDate and excludes reminders', () => {
    const groups = groupActivitiesForList({
      activities: [
        activity({ id: 'reminder-only', reminderAt: '2026-06-23T08:00:00.000Z' }),
        activity({ id: 'overdue', scheduledDate: '2026-06-22' }),
        activity({ id: 'today', scheduledDate: '2026-06-23' }),
        activity({ id: 'upcoming', scheduledDate: '2026-06-24' }),
        activity({
          id: 'scheduled-at-wins',
          scheduledDate: '2026-06-22',
          scheduledAt: '2026-06-24T10:00:00.000Z',
        }),
      ],
      goals: [],
      grouping: { field: 'schedule' },
      now: NOW,
    });

    expect(groups.map((group) => group.label)).toEqual(['Overdue', 'Today', 'Upcoming', 'None']);
    expect(groups.map((group) => [group.label, group.activities.map((item) => item.id)])).toEqual([
      ['Overdue', ['overdue']],
      ['Today', ['today']],
      ['Upcoming', ['upcoming', 'scheduled-at-wins']],
      ['None', ['reminder-only']],
    ]);
  });

  it('maps user-facing status groups from priority state and excludes closed activities', () => {
    const groups = groupActivitiesForList({
      activities: [
        activity({ id: 'active' }),
        activity({ id: 'review', priorityState: 'needs_review' }),
        activity({ id: 'waiting', priorityState: 'waiting' }),
        activity({ id: 'later', priorityState: 'later' }),
        activity({ id: 'done', status: 'done' }),
        activity({ id: 'skipped', status: 'skipped' }),
        activity({ id: 'cancelled', status: 'cancelled' }),
      ],
      goals: [],
      grouping: { field: 'status' },
      now: NOW,
    });

    expect(groups.map((group) => group.label)).toEqual(['Active', 'Needs review', 'Waiting', 'Later']);
    expect(groups.flatMap((group) => group.activities.map((item) => item.id))).toEqual([
      'active',
      'review',
      'waiting',
      'later',
    ]);
  });

  it('provides labels and closed status detection for the UI', () => {
    expect(getActivityGroupingLabel({ field: 'goal' })).toBe('Goal');
    expect(getActivityGroupingLabel({ field: 'schedule' })).toBe('Schedule');
    expect(getActivityGroupingLabel({ field: 'status' })).toBe('Status');
    expect(isClosedActivity(activity({ status: 'done' }))).toBe(true);
    expect(isClosedActivity(activity({ status: 'planned' }))).toBe(false);
  });
});
