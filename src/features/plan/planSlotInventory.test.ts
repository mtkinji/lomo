import type { Activity, Goal } from '../../domain/types';
import { buildPlanSlotInventory } from './planSlotInventory';

function activity(
  id: string,
  overrides: Partial<Activity> = {},
): Activity {
  return {
    id,
    goalId: null,
    title: `To-do ${id}`,
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: { value: 0, updatedAt: '2026-08-10T00:00:00.000Z' },
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  } as Activity;
}

describe('buildPlanSlotInventory', () => {
  it('returns the top ten existing recommendations by default', () => {
    const activities = Array.from({ length: 18 }, (_, index) =>
      activity(String(index), {
        orderIndex: index,
        priority: index === 17 ? 1 : 2,
      }),
    );

    const result = buildPlanSlotInventory({
      activities,
      goals: [],
      scheduledProposalIds: new Set(),
    });

    expect(result.mode).toBe('recommended');
    expect(result.items).toHaveLength(10);
    expect(result.items[0].id).toBe('17');
    expect(result.priorityRankByActivityId.get('17')).toEqual(expect.objectContaining({
      position: 1,
      total: 10,
      reasons: expect.arrayContaining(['Starred']),
    }));
    expect(result.priorityRankByActivityId.get(result.items[9].id)?.position).toBe(10);
  });

  it('uses the full available inventory once an organization control is applied', () => {
    const activities = Array.from({ length: 18 }, (_, index) =>
      activity(String(index), { orderIndex: index, estimateMinutes: 30 }),
    );

    const result = buildPlanSlotInventory({
      activities,
      goals: [],
      scheduledProposalIds: new Set(),
      filters: [
        {
          logic: 'and',
          conditions: [{ id: 'fits', field: 'estimateMinutes', operator: 'lte', value: 60 }],
        },
      ],
    });

    expect(result.mode).toBe('inventory');
    expect(result.items).toHaveLength(18);
    expect(result.priorityRankByActivityId.size).toBe(0);
  });

  it('excludes closed, already scheduled, proposed, and untitled work', () => {
    const activities = [
      activity('available'),
      activity('done', { status: 'done' }),
      activity('cancelled', { status: 'cancelled' }),
      activity('skipped', { status: 'skipped' }),
      activity('scheduled', { scheduledAt: '2026-08-10T15:00:00.000Z' }),
      activity('proposed'),
      activity('blank', { title: '   ' }),
    ];

    expect(
      buildPlanSlotInventory({
        activities,
        goals: [],
        scheduledProposalIds: new Set(['proposed']),
        sorts: [{ field: 'orderIndex', direction: 'asc' }],
      }).items.map((item) => item.id),
    ).toEqual(['available']);
  });

  it('keeps scheduled to-dos out of recommendations but includes them in explicit search', () => {
    const scheduled = activity('scheduled', {
      title: 'Draft family story center',
      scheduledAt: '2026-08-11T19:00:00.000Z',
    });

    const recommended = buildPlanSlotInventory({
      activities: [scheduled],
      goals: [],
      scheduledProposalIds: new Set(),
    });
    const searched = buildPlanSlotInventory({
      activities: [scheduled],
      goals: [],
      scheduledProposalIds: new Set(),
      query: 'family story',
    });

    expect(recommended.items).toEqual([]);
    expect(searched.items.map((item) => item.id)).toEqual(['scheduled']);
  });

  it('reuses To-dos filtering, sorting, searching, and grouping contracts', () => {
    const goals = [
      { id: 'home', title: 'Home', priority: 1 },
      { id: 'work', title: 'Work', priority: 2 },
    ] as Goal[];
    const activities = [
      activity('paint', {
        title: 'Paint the hall',
        goalId: 'home',
        estimateMinutes: 90,
        priority: 2,
      }),
      activity('email', {
        title: 'Email the cabinet maker',
        goalId: 'work',
        estimateMinutes: 20,
        priority: 1,
      }),
      activity('measure', {
        title: 'Measure cabinet doors',
        goalId: 'home',
        estimateMinutes: 30,
        priority: 3,
      }),
    ];

    const result = buildPlanSlotInventory({
      activities,
      goals,
      scheduledProposalIds: new Set(),
      filters: [
        {
          logic: 'and',
          conditions: [
            { id: 'fits', field: 'estimateMinutes', operator: 'lte', value: 60 },
          ],
        },
      ],
      filterGroupLogic: 'or',
      sorts: [{ field: 'priority', direction: 'asc' }],
      query: 'cabinet',
      grouping: { field: 'goal' },
    });

    expect(result.mode).toBe('inventory');
    expect(result.items.map((item) => item.id)).toEqual(['email', 'measure']);
    expect(result.groups.map((group) => [group.label, group.activities.map((item) => item.id)])).toEqual([
      ['Home', ['measure']],
      ['Work', ['email']],
    ]);
  });
});
