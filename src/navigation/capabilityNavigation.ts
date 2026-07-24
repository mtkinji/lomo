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
    }
  | {
      name: 'Money';
      params: { screen: 'MoneySummary' | 'MoneyTransactions' | 'MoneyAccounts' };
    };

export function resolveCapabilityNavigation(id: CapabilityId): CapabilityNavigationTarget {
  const { rootRoute } = getCapability(id);

  if (rootRoute.root === 'Money') {
    return { name: 'Money', params: { screen: rootRoute.screen } };
  }

  switch (rootRoute.tab) {
    case 'GoalsTab':
      return {
        name: 'MainTabs',
        params: { screen: 'GoalsTab', params: { screen: rootRoute.screen } },
      };
    case 'ActivitiesTab':
      return {
        name: 'MainTabs',
        params: { screen: 'ActivitiesTab', params: { screen: rootRoute.screen } },
      };
    case 'PlanTab':
      return { name: 'MainTabs', params: { screen: 'PlanTab' } };
    case 'MoreTab':
      return {
        name: 'MainTabs',
        params: { screen: 'MoreTab', params: { screen: rootRoute.screen } },
      };
  }
}
