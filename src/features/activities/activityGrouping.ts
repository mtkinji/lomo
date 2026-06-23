import type {
  Activity,
  ActivityGroupingField,
  ActivityViewGrouping,
  Goal,
} from '../../domain/types';

export type ActivityListGroup = {
  key: string;
  label: string;
  activities: Activity[];
};

const CLOSED_STATUSES = new Set(['done', 'skipped', 'cancelled']);

const STATUS_ORDER = ['active', 'needs_review', 'waiting', 'later', 'none'] as const;

const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
  active: 'Active',
  needs_review: 'Needs review',
  waiting: 'Waiting',
  later: 'Later',
  none: 'None',
};

const SCHEDULE_ORDER = ['overdue', 'today', 'upcoming', 'none'] as const;

const SCHEDULE_LABELS: Record<(typeof SCHEDULE_ORDER)[number], string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  none: 'None',
};

export function isClosedActivity(activity: Activity): boolean {
  return CLOSED_STATUSES.has(activity.status);
}

export function getActivityGroupingLabel(grouping: ActivityViewGrouping | undefined): string {
  switch (grouping?.field) {
    case 'goal':
      return 'Goal';
    case 'schedule':
      return 'Schedule';
    case 'status':
      return 'Status';
    case 'none':
    default:
      return 'None';
  }
}

export function groupActivitiesForList(params: {
  activities: Activity[];
  goals: Goal[];
  grouping: ActivityViewGrouping | undefined;
  now?: Date;
}): ActivityListGroup[] {
  const field = params.grouping?.field ?? 'none';
  if (field === 'none') return [];

  const activeActivities = params.activities.filter((activity) => !isClosedActivity(activity));

  switch (field) {
    case 'goal':
      return groupByGoal(activeActivities, params.goals);
    case 'schedule':
      return groupBySchedule(activeActivities, params.now ?? new Date());
    case 'status':
      return groupByStatus(activeActivities);
    default:
      return [];
  }
}

function groupByGoal(activities: Activity[], goals: Goal[]): ActivityListGroup[] {
  const goalsById = new Map(goals.map((goal) => [goal.id, goal]));
  const groups = new Map<string, ActivityListGroup>();

  activities.forEach((activity) => {
    const goal = activity.goalId ? goalsById.get(activity.goalId) : undefined;
    const key = goal ? `goal:${goal.id}` : 'goal:none';
    const label = goal?.title?.trim() || 'None';
    const existing = groups.get(key);
    if (existing) {
      existing.activities.push(activity);
      return;
    }
    groups.set(key, { key, label, activities: [activity] });
  });

  return [...groups.values()].sort((a, b) => {
    if (a.key === 'goal:none') return 1;
    if (b.key === 'goal:none') return -1;

    const goalA = goalsById.get(a.key.replace(/^goal:/, ''));
    const goalB = goalsById.get(b.key.replace(/^goal:/, ''));
    const priorityA = goalA?.priority ?? Number.POSITIVE_INFINITY;
    const priorityB = goalB?.priority ?? Number.POSITIVE_INFINITY;
    if (priorityA !== priorityB) return priorityA - priorityB;

    const titleResult = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    if (titleResult !== 0) return titleResult;

    return a.key.localeCompare(b.key);
  });
}

function groupBySchedule(activities: Activity[], now: Date): ActivityListGroup[] {
  const groups = createOrderedGroups(SCHEDULE_ORDER, 'schedule', SCHEDULE_LABELS);
  const todayKey = toLocalDateKey(now);

  activities.forEach((activity) => {
    const key = getScheduleGroupKey(activity, todayKey);
    groups.get(key)?.activities.push(activity);
  });

  return compactGroups(groups, SCHEDULE_ORDER);
}

function getScheduleGroupKey(
  activity: Activity,
  todayKey: string,
): (typeof SCHEDULE_ORDER)[number] {
  const scheduleKey = getActivityScheduleDateKey(activity);
  if (!scheduleKey) return 'none';
  if (scheduleKey < todayKey) return 'overdue';
  if (scheduleKey === todayKey) return 'today';
  return 'upcoming';
}

function getActivityScheduleDateKey(activity: Activity): string | null {
  return parseDateKey(activity.scheduledAt) ?? parseDateKey(activity.scheduledDate);
}

function groupByStatus(activities: Activity[]): ActivityListGroup[] {
  const groups = createOrderedGroups(STATUS_ORDER, 'status', STATUS_LABELS);

  activities.forEach((activity) => {
    const key = getStatusGroupKey(activity);
    groups.get(key)?.activities.push(activity);
  });

  return compactGroups(groups, STATUS_ORDER);
}

function getStatusGroupKey(activity: Activity): (typeof STATUS_ORDER)[number] {
  switch (activity.priorityState) {
    case undefined:
    case 'active':
      return 'active';
    case 'needs_review':
      return 'needs_review';
    case 'waiting':
      return 'waiting';
    case 'later':
      return 'later';
    default:
      return 'none';
  }
}

function createOrderedGroups<T extends readonly string[]>(
  order: T,
  prefix: string,
  labels: Record<T[number], string>,
): Map<T[number], ActivityListGroup> {
  return new Map(
    order.map((key: T[number]) => [
      key,
      {
        key: `${prefix}:${key}`,
        label: labels[key],
        activities: [],
      },
    ]),
  );
}

function compactGroups<T extends readonly string[]>(
  groups: Map<T[number], ActivityListGroup>,
  order: T,
): ActivityListGroup[] {
  return order
    .map((key) => groups.get(key))
    .filter((group): group is ActivityListGroup => Boolean(group && group.activities.length > 0));
}

function parseDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return toLocalDateKey(new Date(ms));
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isGroupingApplied(grouping: ActivityViewGrouping | undefined): boolean {
  return Boolean(grouping && grouping.field !== 'none');
}

export function setCollapsedGroupKey(
  grouping: ActivityViewGrouping | undefined,
  groupKey: string,
  collapsed: boolean,
): ActivityViewGrouping {
  const field: ActivityGroupingField = grouping?.field ?? 'none';
  const current = new Set(grouping?.collapsedGroupKeys ?? []);
  if (collapsed) current.add(groupKey);
  else current.delete(groupKey);
  return { field, collapsedGroupKeys: [...current].sort() };
}
