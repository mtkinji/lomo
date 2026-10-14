import {
  Activity,
  FilterGroup,
  FilterGroupLogic,
  FilterCondition,
  SortCondition,
  FilterOperator,
} from '../domain/types';

const DATE_SORT_FIELDS = new Set(['scheduledDate', 'reminderAt', 'createdAt', 'updatedAt']);
const titleCollator = typeof Intl !== 'undefined' && typeof Intl.Collator === 'function'
  ? new Intl.Collator(undefined, { sensitivity: 'base' }) : null;

/**
 * Service for applying structured filters and sorts to domain objects.
 * Currently focused on Activities.
 */
export class QueryService {
  private static isIsoDateTimeString(val: unknown): val is string {
    if (typeof val !== 'string') return false;
    // ISO string check (datetime). Example: 2026-02-05T12:34:56Z
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);
  }

  private static isDateKeyString(val: unknown): val is string {
    if (typeof val !== 'string') return false;
    // Local date key: YYYY-MM-DD
    return /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
  }

  private static toLocalDateKey(date: Date): string {
    const y = String(date.getFullYear());
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private static tryParseDate(input: unknown): Date | null {
    if (input instanceof Date && Number.isFinite(input.getTime())) return input;
    if (typeof input !== 'string') return null;
    const raw = input.trim();
    if (!raw) return null;
    // Accept ISO datetime strings and coerce to Date.
    if (this.isIsoDateTimeString(raw)) {
      const d = new Date(raw);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    // Accept local date key (YYYY-MM-DD) and treat it as a local calendar date.
    if (this.isDateKeyString(raw)) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (!match) return null;
      const y = Number.parseInt(match[1] ?? '', 10);
      const m = Number.parseInt(match[2] ?? '', 10);
      const d = Number.parseInt(match[3] ?? '', 10);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
      return new Date(y, m - 1, d);
    }
    return null;
  }

  private static addLocalDays(date: Date, deltaDays: number): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + deltaDays);
    return d;
  }

  /**
   * Resolve relative date tokens used by AI-generated views / presets.
   *
   * Supported examples:
   * - "today"
   * - "+7days", "+30days"
   * - "-1week", "+2weeks"
   * - "+1day"
   */
  private static resolveRelativeDateTokenToDateKey(raw: string, now = new Date()): string | null {
    const s = String(raw ?? '').trim().toLowerCase();
    if (!s) return null;
    if (s === 'today') return this.toLocalDateKey(now);
    if (s === 'tomorrow') return this.toLocalDateKey(this.addLocalDays(now, 1));
    if (s === 'yesterday') return this.toLocalDateKey(this.addLocalDays(now, -1));

    const m = s.match(/^([+-])\s*(\d+)\s*(day|days|week|weeks)$/i);
    if (!m) return null;
    const sign = m[1] === '-' ? -1 : 1;
    const count = Number.parseInt(m[2] ?? '', 10);
    const unit = (m[3] ?? '').toLowerCase();
    if (!Number.isFinite(count)) return null;
    const n = Math.max(0, Math.floor(count));
    const deltaDays = unit.startsWith('week') ? sign * n * 7 : sign * n;
    return this.toLocalDateKey(this.addLocalDays(now, deltaDays));
  }

  /**
   * Normalize user-supplied filter values for date-like fields.
   * Supports absolute keys ("YYYY-MM-DD") as well as relative tokens ("today", "+7days", "-1week").
   */
  private static normalizeDateFilterValueToDateKey(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (this.isDateKeyString(trimmed)) return trimmed;
    return this.resolveRelativeDateTokenToDateKey(trimmed);
  }

  /**
   * Normalize user-supplied filter values for `scheduledDate`.
   * Supports absolute keys ("YYYY-MM-DD") as well as relative tokens ("today", "+7days", "-1week").
   */
  private static normalizeScheduledDateFilterValueToDateKey(value: unknown): string | null {
    return this.normalizeDateFilterValueToDateKey(value);
  }

  /**
   * Normalize `reminderAt` values to a local date key (YYYY-MM-DD) so filters like
   * "On/Before/After" behave as calendar-date comparisons rather than strict timestamp compares.
   */
  private static normalizeReminderAtToDateKey(value: unknown): string | null {
    const d = this.tryParseDate(value);
    if (!d) return null;
    return this.toLocalDateKey(d);
  }

  private static hasWildcardPattern(value: string): boolean {
    return value.includes('*');
  }

  private static escapeRegexLiteral(s: string): string {
    // Escape regexp metacharacters (we will re-enable '*' as our wildcard).
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static prepareCondition(condition: FilterCondition) {
    const { field, operator, value } = condition;
    const dateKey = (field === 'scheduledDate' || field === 'reminderAt')
      ? this.normalizeDateFilterValueToDateKey(value) : null;
    const pattern = String(value ?? '');
    let wildcard: RegExp | null = null;
    if (operator === 'contains' && this.hasWildcardPattern(pattern)) {
      try {
        wildcard = new RegExp(`^${this.escapeRegexLiteral(pattern).replace(/\\\*/g, '.*')}$`, 'i');
      } catch { /* Preserve substring fallback for invalid patterns. */ }
    }
    const lowerPattern = pattern.toLowerCase();
    return {
      dateKey,
      contains: (candidate: string) => wildcard
        ? wildcard.test(candidate) : candidate.toLowerCase().includes(lowerPattern),
    };
  }

  /**
   * Applies a list of filter groups to an array of activities.
   * Groups are combined using the provided groupLogic (defaults to 'or').
   * Within a group, conditions are combined with the group's logic (AND or OR).
   */
  static applyActivityFilters(
    activities: Activity[],
    groups: FilterGroup[],
    groupLogic: FilterGroupLogic = 'or'
  ): Activity[] {
    if (!groups || groups.length === 0) return activities;

    const prepared = new Map<FilterCondition, ReturnType<typeof QueryService.prepareCondition>>();
    for (const group of groups) {
      for (const condition of group.conditions ?? []) prepared.set(condition, this.prepareCondition(condition));
    }
    return activities.filter((activity) => {
      const matchesGroup = (group: FilterGroup): boolean => {
        const { logic, conditions } = group;
        if (!conditions || conditions.length === 0) return true;

        if (logic === 'and') {
          return conditions.every((condition) => this.matchesCondition(activity, condition, prepared.get(condition)!));
        } else {
          return conditions.some((condition) => this.matchesCondition(activity, condition, prepared.get(condition)!));
        }
      };

      // Apply groupLogic: 'or' means match ANY group, 'and' means match ALL groups
      if (groupLogic === 'and') {
        return groups.every(matchesGroup);
      } else {
        return groups.some(matchesGroup);
      }
    });
  }

  /**
   * Applies a list of sort conditions to an array of activities.
   * Sorts are applied in order (primary, secondary, etc.).
   */
  static applyActivitySorts(activities: Activity[], sorts: SortCondition[]): Activity[] {
    if (!sorts || sorts.length === 0) return activities;

    // Date parsing belongs outside the O(n log n) comparator. Keep the
    // original objects and stable tie order while preparing each key once.
    const list = activities.map((activity) => ({
      activity,
      values: sorts.map(({ field }) => {
        const value = activity[field as keyof Activity];
        return DATE_SORT_FIELDS.has(field)
          ? value ? new Date(value as string).getTime() : Number.MAX_SAFE_INTEGER
          : value;
      }),
    }));

    list.sort((a, b) => {
      for (let index = 0; index < sorts.length; index++) {
        const result = this.compareSortValues(a.values[index], b.values[index], sorts[index]);
        if (result !== 0) return result;
      }
      // Final fallback: manual order/creation time
      return this.compareManual(a.activity, b.activity);
    });

    return list.map(({ activity }) => activity);
  }

  private static matchesCondition(activity: Activity, condition: FilterCondition, prepared: ReturnType<typeof QueryService.prepareCondition>): boolean {
    const { field, operator, value } = condition;
    const activityValue = (activity as any)[field];

    switch (operator) {
      case 'eq':
        if (field === 'scheduledDate') {
          const left =
            this.normalizeScheduledDateFilterValueToDateKey(activityValue) ??
            (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = prepared.dateKey;
          // If the filter value is a relative token/date key, compare on normalized date keys.
          if (right !== null) return left === right;
        }
        if (field === 'reminderAt') {
          const left = this.normalizeReminderAtToDateKey(activityValue);
          const right = prepared.dateKey;
          if (right !== null) return left === right;
        }
        return activityValue === value;
      case 'neq':
        if (field === 'scheduledDate') {
          const left =
            this.normalizeScheduledDateFilterValueToDateKey(activityValue) ??
            (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = prepared.dateKey;
          if (right !== null) return left !== right;
        }
        if (field === 'reminderAt') {
          const left = this.normalizeReminderAtToDateKey(activityValue);
          const right = prepared.dateKey;
          if (right !== null) return left !== right;
        }
        return activityValue !== value;
      case 'contains':
        // Empty search value should not match anything (user hasn't entered a value yet)
        if (value === undefined || value === null || value === '') {
          return false;
        }
        if (typeof activityValue === 'string') return prepared.contains(activityValue);
        if (Array.isArray(activityValue)) {
          return activityValue.some((v) => prepared.contains(String(
            this.hasWildcardPattern(String(value)) ? v ?? '' : v,
          )));
        }
        return false;
      case 'gt':
        if (field === 'scheduledDate') {
          const left =
            this.normalizeScheduledDateFilterValueToDateKey(activityValue) ??
            (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = prepared.dateKey;
          if (right !== null) {
            // Missing due dates should never satisfy comparisons like "before/after".
            if (left === null) return false;
            return left > right;
          }
        }
        if (field === 'reminderAt') {
          const left = this.normalizeReminderAtToDateKey(activityValue);
          const right = prepared.dateKey;
          if (right !== null) {
            if (left === null) return false;
            return left > right;
          }
        }
        return this.compare(activityValue, value) > 0;
      case 'lt':
        if (field === 'scheduledDate') {
          const left =
            this.normalizeScheduledDateFilterValueToDateKey(activityValue) ??
            (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = prepared.dateKey;
          if (right !== null) {
            if (left === null) return false;
            return left < right;
          }
        }
        if (field === 'reminderAt') {
          const left = this.normalizeReminderAtToDateKey(activityValue);
          const right = prepared.dateKey;
          if (right !== null) {
            if (left === null) return false;
            return left < right;
          }
        }
        return this.compare(activityValue, value) < 0;
      case 'gte':
        if (field === 'scheduledDate') {
          const left =
            this.normalizeScheduledDateFilterValueToDateKey(activityValue) ??
            (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = prepared.dateKey;
          if (right !== null) {
            if (left === null) return false;
            return left >= right;
          }
        }
        if (field === 'reminderAt') {
          const left = this.normalizeReminderAtToDateKey(activityValue);
          const right = prepared.dateKey;
          if (right !== null) {
            if (left === null) return false;
            return left >= right;
          }
        }
        return this.compare(activityValue, value) >= 0;
      case 'lte':
        if (field === 'scheduledDate') {
          const left =
            this.normalizeScheduledDateFilterValueToDateKey(activityValue) ??
            (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = prepared.dateKey;
          if (right !== null) {
            if (left === null) return false;
            return left <= right;
          }
        }
        if (field === 'reminderAt') {
          const left = this.normalizeReminderAtToDateKey(activityValue);
          const right = prepared.dateKey;
          if (right !== null) {
            if (left === null) return false;
            return left <= right;
          }
        }
        return this.compare(activityValue, value) <= 0;
      case 'exists':
        return activityValue !== null && activityValue !== undefined && activityValue !== '';
      case 'nexists':
        return activityValue === null || activityValue === undefined || activityValue === '';
      case 'in':
        if (Array.isArray(value)) {
          if (Array.isArray(activityValue)) {
            return activityValue.some((v) => value.includes(v));
          }
          return value.includes(activityValue);
        }
        return false;
      default:
        return false;
    }
  }

  private static compare(a: any, b: any): number {
    if (a === b) return 0;
    
    // Handle dates
    if (this.isIsoDateTimeString(a) && this.isIsoDateTimeString(b)) {
      return new Date(a).getTime() - new Date(b).getTime();
    }

    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  }

  private static compareSortValues(valA: any, valB: any, sort: SortCondition): number {
    const { field, direction } = sort;
    const factor = direction === 'asc' ? 1 : -1;
    if (DATE_SORT_FIELDS.has(field)) return (valA - valB) * factor;

    // Default comparison
    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return (titleCollator ? titleCollator.compare(valA, valB)
        : valA.localeCompare(valB, undefined, { sensitivity: 'base' })) * factor;
    }

    return (valA > valB ? 1 : -1) * factor;
  }

  private static compareManual(a: Activity, b: Activity): number {
    const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  }
}
