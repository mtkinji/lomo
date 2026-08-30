import {
  resolveCapabilityNavigation,
  type CapabilityNavigationTarget,
} from './capabilityNavigation';
import {
  parseCapabilityNavigationRequest,
  type CapabilityNavigationRequest,
} from '@kwilt/agent-runtime';

export { parseCapabilityNavigationRequest };

type IncludedCapabilityNavigationTarget = Exclude<CapabilityNavigationTarget, { name: 'Explore' | 'Games' }>;

export type ChatCapabilityNavigationTarget = IncludedCapabilityNavigationTarget
  | { name: 'StandaloneFocus'; params: { source: 'chat' } }
  | {
      name: 'Settings';
      params: {
        screen: 'SettingsHousehold' | 'SettingsScreenTimeProtection' | 'SettingsNotifications' | 'SettingsHome';
      };
    }
  | { name: 'Food'; params: { screen: 'GrocerySavings' } }
  | {
      name: 'MainTabs';
      params: {
        screen: 'GoalsTab';
        params: { screen: 'GoalDetail'; params: { goalId: string } };
      };
    }
  | {
      name: 'MainTabs';
      params: {
        screen: 'ActivitiesTab';
        params: { screen: 'ActivityDetail'; params: { activityId: string } };
      };
    }
  | {
      name: 'MainTabs';
      params: {
        screen: 'MoreTab';
        params: { screen: 'MoreChapterDetail'; params: { chapterId: string } };
      };
    }
  | {
      name: 'Food';
      params: { screen: 'RecipeHome'; params: { recipeId: string } };
    };

export function resolveChatCapabilityNavigation(
  request: CapabilityNavigationRequest,
): ChatCapabilityNavigationTarget {
  if (!request.objectRef) {
    switch (request.capabilityId) {
      case 'focus': return { name: 'StandaloneFocus', params: { source: 'chat' } };
      case 'household': return { name: 'Settings', params: { screen: 'SettingsHousehold' } };
      case 'savings': return { name: 'Food', params: { screen: 'GrocerySavings' } };
      case 'screen-time': return { name: 'Settings', params: { screen: 'SettingsScreenTimeProtection' } };
      case 'notifications': return { name: 'Settings', params: { screen: 'SettingsNotifications' } };
      case 'account-settings': return { name: 'Settings', params: { screen: 'SettingsHome' } };
      default: break;
    }
    return resolveCapabilityNavigation(request.capabilityId) as IncludedCapabilityNavigationTarget;
  }

  const { objectType, objectId } = request.objectRef;
  switch (objectType) {
    case 'goal':
      return {
        name: 'MainTabs',
        params: { screen: 'GoalsTab', params: { screen: 'GoalDetail', params: { goalId: objectId } } },
      };
    case 'activity':
      return {
        name: 'MainTabs',
        params: { screen: 'ActivitiesTab', params: { screen: 'ActivityDetail', params: { activityId: objectId } } },
      };
    case 'chapter':
      return {
        name: 'MainTabs',
        params: { screen: 'MoreTab', params: { screen: 'MoreChapterDetail', params: { chapterId: objectId } } },
      };
    case 'recipe':
      return { name: 'Food', params: { screen: 'RecipeHome', params: { recipeId: objectId } } };
  }
}
