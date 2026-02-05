import type { Activity, ActivityView, FilterGroup, SortCondition } from '../../domain/types';
import { QueryService } from '../../services/QueryService';

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildFilterGroups(params: { view: ActivityView; isPro: boolean }): FilterGroup[] {
  const { view, isPro } = params;
  const filterMode = isPro ? (view.filterMode ?? 'all') : 'all';

  if ((isPro || view.isSystem) && view.filters && view.filters.length > 0) return view.filters;

  switch (filterMode) {
    case 'priority1':
      return [
        {
          logic: 'and' as const,
          conditions: [{ id: 'legacy-p1', field: 'priority', operator: 'eq', value: 1 }],
        },
      ] satisfies FilterGroup[];
    case 'active':
      return [
        {
          logic: 'and' as const,
          conditions: [
            { id: 'legacy-active-done', field: 'status', operator: 'neq', value: 'done' },
            { id: 'legacy-active-can', field: 'status', operator: 'neq', value: 'cancelled' },
          ],
        },
      ] satisfies FilterGroup[];
    case 'completed':
      return [
        {
          logic: 'and' as const,
          conditions: [{ id: 'legacy-completed', field: 'status', operator: 'eq', value: 'done' }],
        },
      ] satisfies FilterGroup[];
    default:
      return [];
  }
}

function buildSortConditions(params: { view: ActivityView; isPro: boolean }): SortCondition[] {
  const { view, isPro } = params;
  if (!isPro) return [];
  if (view.sorts && view.sorts.length > 0) return view.sorts;

  const sortMode = view.sortMode ?? 'manual';
  switch (sortMode) {
    case 'titleAsc':
      return [{ field: 'title', direction: 'asc' }] satisfies SortCondition[];
    case 'titleDesc':
      return [{ field: 'title', direction: 'desc' }] satisfies SortCondition[];
    case 'dueDateAsc':
      return [{ field: 'scheduledDate', direction: 'asc' }] satisfies SortCondition[];
    case 'dueDateDesc':
      return [{ field: 'scheduledDate', direction: 'desc' }] satisfies SortCondition[];
    case 'priority':
      return [{ field: 'priority', direction: 'asc' }] satisfies SortCondition[];
    case 'manual':
    default:
      return [{ field: 'orderIndex', direction: 'asc' }] satisfies SortCondition[];
  }
}

export function buildActivitiesWidgetRows(params: {
  view: ActivityView;
  activities: Activity[];
  goalsTitleById: Record<string, string>;
  isPro: boolean;
  now: Date;
  limit: number;
}): {
  rows: Array<{ activityId: string; title: string; scheduledAtMs?: number; status?: string; meta?: string }>;
  totalCount: number;
} {
  const { view, activities, goalsTitleById, isPro, now, limit } = params;
  const filterGroups = buildFilterGroups({ view, isPro });
  const groupLogic = view.filterGroupLogic ?? 'or';
  const sortConditions = buildSortConditions({ view, isPro });
  const showCompleted = isPro || view.isSystem ? (view.showCompleted ?? true) : true;

  const base = activities.filter((a) => a.status !== 'cancelled' && a.status !== 'skipped');
  const filtered =
    filterGroups.length > 0 ? QueryService.applyActivityFilters(base, filterGroups, groupLogic) : base;
  const sorted = sortConditions.length > 0 ? QueryService.applyActivitySorts(filtered, sortConditions) : filtered;

  const active = sorted.filter((a) => a.status !== 'done');
  const completed = showCompleted ? sorted.filter((a) => a.status === 'done') : [];
  const ordered = [...active, ...completed];

  const todayKey = toLocalDateKey(now);
  const toScheduledAtMs = (a: Activity): number | undefined => {
    if (a.scheduledAt) {
      const ms = new Date(a.scheduledAt).getTime();
      return Number.isFinite(ms) ? ms : undefined;
    }
    if (a.scheduledDate) {
      const ms = new Date(a.scheduledDate).getTime();
      return Number.isFinite(ms) ? ms : undefined;
    }
    // If the item is "anytime today", provide a gentle anchor so the widget can show a label.
    if (a.scheduledDate && toLocalDateKey(new Date(a.scheduledDate)) === todayKey) return undefined;
    return undefined;
  };

  const rows = ordered.slice(0, limit).map((a) => ({
    activityId: a.id,
    title: a.title,
    scheduledAtMs: toScheduledAtMs(a),
    status: a.status,
    meta: a.goalId ? (goalsTitleById[a.goalId] ?? undefined) : undefined,
  }));

  return { rows, totalCount: ordered.length };
}


