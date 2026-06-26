import { sortGoalInventoryItems, type GoalInventorySortMode } from './goalsInventorySort';

type TestItem = {
  goal: {
    id: string;
    title: string;
    priority?: 1 | 2 | 3;
    updatedAt: string;
  };
  activityCount: number;
  nextScheduledMs: number | null;
};

const items: TestItem[] = [
  {
    goal: { id: 'b', title: 'Bake bread', priority: 2, updatedAt: '2026-06-02T12:00:00.000Z' },
    activityCount: 3,
    nextScheduledMs: 30,
  },
  {
    goal: { id: 'c', title: 'Climb Utah', updatedAt: '2026-06-03T12:00:00.000Z' },
    activityCount: 1,
    nextScheduledMs: null,
  },
  {
    goal: { id: 'a', title: 'Write essays', priority: 1, updatedAt: '2026-06-01T12:00:00.000Z' },
    activityCount: 5,
    nextScheduledMs: 10,
  },
];

function sortedIds(mode: GoalInventorySortMode) {
  return sortGoalInventoryItems(items, mode, (item) => item.nextScheduledMs).map((item) => item.goal.id);
}

describe('sortGoalInventoryItems', () => {
  it('preserves the incoming order for the default mode', () => {
    expect(sortedIds('default')).toEqual(['b', 'c', 'a']);
  });

  it('sorts by the selected goal inventory mode', () => {
    expect(sortedIds('updatedDesc')).toEqual(['c', 'b', 'a']);
    expect(sortedIds('priorityAsc')).toEqual(['a', 'b', 'c']);
    expect(sortedIds('titleAsc')).toEqual(['b', 'c', 'a']);
    expect(sortedIds('titleDesc')).toEqual(['a', 'c', 'b']);
    expect(sortedIds('nextTodoAsc')).toEqual(['a', 'b', 'c']);
    expect(sortedIds('activityCountDesc')).toEqual(['a', 'b', 'c']);
  });
});
