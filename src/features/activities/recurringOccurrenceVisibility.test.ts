import type { Activity } from '../../domain/types';
import { findNewRecurringOccurrencesForList } from './recurringOccurrenceVisibility';

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: 'activity-1',
    goalId: null,
    title: 'Desk shoulder routine',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-06-29T15:00:00.000Z',
    updatedAt: '2026-06-29T15:00:00.000Z',
    ...overrides,
  } as Activity;
}

describe('recurring occurrence list visibility', () => {
  it('keeps a generated next occurrence in the list context that contained the completed copy', () => {
    const completed = activity({
      status: 'done',
      repeatRule: 'custom',
      repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [1, 2, 3, 4, 5] },
      completedAt: '2026-08-30T15:20:00.000Z',
    });
    const next = activity({
      id: 'activity-repeat-activity-1-2026-08-31',
      scheduledDate: '2026-08-31',
      repeatRule: 'custom',
      repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [1, 2, 3, 4, 5] },
      repeatSeriesId: 'activity-1',
      repeatCreatedFromActivityId: completed.id,
    });

    expect(findNewRecurringOccurrencesForList({
      previousActivityIds: new Set([completed.id]),
      previousListActivityIds: new Set([completed.id]),
      activities: [completed, next],
    })).toEqual([next.id]);
  });

  it('does not reveal a generated occurrence when its completed copy was outside this list context', () => {
    const next = activity({
      id: 'activity-repeat-hidden-2026-08-31',
      repeatCreatedFromActivityId: 'hidden-source',
      repeatRule: 'weekly',
    });

    expect(findNewRecurringOccurrencesForList({
      previousActivityIds: new Set(['hidden-source']),
      previousListActivityIds: new Set(['visible-source']),
      activities: [next],
    })).toEqual([]);
  });

  it('ignores ordinary newly created to-dos because their existing creation path owns visibility', () => {
    const created = activity({ id: 'manual-new' });

    expect(findNewRecurringOccurrencesForList({
      previousActivityIds: new Set(['existing']),
      previousListActivityIds: new Set(['existing']),
      activities: [created],
    })).toEqual([]);
  });
});
