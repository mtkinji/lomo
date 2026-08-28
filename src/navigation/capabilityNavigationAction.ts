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
