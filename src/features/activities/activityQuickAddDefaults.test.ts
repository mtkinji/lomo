import type { FilterGroup } from '../../domain/types';
import { buildQuickAddDefaultsFromFilters } from './activityQuickAddDefaults';

const fixedNow = new Date(2026, 6, 2, 12, 0, 0);

describe('buildQuickAddDefaultsFromFilters', () => {
  it('falls back to the active tag group when filters are ambiguous', () => {
    expect(
      buildQuickAddDefaultsFromFilters({
        filterGroups: [],
        activeTagGroupLabel: 'Errands',
        now: fixedNow,
      }),
    ).toEqual({ tags: ['Errands'] });
  });

  it('inherits unambiguous AND filter constraints for quick add', () => {
    const filterGroups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'goal', field: 'goalId', operator: 'eq', value: 'goal-1' },
          { id: 'priority', field: 'priority', operator: 'eq', value: 1 },
          { id: 'status', field: 'status', operator: 'eq', value: 'planned' },
          { id: 'scheduled', field: 'scheduledDate', operator: 'eq', value: 'tomorrow' },
          { id: 'tags', field: 'tags', operator: 'in', value: ['Home', 'Home', 'Calls'] },
        ],
      },
    ];

    expect(
      buildQuickAddDefaultsFromFilters({
        filterGroups,
        activeTagGroupLabel: 'Calls',
        now: fixedNow,
      }),
    ).toEqual({
      goalId: 'goal-1',
      priority: 1,
      status: 'planned',
      scheduledDate: '2026-07-03',
      tags: ['Home', 'Calls'],
    });
  });

  it('normalizes relative date boundaries for scheduled date comparisons', () => {
    const filterGroups: FilterGroup[] = [
      {
        logic: 'and',
        conditions: [
          { id: 'past', field: 'scheduledDate', operator: 'lt', value: 'today' },
        ],
      },
    ];

    expect(
      buildQuickAddDefaultsFromFilters({
        filterGroups,
        activeTagGroupLabel: null,
        now: fixedNow,
      }),
    ).toEqual({ scheduledDate: '2026-07-01' });
  });

  it('chooses deterministic conservative defaults for OR filters', () => {
    const filterGroups: FilterGroup[] = [
      {
        logic: 'or',
        conditions: [
          { id: 'in-progress', field: 'status', operator: 'eq', value: 'in_progress' },
          { id: 'planned', field: 'status', operator: 'eq', value: 'planned' },
          { id: 'p3', field: 'priority', operator: 'eq', value: 3 },
          { id: 'p1', field: 'priority', operator: 'eq', value: 1 },
          { id: 'future', field: 'scheduledDate', operator: 'eq', value: '+2 days' },
          { id: 'nearer', field: 'scheduledDate', operator: 'eq', value: '+1 day' },
        ],
      },
    ];

    expect(
      buildQuickAddDefaultsFromFilters({
        filterGroups,
        activeTagGroupLabel: null,
        now: fixedNow,
      }),
    ).toEqual({
      status: 'planned',
      priority: 1,
      scheduledDate: '2026-07-03',
    });
  });
});
