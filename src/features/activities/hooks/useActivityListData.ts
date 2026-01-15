import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';
import { QueryService } from '../../../services/QueryService';
import { HapticsService } from '../../../services/HapticsService';
import { openPaywallInterstitial } from '../../../services/paywall';
import type {
  Activity,
  ActivityView,
  ActivityFilterMode,
  ActivitySortMode,
  FilterGroup,
  SortCondition,
  Goal,
} from '../../../domain/types';

export type UseActivityListDataOptions = {
  activeView: ActivityView | undefined;
  focusContextGoalId: string | null;
  sessionCreatedIds: Set<string>;
  showToast: (payload: { message: string; variant?: string; actionLabel?: string; onPressAction?: () => void }) => void;
  lastCreatedActivityRef: React.MutableRefObject<Activity | null>;
};

export type UseActivityListDataReturn = {
  // Derived data
  goalTitleById: Record<string, string>;
  activityById: Map<string, Activity>;
  filterGroups: FilterGroup[];
  sortConditions: SortCondition[];
  filteredActivities: Activity[];
  visibleActivities: Activity[];
  activeActivities: Activity[];
  completedActivities: Activity[];
  hasAnyActivities: boolean;
  isManualOrderEffective: boolean;
  showCompleted: boolean;

  // Update handlers
  handleUpdateFilters: (next: FilterGroup[], groupLogic: 'and' | 'or') => void;
  handleUpdateSorts: (next: SortCondition[]) => void;
  handleUpdateFilterMode: (next: ActivityFilterMode) => void;
  handleUpdateSortMode: (next: ActivitySortMode) => void;
  handleUpdateShowCompleted: (next: boolean) => void;
  wrappedShowToast: (payload: any) => void;
};

