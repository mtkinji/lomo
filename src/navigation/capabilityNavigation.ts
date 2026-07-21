import { getCapability } from '../capabilities/registry';
import type { CapabilityId } from '../capabilities/types';

export type CapabilityNavigationTarget =
  | {
      name: 'MainTabs';
      params: {
        screen: 'GoalsTab';
        params: { screen: 'GoalsList' };
      };
    }
  | {
      name: 'MainTabs';
      params: {
        screen: 'ActivitiesTab';
        params: { screen: 'ActivitiesList' };
      };
    }
  | {
      name: 'MainTabs';
      params: { screen: 'PlanTab' };
    }
  | {
      name: 'MainTabs';
      params: {
        screen: 'MoreTab';
        params: { screen: 'MoreArcs' | 'MoreChapters' };
      };
    };

export function resolveCapabilityNavigation(id: CapabilityId): CapabilityNavigationTarget {
  const { rootRoute } = getCapability(id);

  if (rootRoute.tab === 'PlanTab') {
    return { name: rootRoute.root, params: { screen: rootRoute.tab } };
  }

  return {
    name: rootRoute.root,
    params: {
      screen: rootRoute.tab,
      params: { screen: rootRoute.screen },
    },
  } as CapabilityNavigationTarget;
}
