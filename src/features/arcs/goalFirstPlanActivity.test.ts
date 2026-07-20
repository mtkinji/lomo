import type { Activity } from '../../domain/types';
import { selectFirstGoalPlanActivityId } from './goalFirstPlanActivity';

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: overrides.id ?? 'activity-1',
    goalId: 'goal-1',
    title: overrides.id ?? 'Activity',
    type: 'task',
    status: 'planned',
    tags: [],
    forceActual: {},
    createdAt: '2026-07-20T12:00:00.000Z',
    updatedAt: '2026-07-20T12:00:00.000Z',
    ...overrides,
  } as Activity;
}

describe('selectFirstGoalPlanActivityId', () => {
  it('returns null for an empty plan', () => {
    expect(selectFirstGoalPlanActivityId([])).toBeNull();
  });

  it('falls back to the first activity when every activity is complete', () => {
    const activities = [
      activity({ id: 'first', status: 'done' }),
      activity({ id: 'second', status: 'done', orderIndex: 0 }),
    ];

    expect(selectFirstGoalPlanActivityId(activities)).toBe('first');
  });

  it('selects the active activity with the earliest manual order', () => {
    const activities = [
      activity({ id: 'done', status: 'done', orderIndex: 0 }),
      activity({ id: 'later', orderIndex: 2 }),
      activity({ id: 'first', orderIndex: 1 }),
      activity({ id: 'unordered' }),
    ];

    expect(selectFirstGoalPlanActivityId(activities)).toBe('first');
  });

  it('uses creation time to break equal or missing order ties', () => {
    const activities = [
      activity({ id: 'newer', createdAt: '2026-07-20T12:00:00.000Z' }),
      activity({ id: 'older', createdAt: '2026-07-19T12:00:00.000Z' }),
    ];

    expect(selectFirstGoalPlanActivityId(activities)).toBe('older');
  });
});
