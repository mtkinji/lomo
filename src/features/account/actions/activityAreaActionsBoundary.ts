import { useAppStore } from '../../../store/useAppStore';
import { createActivityAreaActions, type ActivityAreaActionsBoundary } from './activityAreaActions';

export const DEFAULT_ACTIVITY_AREA_ACTIONS_BOUNDARY: ActivityAreaActionsBoundary = {
  read: () => ({ areas: useAppStore.getState().activityAreas, activities: useAppStore.getState().activities }),
  apply: (areas) => useAppStore.getState().setActivityAreas(areas),
};

export const activityAreaActions = createActivityAreaActions(DEFAULT_ACTIVITY_AREA_ACTIONS_BOUNDARY);
