import type {
  Activity,
  ActivityViewGrouping,
  FilterGroup,
  FilterGroupLogic,
  Goal,
  SortCondition,
} from '../../domain/types';
import { QueryService } from '../../services/QueryService';
import { groupActivitiesForList, type ActivityListGroup } from '../activities/activityGrouping';
import {
  getActivityPriorityReasonLabels,
  getRecommendedPriorityActivities,
  sortActivitiesByPriorityRanking,
} from '../activities/activityPriority';
import { searchActivities } from '../activities/activitySearchAlgorithm';

export type PlanSlotInventoryInput = {
  activities: Activity[];
  goals: Goal[];
  scheduledProposalIds: Set<string>;
  filters?: FilterGroup[];
  filterGroupLogic?: FilterGroupLogic;
  sorts?: SortCondition[];
  grouping?: ActivityViewGrouping;
  query?: string;
  now?: Date;
};

export type PlanSlotInventoryResult = {
  mode: 'recommended' | 'inventory';
  items: Activity[];
  groups: ActivityListGroup[];
  priorityRankByActivityId: Map<string, {
    position: number;
    total: number;
    reasons: string[];
  }>;
};

const CLOSED_STATUSES = new Set<Activity['status']>(['done', 'skipped', 'cancelled']);

export function buildPlanSlotInventory({
  activities,
  goals,
  scheduledProposalIds,
  filters = [],
  filterGroupLogic = 'or',
  sorts = [],
  grouping = { field: 'none' },
  query = '',
  now = new Date(),
}: PlanSlotInventoryInput): PlanSlotInventoryResult {
  const available = activities.filter((activity) => {
    if (CLOSED_STATUSES.has(activity.status)) return false;
    if (activity.scheduledAt) return false;
    if (scheduledProposalIds.has(activity.id)) return false;
    return Boolean(activity.title.trim());
  });

  const inventoryMode = Boolean(
    query.trim() ||
    filters.length > 0 ||
    sorts.length > 0 ||
    grouping.field !== 'none',
  );

  if (!inventoryMode) {
    const recommendations = getRecommendedPriorityActivities({
      activities: available,
      goals,
      now,
      limit: 10,
      surface: 'mobile',
    });
    const total = recommendations.length;
    return {
      mode: 'recommended',
      items: recommendations.map((row) => row.activity),
      groups: [],
      priorityRankByActivityId: new Map(
        recommendations.map((row, index) => [
          row.activity.id,
          {
            position: index + 1,
            total,
            reasons: getActivityPriorityReasonLabels(row.reasonCodes),
          },
        ]),
      ),
    };
  }

  const filtered = filters.length > 0
    ? QueryService.applyActivityFilters(available, filters, filterGroupLogic)
    : available;

  const goalTitleById = goals.reduce<Record<string, string>>((result, goal) => {
    result[goal.id] = goal.title;
    return result;
  }, {});
  const searched = query.trim()
    ? searchActivities({ activities: filtered, query, goalTitleById })
    : filtered;

  let items: Activity[];
  if (sorts[0]?.field === 'priority') {
    const ranked = sortActivitiesByPriorityRanking({ activities: searched, goals, now });
    items = sorts[0].direction === 'desc' ? [...ranked].reverse() : ranked;
  } else if (sorts.length > 0) {
    items = QueryService.applyActivitySorts(searched, sorts);
  } else if (query.trim()) {
    items = searched;
  } else {
    items = QueryService.applyActivitySorts(searched, [
      { field: 'orderIndex', direction: 'asc' },
    ]);
  }

  return {
    mode: 'inventory',
    items,
    groups: groupActivitiesForList({ activities: items, goals, grouping, now }),
    priorityRankByActivityId: new Map(),
  };
}
