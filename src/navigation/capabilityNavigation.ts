import { CommonActions } from '@react-navigation/native';
import { getCapability, getCapabilityMenuDestination } from '../capabilities/registry';
import type { CapabilityNavigationId } from '../capabilities/types';

export const ROOT_DRAWER_BACK_BEHAVIOR = 'history' as const;

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
    }
  | {
      name: 'Games';
      params: { screen: 'GamesShelf' };
    }
  | {
      name: 'Chores';
    }
  | {
      name: 'Food';
      params: {
        screen: 'RecipeLibrary' | 'NextMeals' | 'GroceryList';
        params?: { entryPoint: 'capability-menu' };
      };
    };

export function createCapabilityNavigateAction(target: { name: string; params?: object }) {
  return CommonActions.navigate(target.name, target.params);
}

export function resolveCapabilityNavigation(id: CapabilityNavigationId): CapabilityNavigationTarget {
  let rootRoute;
  try {
    rootRoute = getCapabilityMenuDestination(id as Parameters<typeof getCapabilityMenuDestination>[0]).rootRoute;
  } catch {
    rootRoute = getCapability(id as Parameters<typeof getCapability>[0]).rootRoute;
  }

  if (rootRoute.root === 'Money') {
    return { name: 'Money', params: { screen: rootRoute.screen } };
  }
  if (rootRoute.root === 'Explore') {
    return { name: 'Explore', params: { screen: rootRoute.screen } };
  }
  if (rootRoute.root === 'Games') {
    return { name: 'Games', params: { screen: rootRoute.screen } };
  }
  if (rootRoute.root === 'Chores') {
    return { name: 'Chores' };
  }
  if (rootRoute.root === 'Food') {
    if (id === 'groceries') {
      return {
        name: 'Food',
        params: {
          screen: 'GroceryList',
          params: { entryPoint: 'capability-menu' },
        },
      };
    }
    return { name: 'Food', params: { screen: rootRoute.screen } };
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
