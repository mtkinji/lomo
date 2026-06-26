import type { Activity } from '../../domain/types';
import type { ActivityTagHistoryIndex } from '../../store/useAppStore';
import { buildActivityTagGroupFilter, buildActivityTagGroups } from './tagGroups';

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

describe('buildActivityTagGroups', () => {
  it('deduplicates tags case-insensitively and preserves history label casing', () => {
    const history: ActivityTagHistoryIndex = {
      groceries: {
        tag: 'Groceries',
        firstUsedAt: '2026-06-01T12:00:00.000Z',
        lastUsedAt: '2026-06-10T12:00:00.000Z',
        totalUses: 4,
        recentUses: [],
      },
    };

    const groups = buildActivityTagGroups({
      activityTagHistory: history,
      activities: [
        activity({ id: 'milk', tags: ['groceries'], updatedAt: '2026-06-12T12:00:00.000Z' }),
      ],
    });

    expect(groups).toEqual([
      {
        key: 'groceries',
        tag: 'Groceries',
        activeCount: 1,
        totalUses: 4,
        lastUsedAt: '2026-06-12T12:00:00.000Z',
      },
    ]);
  });

  it('ranks groups by active to-dos before recency and total uses', () => {
    const groups = buildActivityTagGroups({
      activityTagHistory: {
        admin: {
          tag: 'Admin',
          firstUsedAt: '2026-06-01T12:00:00.000Z',
          lastUsedAt: '2026-06-20T12:00:00.000Z',
          totalUses: 12,
          recentUses: [],
        },
      },
      activities: [
        activity({ id: 'admin-done', status: 'done', tags: ['Admin'], updatedAt: '2026-06-20T12:00:00.000Z' }),
        activity({ id: 'milk', tags: ['Groceries'], updatedAt: '2026-06-11T12:00:00.000Z' }),
        activity({ id: 'bread', tags: ['Groceries'], updatedAt: '2026-06-12T12:00:00.000Z' }),
        activity({ id: 'school', tags: ['School'], updatedAt: '2026-06-19T12:00:00.000Z' }),
      ],
    });

    expect(groups.map((group) => group.tag)).toEqual(['Groceries', 'School', 'Admin']);
  });

  it('builds a single-tag filter for the selected group', () => {
    expect(buildActivityTagGroupFilter('Groceries')).toEqual([
      {
        logic: 'and',
        conditions: [
          {
            id: 'tag-group-groceries',
            field: 'tags',
            operator: 'in',
            value: ['Groceries'],
          },
        ],
      },
    ]);
  });
});
