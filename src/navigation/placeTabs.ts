import type { IconName } from '../ui/Icon';
import { CAPABILITY_REGISTRY } from '../capabilities/registry';

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
const primaryCapabilityTabs: PlaceTabConfig[] = CAPABILITY_REGISTRY.slice(0, 3).map(
  ({ label, icon, rootRoute }) => {
    if (rootRoute.tab === 'MoreTab') {
      throw new Error(`Primary capability cannot use the More tab: ${label}`);
    }
    return { name: rootRoute.tab, label, icon };
  },
);

export const PLACE_TABS: PlaceTabConfig[] = [
  ...primaryCapabilityTabs,
  { name: 'MoreTab', label: 'More', icon: 'navMore' },
];
