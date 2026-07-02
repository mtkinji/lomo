import type { Activity, FilterGroup } from '../../domain/types';

type QuickAddDefaultsParams = {
  filterGroups: FilterGroup[] | null | undefined;
  activeTagGroupLabel?: string | null;
  now?: Date;
};

function toLocalDateKey(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addLocalDays(date: Date, deltaDays: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + deltaDays);
  return d;
}

function parseLocalDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const y = Number.parseInt(match[1] ?? '', 10);
  const m = Number.parseInt(match[2] ?? '', 10);
  const d = Number.parseInt(match[3] ?? '', 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

function resolveRelativeDateTokenToDateKey(raw: string, now: Date): string | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'today') return toLocalDateKey(now);
  if (s === 'tomorrow') return toLocalDateKey(addLocalDays(now, 1));
  if (s === 'yesterday') return toLocalDateKey(addLocalDays(now, -1));

  const m = s.match(/^([+-])\s*(\d+)\s*(day|days|week|weeks)$/i);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  const count = Number.parseInt(m[2] ?? '', 10);
  const unit = (m[3] ?? '').toLowerCase();
  if (!Number.isFinite(count)) return null;
  const n = Math.max(0, Math.floor(count));
  const deltaDays = unit.startsWith('week') ? sign * n * 7 : sign * n;
  return toLocalDateKey(addLocalDays(now, deltaDays));
}

function normalizeDateLikeFilterValueToDateKey(value: unknown, now: Date): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return resolveRelativeDateTokenToDateKey(trimmed, now);
}

function chooseBestDateKey(keys: string[], now: Date): string | null {
  if (!keys || keys.length === 0) return null;
  const todayKey = toLocalDateKey(now);
  const today = parseLocalDateKey(todayKey);
  if (!today) return keys[0] ?? null;

  const unique = Array.from(new Set(keys.filter((k) => typeof k === 'string' && k.trim().length > 0)));
  const dated = unique
    .map((k) => ({ k, d: parseLocalDateKey(k) }))
    .filter((x): x is { k: string; d: Date } => Boolean(x.d));

  const futureOrToday = dated
    .map((x) => ({ ...x, delta: x.d.getTime() - today.getTime() }))
    .filter((x) => x.delta >= 0)
    .sort((a, b) => a.delta - b.delta);
  if (futureOrToday.length > 0) return futureOrToday[0].k;

  const past = dated
    .map((x) => ({ ...x, delta: x.d.getTime() - today.getTime() }))
    .filter((x) => x.delta < 0)
    .sort((a, b) => b.delta - a.delta);
  if (past.length > 0) return past[0].k;

  return unique[0] ?? null;
}

