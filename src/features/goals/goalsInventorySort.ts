export type GoalInventorySortMode =
  | 'default'
  | 'priorityAsc'
  | 'updatedDesc'
  | 'titleAsc'
  | 'titleDesc'
  | 'nextTodoAsc'
  | 'activityCountDesc';

type GoalInventorySortableItem = {
  goal: {
    id: string;
    title: string;
    priority?: 1 | 2 | 3;
    updatedAt?: string | null;
  };
  activityCount: number;
};

function parseTime(value: string | null | undefined) {
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortGoalInventoryItems<T extends GoalInventorySortableItem>(
  items: T[],
  mode: GoalInventorySortMode,
  getNextScheduledMs: (item: T) => number | null | undefined,
) {
  if (mode === 'default') return items;

  const compareTitle = (a: T, b: T) =>
    a.goal.title.localeCompare(b.goal.title, undefined, { sensitivity: 'base' });

  return [...items].sort((a, b) => {
    const primary =
      mode === 'updatedDesc'
        ? parseTime(b.goal.updatedAt) - parseTime(a.goal.updatedAt)
        : mode === 'priorityAsc'
        ? comparePriority(a, b)
        : mode === 'titleAsc'
        ? compareTitle(a, b)
        : mode === 'titleDesc'
        ? compareTitle(b, a)
        : mode === 'nextTodoAsc'
        ? compareNextTodo(a, b, getNextScheduledMs)
        : b.activityCount - a.activityCount;

    return primary || compareTitle(a, b);
  });
}

function comparePriority<T extends GoalInventorySortableItem>(a: T, b: T) {
  const aPriority = a.goal.priority ?? Number.POSITIVE_INFINITY;
  const bPriority = b.goal.priority ?? Number.POSITIVE_INFINITY;
  return aPriority - bPriority;
}

function compareNextTodo<T>(
  a: T,
  b: T,
  getNextScheduledMs: (item: T) => number | null | undefined,
) {
  const aTime = getNextScheduledMs(a) ?? null;
  const bTime = getNextScheduledMs(b) ?? null;
  if (aTime == null && bTime == null) return 0;
  if (aTime == null) return 1;
  if (bTime == null) return -1;
  return aTime - bTime;
}
