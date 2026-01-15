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
        return activityValue === value;
      case 'neq':
        return activityValue !== value;
      case 'contains':
        // Empty search value should not match anything (user hasn't entered a value yet)
        if (value === undefined || value === null || value === '') {
          return false;
        }
        if (typeof activityValue === 'string') {
          return activityValue.toLowerCase().includes(String(value).toLowerCase());
        }
        if (Array.isArray(activityValue)) {
          return activityValue.some((v) =>
            String(v).toLowerCase().includes(String(value).toLowerCase())
          );
        }
        return false;
      case 'gt':
        return this.compare(activityValue, value) > 0;
      case 'lt':
        return this.compare(activityValue, value) < 0;
      case 'gte':
        return this.compare(activityValue, value) >= 0;
      case 'lte':
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
    if (this.isDateString(a) && this.isDateString(b)) {
      return new Date(a).getTime() - new Date(b).getTime();
    }

    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  }

  private static isDateString(val: any): boolean {
    if (typeof val !== 'string') return false;
    // ISO string check
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);
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

