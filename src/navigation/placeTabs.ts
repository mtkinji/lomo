import type { IconName } from '../ui/Icon';

export type PlaceTabName = 'GoalsTab' | 'ActivitiesTab' | 'PlanTab' | 'AgentTab';

export type PlaceTabConfig = {
  name: PlaceTabName;
  label: string;
  icon: IconName;
};

/**
 * Single source of truth for "Place" destinations.
 *
 * These should appear in both:
 * - the bottom bar Place zone
 * - the left drawer/rail navigation (for redundancy + reachability)
 */
export const PLACE_TABS: PlaceTabConfig[] = [
  { name: 'GoalsTab', label: 'Goals', icon: 'goals' },
  { name: 'ActivitiesTab', label: 'Activities', icon: 'activities' },
  { name: 'PlanTab', label: 'Plan', icon: 'plan' },
  { name: 'AgentTab', label: 'Agent', icon: 'aiGuide' },
];


