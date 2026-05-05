import type { Activity, Goal } from './types';

export type ViewObjectType = 'activity' | 'goal';
export type ViewScope = 'system' | 'saved' | 'local';
export type ViewLayout = 'list' | 'board' | 'timeline';
export type ViewDensity = 'comfortable' | 'compact' | 'dense';
export type ViewFilterOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'exists'
  | 'nexists'
  | 'in'
  | 'before'
  | 'after';

export type ViewFilter = {
  id: string;
  field: string;
  operator: ViewFilterOperator;
  value?: string | number | boolean | string[] | null;
};

export type ViewSort = {
  field: string;
  direction: 'asc' | 'desc';
};

export type ViewConfig = {
  id: string;
  name: string;
  objectType: ViewObjectType;
  scope: ViewScope;
  filters: ViewFilter[];
  sort: ViewSort[];
  groupBy: string | null;
  visibleFields: string[];
  layout: ViewLayout;
  density: ViewDensity;
  focusPreset: boolean;
  pinned: boolean;
  updatedAt: string;
};

const SYSTEM_UPDATED_AT = '2026-04-24T00:00:00.000Z';

export const SYSTEM_VIEWS: ViewConfig[] = [
  systemView({
    id: 'today',
    name: 'Today',
    objectType: 'activity',
    filters: [{ id: 'scheduled-today', field: 'scheduledDate', operator: 'eq', value: 'today' }],
    sort: [{ field: 'scheduledAt', direction: 'asc' }],
  }),
  systemView({ id: 'all-activities', name: 'All To-dos', objectType: 'activity' }),
  systemView({
    id: 'unplanned',
    name: 'Unplanned',
    objectType: 'activity',
    filters: [{ id: 'goal-empty', field: 'goalId', operator: 'nexists' }],
  }),
  systemView({
    id: 'recently-captured',
    name: 'Recently Captured',
    objectType: 'activity',
    sort: [{ field: 'createdAt', direction: 'desc' }],
  }),
  systemView({
    id: 'blocked',
    name: 'Blocked',
    objectType: 'activity',
    filters: [{ id: 'blocked-status', field: 'status', operator: 'eq', value: 'blocked' }],
  }),
  systemView({
    id: 'focus-candidates',
    name: 'Focus Candidates',
    objectType: 'activity',
    filters: [{ id: 'not-completed', field: 'status', operator: 'neq', value: 'completed' }],
    focusPreset: true,
  }),
  systemView({ id: 'all-goals', name: 'All Goals', objectType: 'goal' }),
  systemView({
    id: 'goals-by-arc',
    name: 'Goals by Arc',
    objectType: 'goal',
    groupBy: 'arcId',
  }),
];

export function serializeViewConfig(view: ViewConfig): string {
  return JSON.stringify(view);
}

export function deserializeViewConfig(raw: string): ViewConfig {
  const parsed = JSON.parse(raw) as ViewConfig;
  return normalizeViewConfig(parsed);
}

export function normalizeViewConfig(view: ViewConfig): ViewConfig {
  return {
    ...view,
    filters: Array.isArray(view.filters) ? view.filters : [],
    sort: Array.isArray(view.sort) ? view.sort : [],
    visibleFields: Array.isArray(view.visibleFields) ? view.visibleFields : [],
    groupBy: view.groupBy ?? null,
    layout: view.layout ?? 'list',
    density: view.density ?? 'compact',
    focusPreset: Boolean(view.focusPreset),
    pinned: Boolean(view.pinned),
  };
}

export function applyViewConfig<T extends Activity | Goal>(
  items: T[],
  view: ViewConfig,
): T[] {
  const filtered = items.filter((item) =>
    view.filters.every((filter) => matchesFilter(item, filter)),
  );
  return applySorts(filtered, view.sort);
}

function systemView(params: Partial<ViewConfig> & Pick<ViewConfig, 'id' | 'name' | 'objectType'>): ViewConfig {
  return {
    scope: 'system',
    filters: [],
    sort: [],
    groupBy: null,
    visibleFields: [],
    layout: 'list',
    density: 'compact',
    focusPreset: false,
    pinned: false,
    updatedAt: SYSTEM_UPDATED_AT,
    ...params,
  };
}

function matchesFilter(item: Record<string, unknown>, filter: ViewFilter): boolean {
  const value = item[filter.field];
  switch (filter.operator) {
    case 'eq':
      return value === filter.value;
    case 'neq':
      return value !== filter.value;
    case 'contains':
      return String(value ?? '').toLowerCase().includes(String(filter.value ?? '').toLowerCase());
    case 'exists':
      return value !== undefined && value !== null && value !== '';
    case 'nexists':
      return value === undefined || value === null || value === '';
    case 'in':
      return Array.isArray(filter.value) ? filter.value.includes(String(value)) : false;
    case 'before':
      return value ? String(value) < String(filter.value ?? '') : false;
    case 'after':
      return value ? String(value) > String(filter.value ?? '') : false;
  }
}

function applySorts<T extends Record<string, unknown>>(items: T[], sorts: ViewSort[]): T[] {
  if (sorts.length === 0) return items;
  return [...items].sort((a, b) => {
    for (const sort of sorts) {
      const av = a[sort.field];
      const bv = b[sort.field];
      if (av === bv) continue;
      const result = String(av ?? '').localeCompare(String(bv ?? ''));
      return sort.direction === 'asc' ? result : -result;
    }
    return 0;
  });
}
