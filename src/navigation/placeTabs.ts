import type { IconName } from '../ui/Icon';

export type PlaceTabName = 'GoalsTab' | 'ActivitiesTab' | 'PlanTab' | 'MoreTab';

export type PlaceTabConfig = {
  name: PlaceTabName;
  label: string;
  icon: IconName;
};

/**
 * Single source of truth for "Place" destinations.
 *
 * These should appear in the bottom bar Place zone.
 */
export const PLACE_TABS: PlaceTabConfig[] = [
  { name: 'GoalsTab', label: 'Goals', icon: 'goals' },
  { name: 'ActivitiesTab', label: 'Activities', icon: 'activities' },
  { name: 'PlanTab', label: 'Plan', icon: 'plan' },
  { name: 'MoreTab', label: 'More', icon: 'more' },
];


