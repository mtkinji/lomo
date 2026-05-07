import { QueryService } from './QueryService';
import type { Activity, FilterGroup, SortCondition } from '../domain/types';

const FIXED_NOW = new Date(2026, 3, 15, 10, 0, 0);

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: 'goal-1',
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

describe('QueryService.applyActivityFilters', () => {
  it('returns input untouched when no groups provided', () => {
    const list = [activity({ id: 'a' }), activity({ id: 'b' })];
    expect(QueryService.applyActivityFilters(list, [])).toBe(list);
  });

  it('treats empty conditions inside a group as a match (no-op)', () => {
    const list = [activity({ id: 'a' }), activity({ id: 'b' })];
    const groups: FilterGroup[] = [{ logic: 'and', conditions: [] }];
    const result = QueryService.applyActivityFilters(list, groups);
    expect(result).toHaveLength(2);
  });

  it('matches with eq operator on simple fields', () => {
    const list = [
      activity({ id: 'a', status: 'planned' }),
      activity({ id: 'b', status: 'done' }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'status', operator: 'eq', value: 'done' },
        ],
      },
    ];
    expect(QueryService.applyActivityFilters(list, groups).map((a) => a.id)).toEqual([
      'b',
    ]);
  });

  it('contains operator: empty filter value never matches', () => {
    const list = [activity({ id: 'a', title: 'Walk the dog' })];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'title', operator: 'contains', value: '' },
        ],
      },
    ];
    expect(QueryService.applyActivityFilters(list, groups)).toEqual([]);
  });

  it('contains operator: case-insensitive substring match on string fields', () => {
    const list = [
      activity({ id: 'a', title: 'Walk the dog' }),
      activity({ id: 'b', title: 'Read a book' }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'title', operator: 'contains', value: 'WALK' },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id),
    ).toEqual(['a']);
  });

  it('contains operator: wildcard pattern using * matches array fields like tags', () => {
    const list = [
      activity({ id: 'a', tags: ['errands-shopping', 'home'] }),
      activity({ id: 'b', tags: ['focus'] }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'tags', operator: 'contains', value: 'errands*' },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id),
    ).toEqual(['a']);
  });

  it('exists / nexists distinguish empty strings, null, and undefined', () => {
    const list = [
      activity({ id: 'a', notes: 'has notes' }),
      activity({ id: 'b', notes: '' }),
      activity({ id: 'c' }),
    ];
    const exists: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'notes' as any, operator: 'exists' },
        ],
      },
    ];
    const nexists: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'notes' as any, operator: 'nexists' },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, exists).map((a) => a.id),
    ).toEqual(['a']);
    expect(
      QueryService.applyActivityFilters(list, nexists).map((a) => a.id).sort(),
    ).toEqual(['b', 'c']);
  });

  it('in operator: matches values when activityValue is an array (tags)', () => {
    const list = [
      activity({ id: 'a', tags: ['focus', 'morning'] }),
      activity({ id: 'b', tags: ['evening'] }),
      activity({ id: 'c', tags: [] }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'tags', operator: 'in', value: ['focus', 'evening'] },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id).sort(),
    ).toEqual(['a', 'b']);
  });

  it('in operator: returns no matches when filter value is not an array', () => {
    const list = [activity({ id: 'a', status: 'planned' })];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'status', operator: 'in', value: 'planned' as any },
        ],
      },
    ];
    expect(QueryService.applyActivityFilters(list, groups)).toEqual([]);
  });

  it('within-group AND: requires every condition to match', () => {
    const list = [
      activity({ id: 'a', status: 'planned', priority: 1 }),
      activity({ id: 'b', status: 'planned', priority: 2 }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'status', operator: 'eq', value: 'planned' },
          { id: 'c2', field: 'priority', operator: 'eq', value: 1 },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id),
    ).toEqual(['a']);
  });

  it('within-group OR: matches if any condition is satisfied', () => {
    const list = [
      activity({ id: 'a', status: 'planned' }),
      activity({ id: 'b', status: 'done' }),
      activity({ id: 'c', status: 'cancelled' }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'or',
        conditions: [
          { id: 'c1', field: 'status', operator: 'eq', value: 'planned' },
          { id: 'c2', field: 'status', operator: 'eq', value: 'done' },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id).sort(),
    ).toEqual(['a', 'b']);
  });

  it('groupLogic AND requires every group to match', () => {
    const list = [
      activity({ id: 'a', status: 'planned', priority: 1 }),
      activity({ id: 'b', status: 'planned', priority: 2 }),
      activity({ id: 'c', status: 'done', priority: 1 }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'status', operator: 'eq', value: 'planned' },
        ],
      },
      {
        logic: 'and',
        conditions: [
          { id: 'c2', field: 'priority', operator: 'eq', value: 1 },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups, 'and').map((a) => a.id),
    ).toEqual(['a']);
  });
});

