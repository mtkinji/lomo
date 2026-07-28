import { getCapability, getCapabilityMenuDestination } from '../capabilities/registry';
import type { CapabilityNavigationId } from '../capabilities/types';

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
    }
  | {
      name: 'Explore';
      params: { screen: 'ExploreMap' };
    };

export function resolveCapabilityNavigation(id: CapabilityNavigationId): CapabilityNavigationTarget {
  const { rootRoute } = id.startsWith('money-')
    ? getCapabilityMenuDestination(id as 'money-summary' | 'money-transactions' | 'money-accounts')
    : getCapability(id as Parameters<typeof getCapability>[0]);

  if (rootRoute.root === 'Money') {
    return { name: 'Money', params: { screen: rootRoute.screen } };
  }
  if (rootRoute.root === 'Explore') {
    return { name: 'Explore', params: { screen: rootRoute.screen } };
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
