import {
  Activity,
  FilterGroup,
  FilterGroupLogic,
  FilterCondition,
  SortCondition,
  FilterOperator,
} from '../domain/types';

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
   * Normalize user-supplied filter values for `scheduledDate`.
   * Supports absolute keys ("YYYY-MM-DD") as well as relative tokens ("today", "+7days", "-1week").
   */
  private static normalizeScheduledDateFilterValueToDateKey(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (this.isDateKeyString(trimmed)) return trimmed;
    const rel = this.resolveRelativeDateTokenToDateKey(trimmed);
    return rel;
  }

  private static hasWildcardPattern(value: string): boolean {
    return value.includes('*');
  }

  private static escapeRegexLiteral(s: string): string {
    // Escape regexp metacharacters (we will re-enable '*' as our wildcard).
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static matchesWildcardPattern(args: { candidate: string; pattern: string }): boolean {
    const candidate = args.candidate;
    const pattern = args.pattern;
    // Glob-style '*' wildcard matching (case-insensitive), anchored to whole string.
    // Example: "Due *today*" -> /^Due .*today.*$/i
    const escaped = this.escapeRegexLiteral(pattern);
    const regexSource = `^${escaped.replace(/\\\*/g, '.*')}$`;
    try {
      const re = new RegExp(regexSource, 'i');
      return re.test(candidate);
    } catch {
      // Fallback: treat as a simple substring.
      return candidate.toLowerCase().includes(pattern.toLowerCase());
    }
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

    return activities.filter((activity) => {
      const matchesGroup = (group: FilterGroup): boolean => {
        const { logic, conditions } = group;
        if (!conditions || conditions.length === 0) return true;

        if (logic === 'and') {
          return conditions.every((condition) => this.matchesCondition(activity, condition));
        } else {
          return conditions.some((condition) => this.matchesCondition(activity, condition));
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

    const list = [...activities];

    list.sort((a, b) => {
      for (const sort of sorts) {
        const result = this.compareActivities(a, b, sort);
        if (result !== 0) return result;
      }
      // Final fallback: manual order/creation time
      return this.compareManual(a, b);
    });

    return list;
  }

  private static matchesCondition(activity: Activity, condition: FilterCondition): boolean {
    const { field, operator, value } = condition;
    const activityValue = (activity as any)[field];

    switch (operator) {
      case 'eq':
        if (field === 'scheduledDate') {
          const left = this.normalizeScheduledDateFilterValueToDateKey(activityValue) ?? (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = this.normalizeScheduledDateFilterValueToDateKey(value);
          // If the filter value is a relative token/date key, compare on normalized date keys.
          if (right !== null) return left === right;
        }
        return activityValue === value;
      case 'neq':
        if (field === 'scheduledDate') {
          const left = this.normalizeScheduledDateFilterValueToDateKey(activityValue) ?? (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = this.normalizeScheduledDateFilterValueToDateKey(value);
          if (right !== null) return left !== right;
        }
        return activityValue !== value;
      case 'contains':
        // Empty search value should not match anything (user hasn't entered a value yet)
        if (value === undefined || value === null || value === '') {
          return false;
        }
        if (typeof activityValue === 'string') {
          const pattern = String(value);
          if (this.hasWildcardPattern(pattern)) {
            return this.matchesWildcardPattern({ candidate: activityValue, pattern });
          }
          return activityValue.toLowerCase().includes(pattern.toLowerCase());
        }
        if (Array.isArray(activityValue)) {
          const pattern = String(value);
          if (this.hasWildcardPattern(pattern)) {
            return activityValue.some((v) =>
              this.matchesWildcardPattern({ candidate: String(v ?? ''), pattern })
            );
          }
          return activityValue.some((v) => String(v).toLowerCase().includes(pattern.toLowerCase()));
        }
        return false;
      case 'gt':
        if (field === 'scheduledDate') {
          const left = this.normalizeScheduledDateFilterValueToDateKey(activityValue) ?? (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = this.normalizeScheduledDateFilterValueToDateKey(value);
          if (right !== null) {
            // Missing due dates should never satisfy comparisons like "before/after".
            if (left === null) return false;
            return left > right;
          }
        }
        return this.compare(activityValue, value) > 0;
      case 'lt':
        if (field === 'scheduledDate') {
          const left = this.normalizeScheduledDateFilterValueToDateKey(activityValue) ?? (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = this.normalizeScheduledDateFilterValueToDateKey(value);
          if (right !== null) {
            if (left === null) return false;
            return left < right;
          }
        }
        return this.compare(activityValue, value) < 0;
      case 'gte':
        if (field === 'scheduledDate') {
          const left = this.normalizeScheduledDateFilterValueToDateKey(activityValue) ?? (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = this.normalizeScheduledDateFilterValueToDateKey(value);
          if (right !== null) {
            if (left === null) return false;
            return left >= right;
          }
        }
        return this.compare(activityValue, value) >= 0;
      case 'lte':
        if (field === 'scheduledDate') {
          const left = this.normalizeScheduledDateFilterValueToDateKey(activityValue) ?? (this.isDateKeyString(activityValue) ? activityValue : null);
          const right = this.normalizeScheduledDateFilterValueToDateKey(value);
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

  private static compareActivities(a: Activity, b: Activity, sort: SortCondition): number {
    const { field, direction } = sort;
    const factor = direction === 'asc' ? 1 : -1;

    let valA = (a as any)[field];
    let valB = (b as any)[field];

    // Special handling for due dates
    if (field === 'scheduledDate' || field === 'reminderAt') {
      const timeA = valA ? new Date(valA).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = valB ? new Date(valB).getTime() : Number.MAX_SAFE_INTEGER;
      return (timeA - timeB) * factor;
    }

    // Default comparison
    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB, undefined, { sensitivity: 'base' }) * factor;
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