export function useActivityListData({
  activeView,
  focusContextGoalId,
  sessionCreatedIds,
  showToast,
  lastCreatedActivityRef,
}: UseActivityListDataOptions): UseActivityListDataReturn {
  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const updateActivityView = useAppStore((state) => state.updateActivityView);
  const isPro = useEntitlementsStore((state) => state.isPro);

  // Views + filtering/sorting are Pro Tools. Free users should see the baseline list,
  // even if they previously customized system views while Pro.
  const filterMode = isPro ? (activeView?.filterMode ?? 'all') : 'all';
  const sortMode = isPro ? (activeView?.sortMode ?? 'manual') : 'manual';
  const showCompleted = isPro ? (activeView?.showCompleted ?? true) : true;

  const goalTitleById = React.useMemo(
    () =>
      goals.reduce<Record<string, string>>((acc, goal) => {
        acc[goal.id] = goal.title;
        return acc;
      }, {}),
    [goals],
  );

  const activityById = React.useMemo(() => {
    const map = new Map<string, Activity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  const filterGroups = React.useMemo<FilterGroup[]>(() => {
    if (activeView?.filters && activeView.filters.length > 0) return activeView.filters;
    // Map legacy filterMode
    switch (filterMode) {
      case 'priority1':
        return [
          {
            logic: 'and',
            conditions: [{ id: 'legacy-p1', field: 'priority', operator: 'eq', value: 1 }],
          },
        ];
      case 'active':
        return [
          {
            logic: 'and',
            conditions: [
              { id: 'legacy-active-done', field: 'status', operator: 'neq', value: 'done' },
              { id: 'legacy-active-can', field: 'status', operator: 'neq', value: 'cancelled' },
            ],
          },
        ];
      case 'completed':
        return [
          {
            logic: 'and',
            conditions: [{ id: 'legacy-completed', field: 'status', operator: 'eq', value: 'done' }],
          },
        ];
      case 'all':
      default:
        return [];
    }
  }, [activeView, filterMode]);

  const structuredSorts = React.useMemo<SortCondition[]>(() => {
    // Structured sorts are Pro Tools. Free users should always see baseline sorting.
    if (!isPro) return [];
    return activeView?.sorts ?? [];
  }, [activeView?.sorts, isPro]);

  const sortConditions = React.useMemo<SortCondition[]>(() => {
    if (structuredSorts.length > 0) return structuredSorts;
    // Map legacy sortMode
    switch (sortMode) {
      case 'titleAsc':
        return [{ field: 'title', direction: 'asc' }];
      case 'titleDesc':
        return [{ field: 'title', direction: 'desc' }];
      case 'dueDateAsc':
        return [{ field: 'scheduledDate', direction: 'asc' }];
      case 'dueDateDesc':
        return [{ field: 'scheduledDate', direction: 'desc' }];
      case 'priority':
        return [{ field: 'priority', direction: 'asc' }];
      case 'manual':
      default:
        return [{ field: 'orderIndex', direction: 'asc' }];
    }
  }, [structuredSorts, sortMode]);

  const isManualOrderEffective = structuredSorts.length === 0 && sortMode === 'manual';

  const filteredActivities = React.useMemo(() => {
    const base = activities.filter((activity) => {
      if (focusContextGoalId && activity.goalId !== focusContextGoalId) return false;
      return true;
    });

    if (filterGroups.length === 0) return base;

    // Apply filters but also include any IDs created in this session ("ghost" logic)
    const filtered = QueryService.applyActivityFilters(
      base,
      filterGroups,
      activeView?.filterGroupLogic ?? 'or',
    );

    if (sessionCreatedIds.size === 0) return filtered;

    const filteredIds = new Set(filtered.map((a) => a.id));
    const ghosts = base.filter((a) => sessionCreatedIds.has(a.id) && !filteredIds.has(a.id));

    return [...filtered, ...ghosts];
  }, [activities, filterGroups, focusContextGoalId, activeView?.filterGroupLogic, sessionCreatedIds]);

  const handleUpdateFilters = React.useCallback(
    (next: FilterGroup[], groupLogic: 'and' | 'or') => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_filter' });
        return;
      }
      if (!activeView) return;
      void HapticsService.trigger('canvas.selection');
      updateActivityView(activeView.id, (view) => ({
        ...view,
        filters: next,
        filterGroupLogic: groupLogic,
      }));
    },
    [activeView, isPro, updateActivityView],
  );

  const wrappedShowToast = React.useCallback(
    (payload: any) => {
      if (payload.message === 'Activity created' && lastCreatedActivityRef.current) {
        const activity = lastCreatedActivityRef.current;
        const matches =
          QueryService.applyActivityFilters(
            [activity],
            filterGroups,
            activeView?.filterGroupLogic ?? 'or',
          ).length > 0;

        if (!matches && filterGroups.length > 0) {
          showToast({
            ...payload,
            actionLabel: 'Clear filters',
            onPressAction: () => {
              handleUpdateFilters([], 'or');
            },
          });
          return;
        }
      }
      showToast(payload);
    },
    [showToast, filterGroups, activeView?.filterGroupLogic, handleUpdateFilters, lastCreatedActivityRef],
  );

  const handleUpdateSorts = React.useCallback(
    (next: SortCondition[]) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_sort' });
        return;
      }
      if (!activeView) return;
      void HapticsService.trigger('canvas.selection');
      updateActivityView(activeView.id, (view) => ({
        ...view,
        sorts: next,
      }));
    },
    [activeView, isPro, updateActivityView],
  );

  const handleUpdateFilterMode = React.useCallback(
    (next: ActivityFilterMode) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_filter' });
        return;
      }
      if (!activeView) return;
      if (next !== activeView.filterMode) {
        void HapticsService.trigger('canvas.selection');
      }
      updateActivityView(activeView.id, (view) => ({
        ...view,
        filterMode: next,
        filters: undefined, // Clear structured filters when switching to legacy mode
      }));
    },
    [activeView, isPro, updateActivityView],
  );

  const handleUpdateSortMode = React.useCallback(
    (next: ActivitySortMode) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_sort' });
        return;
      }
      if (!activeView) return;
      if (next !== activeView.sortMode) {
        void HapticsService.trigger('canvas.selection');
      }
      updateActivityView(activeView.id, (view) => ({
        ...view,
        sortMode: next,
        sorts: undefined, // Clear structured sorts when switching to legacy mode
      }));
    },
    [activeView, isPro, updateActivityView],
  );

  const handleUpdateShowCompleted = React.useCallback(
    (next: boolean) => {
      if (!activeView) return;
      updateActivityView(activeView.id, (view) => ({
        ...view,
        showCompleted: next,
      }));
    },
    [activeView, updateActivityView],
  );

  const visibleActivities = React.useMemo(() => {
    return QueryService.applyActivitySorts(filteredActivities, sortConditions);
  }, [filteredActivities, sortConditions]);

  const activeActivities = React.useMemo(
    () => visibleActivities.filter((activity) => activity.status !== 'done'),
    [visibleActivities],
  );

  const completedActivities = React.useMemo(
    () =>
      showCompleted ? visibleActivities.filter((activity) => activity.status === 'done') : [],
    [visibleActivities, showCompleted],
  );

  const hasAnyActivities = visibleActivities.length > 0;

  return {
    goalTitleById,
    activityById,
    filterGroups,
    sortConditions,
    filteredActivities,
    visibleActivities,
    activeActivities,
    completedActivities,
    hasAnyActivities,
    isManualOrderEffective,
    showCompleted,
    handleUpdateFilters,
    handleUpdateSorts,
    handleUpdateFilterMode,
    handleUpdateSortMode,
    handleUpdateShowCompleted,
    wrappedShowToast,
  };
}