export function buildQuickAddDefaultsFromFilters({
  filterGroups,
  activeTagGroupLabel,
  now = new Date(),
}: QuickAddDefaultsParams): Partial<Activity> {
  if (!filterGroups || filterGroups.length !== 1) {
    return activeTagGroupLabel ? { tags: [activeTagGroupLabel] } : {};
  }
  const group = filterGroups[0];
  if (!group || (group.logic !== 'and' && group.logic !== 'or')) return {};

  const defaults: Partial<Activity> = {};
  const tagDefaults: string[] = [];
  const candidatesByField: Partial<Record<string, unknown[]>> | null = group.logic === 'or' ? {} : null;

  for (const c of group.conditions ?? []) {
    if (!c) continue;
    switch (c.field) {
      case 'goalId':
        if (c.operator === 'eq' && typeof c.value === 'string') {
          if (candidatesByField) (candidatesByField.goalId ??= []).push(c.value);
          else defaults.goalId = c.value;
        }
        break;
      case 'priority':
        if (c.operator === 'eq' && typeof c.value === 'number' && (c.value === 1 || c.value === 2 || c.value === 3)) {
          if (candidatesByField) (candidatesByField.priority ??= []).push(c.value);
          else defaults.priority = c.value as Activity['priority'];
        }
        break;
      case 'status':
        if (c.operator === 'eq' && typeof c.value === 'string') {
          if (c.value === 'planned' || c.value === 'in_progress') {
            if (candidatesByField) (candidatesByField.status ??= []).push(c.value);
            else defaults.status = c.value as Activity['status'];
          }
        }
        break;
      case 'scheduledDate':
        if (c.operator === 'eq') {
          const key = normalizeDateLikeFilterValueToDateKey(c.value, now);
          if (key) {
            if (candidatesByField) (candidatesByField.scheduledDate ??= []).push(key);
            else defaults.scheduledDate = key;
          }
        } else if (c.operator === 'lt' || c.operator === 'gt') {
          const boundaryKey = normalizeDateLikeFilterValueToDateKey(c.value, now);
          const boundaryDate = boundaryKey ? parseLocalDateKey(boundaryKey) : null;
          if (boundaryDate) {
            const chosen = toLocalDateKey(addLocalDays(boundaryDate, c.operator === 'lt' ? -1 : 1));
            if (candidatesByField) (candidatesByField.scheduledDate ??= []).push(chosen);
            else defaults.scheduledDate = chosen;
          }
        }
        break;
      case 'reminderAt':
        if (c.operator === 'eq' && typeof c.value === 'string') {
          const trimmed = c.value.trim();
          const isIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed);
          const isKey = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
          if (isIso || isKey) {
            if (candidatesByField) (candidatesByField.reminderAt ??= []).push(trimmed);
            else defaults.reminderAt = trimmed;
          }
        }
        break;
      case 'type':
        if (c.operator === 'eq' && typeof c.value === 'string') {
          if (candidatesByField) (candidatesByField.type ??= []).push(c.value);
          else defaults.type = c.value as Activity['type'];
        }
        break;
      case 'difficulty':
        if (c.operator === 'eq' && typeof c.value === 'string') {
          if (candidatesByField) (candidatesByField.difficulty ??= []).push(c.value);
          else defaults.difficulty = c.value as Activity['difficulty'];
        }
        break;
      case 'estimateMinutes':
        if (c.operator === 'eq' && typeof c.value === 'number') {
          if (candidatesByField) (candidatesByField.estimateMinutes ??= []).push(c.value);
          else defaults.estimateMinutes = c.value;
        }
        break;
      case 'tags':
        if (c.operator === 'in' && Array.isArray(c.value)) {
          for (const t of c.value) {
            if (typeof t === 'string' && t.trim().length > 0) tagDefaults.push(t.trim());
          }
        }
        break;
      default:
        break;
    }
  }

  if (candidatesByField) {
    const goalId = candidatesByField.goalId?.find((x) => typeof x === 'string' && x.trim().length > 0);
    if (typeof goalId === 'string') defaults.goalId = goalId;

    const statuses = candidatesByField.status?.filter((x) => x === 'planned' || x === 'in_progress') ?? [];
    if (statuses.includes('planned')) defaults.status = 'planned';
    else if (statuses.includes('in_progress')) defaults.status = 'in_progress';

    const priorities = candidatesByField.priority?.filter((x) => x === 1 || x === 2 || x === 3) as number[] | undefined;
    if (priorities && priorities.length > 0) defaults.priority = Math.min(...priorities) as Activity['priority'];

    const scheduledDate = Array.isArray(candidatesByField.scheduledDate)
      ? chooseBestDateKey(candidatesByField.scheduledDate as string[], now)
      : null;
    if (scheduledDate) defaults.scheduledDate = scheduledDate;

    const reminderAt = candidatesByField.reminderAt?.find((x) => typeof x === 'string' && x.trim().length > 0);
    if (typeof reminderAt === 'string') defaults.reminderAt = reminderAt;

    const type = candidatesByField.type?.find((x) => typeof x === 'string' && x.trim().length > 0);
    if (typeof type === 'string') defaults.type = type as Activity['type'];

    const difficulty = candidatesByField.difficulty?.find((x) => typeof x === 'string' && x.trim().length > 0);
    if (typeof difficulty === 'string') defaults.difficulty = difficulty as Activity['difficulty'];

    const estimateMinutes = candidatesByField.estimateMinutes?.find((x) => typeof x === 'number' && Number.isFinite(x));
    if (typeof estimateMinutes === 'number') defaults.estimateMinutes = estimateMinutes;
  }

  if (activeTagGroupLabel) tagDefaults.push(activeTagGroupLabel);
  if (tagDefaults.length > 0) defaults.tags = Array.from(new Set(tagDefaults));
  return defaults;
}