describe('QueryService.applyActivityFilters relative dates on scheduledDate', () => {
  it('treats "today" as the current local date key (lt: before today)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);

    const list = [
      activity({ id: 'a', scheduledDate: '2026-04-14' }),
      activity({ id: 'b', scheduledDate: '2026-04-15' }),
      activity({ id: 'c', scheduledDate: '2026-04-16' }),
      activity({ id: 'no-date' }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'scheduledDate', operator: 'lt', value: 'today' },
        ],
      },
    ];

    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id),
    ).toEqual(['a']);

    jest.useRealTimers();
  });

  it('supports +N days tokens', () => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);

    const list = [
      activity({ id: 'in7', scheduledDate: '2026-04-22' }),
      activity({ id: 'in8', scheduledDate: '2026-04-23' }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'c1', field: 'scheduledDate', operator: 'lte', value: '+7days' },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id),
    ).toEqual(['in7']);

    jest.useRealTimers();
  });

  it('eq with absolute date key matches scheduledDate exactly', () => {
    const list = [
      activity({ id: 'match', scheduledDate: '2026-04-15' }),
      activity({ id: 'other', scheduledDate: '2026-04-16' }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          {
            id: 'c1',
            field: 'scheduledDate',
            operator: 'eq',
            value: '2026-04-15',
          },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id),
    ).toEqual(['match']);
  });

  it('drops activities with no scheduledDate from gt/lt comparisons', () => {
    const list = [
      activity({ id: 'no-date' }),
      activity({ id: 'with-date', scheduledDate: '2026-04-20' }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          {
            id: 'c1',
            field: 'scheduledDate',
            operator: 'gt',
            value: '2026-04-15',
          },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id),
    ).toEqual(['with-date']);
  });
});

describe('QueryService.applyActivityFilters reminderAt date semantics', () => {
  it('compares reminderAt on local date-key boundaries (clear-day separation)', () => {
    // Use noon local time so timezone offsets don't cross day boundaries.
    const day1Noon = new Date(2026, 3, 15, 12, 0, 0).toISOString();
    const day3Noon = new Date(2026, 3, 17, 12, 0, 0).toISOString();
    const list = [
      activity({ id: 'day1', reminderAt: day1Noon }),
      activity({ id: 'day3', reminderAt: day3Noon }),
    ];
    const groups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          {
            id: 'c1',
            field: 'reminderAt',
            operator: 'gt',
            value: '2026-04-16',
          },
        ],
      },
    ];
    expect(
      QueryService.applyActivityFilters(list, groups).map((a) => a.id),
    ).toEqual(['day3']);
  });
});

describe('QueryService.applyActivitySorts', () => {
  it('returns input untouched when no sorts provided', () => {
    const list = [activity({ id: 'a' }), activity({ id: 'b' })];
    expect(QueryService.applyActivitySorts(list, [])).toBe(list);
  });

  it('sorts strings ascending case-insensitively', () => {
    const list = [
      activity({ id: 'a', title: 'banana' }),
      activity({ id: 'b', title: 'Apple' }),
      activity({ id: 'c', title: 'cherry' }),
    ];
    const sorts: SortCondition[] = [{ field: 'title', direction: 'asc' }];
    expect(
      QueryService.applyActivitySorts(list, sorts).map((a) => a.id),
    ).toEqual(['b', 'a', 'c']);
  });

  it('sorts strings descending case-insensitively', () => {
    const list = [
      activity({ id: 'a', title: 'banana' }),
      activity({ id: 'b', title: 'Apple' }),
      activity({ id: 'c', title: 'cherry' }),
    ];
    const sorts: SortCondition[] = [{ field: 'title', direction: 'desc' }];
    expect(
      QueryService.applyActivitySorts(list, sorts).map((a) => a.id),
    ).toEqual(['c', 'a', 'b']);
  });

  it('places null values last for default field comparisons', () => {
    const list = [
      activity({ id: 'a', estimateMinutes: 15 }),
      activity({ id: 'b', estimateMinutes: null }),
      activity({ id: 'c', estimateMinutes: 5 }),
    ];
    const sorts: SortCondition[] = [
      { field: 'estimateMinutes', direction: 'asc' },
    ];
    const result = QueryService.applyActivitySorts(list, sorts).map((a) => a.id);
    expect(result.indexOf('b')).toBe(2);
  });

  it('places missing scheduledDate at the end for asc sort', () => {
    const list = [
      activity({ id: 'mid', scheduledAt: '2026-04-16T00:00:00.000Z' }),
      activity({ id: 'no-date' }),
      activity({ id: 'early', scheduledAt: '2026-04-15T00:00:00.000Z' }),
    ];
    const sorts: SortCondition[] = [
      { field: 'scheduledAt' as any, direction: 'asc' },
    ];
    const result = QueryService.applyActivitySorts(list, sorts).map((a) => a.id);
    expect(result[result.length - 1]).toBe('no-date');
    expect(result.slice(0, 2)).toEqual(['early', 'mid']);
  });

  it('falls back to orderIndex when primary keys are equal', () => {
    const list = [
      activity({ id: 'a', title: 'Same', orderIndex: 2 }),
      activity({ id: 'b', title: 'Same', orderIndex: 1 }),
    ];
    const sorts: SortCondition[] = [{ field: 'title', direction: 'asc' }];
    expect(
      QueryService.applyActivitySorts(list, sorts).map((a) => a.id),
    ).toEqual(['b', 'a']);
  });
});
