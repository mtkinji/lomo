import { getCapability } from '../../capabilities/registry';
import type { CapabilityId } from '../../capabilities/types';
import type { CapabilityAgentContext } from './workflowRegistry';
import { resolveCapabilityNavigation, type CapabilityNavigationTarget } from '../../navigation/capabilityNavigation';

type NavigationStateLike = {
  index?: number;
  routes?: Array<{ name: string; params?: object; state?: NavigationStateLike }>;
};

type FocusedRoute = { name: string; params?: object };

function routeParam(route: FocusedRoute | undefined, key: string): unknown {
  return route?.params && key in route.params
    ? (route.params as Record<string, unknown>)[key]
    : undefined;
}

function focusedRoutes(state: NavigationStateLike | undefined): FocusedRoute[] {
  if (!state?.routes?.length) return [];
  const route = state.routes[state.index ?? state.routes.length - 1];
  return route ? [{ name: route.name, params: route.params }, ...focusedRoutes(route.state)] : [];
}

function rootContext(capabilityId: CapabilityId): CapabilityAgentContext {
  return {
    capabilityId,
    surface: 'inventory',
    returnTarget: getCapability(capabilityId).rootRoute,
  };
}

export function deriveCapabilityAgentContext(
  state: NavigationStateLike | undefined,
): CapabilityAgentContext | null {
  const routes = focusedRoutes(state);
  if (routes[0]?.name !== 'MainTabs') return null;
  const tab = routes[1]?.name;

  if (tab === 'ActivitiesTab') {
    const detail = routes.find(({ name }) => name === 'ActivityDetail');
    const activityId = routeParam(detail, 'activityId');
    return typeof activityId === 'string'
      ? { ...rootContext('todos'), surface: 'detail', object: { type: 'activity', id: activityId } }
      : rootContext('todos');
  }
  if (tab === 'GoalsTab') {
    const detail = routes.find(({ name }) => name === 'GoalDetail');
    const goalId = routeParam(detail, 'goalId');
    return typeof goalId === 'string'
      ? { ...rootContext('goals'), surface: 'detail', object: { type: 'goal', id: goalId } }
      : rootContext('goals');
  }
  if (tab === 'PlanTab') return rootContext('plan');
  if (tab !== 'MoreTab') return null;

  const chapter = routes.find(({ name }) => name === 'MoreChapterDetail');
  const chapterId = routeParam(chapter, 'chapterId');
  if (typeof chapterId === 'string') {
    return { ...rootContext('chapters'), surface: 'detail', object: { type: 'chapter', id: chapterId } };
  }
  const arc = routes.find(({ name }) => name === 'ArcDetail');
  const arcId = routeParam(arc, 'arcId');
  if (typeof arcId === 'string') {
    return { ...rootContext('arcs'), surface: 'detail', object: { type: 'arc', id: arcId } };
  }
  if (routes.some(({ name }) => name.startsWith('MoreChapter'))) return rootContext('chapters');
  if (routes.some(({ name }) => name === 'MoreArcs')) return rootContext('arcs');
  return null;
}

export type CapabilityAgentReturnNavigationTarget = CapabilityNavigationTarget | {
  name: 'MainTabs';
  params: Record<string, unknown>;
};

export function resolveCapabilityAgentReturn(
  context: CapabilityAgentContext,
): CapabilityAgentReturnNavigationTarget {
  const object = context.object;
  if (!object) return resolveCapabilityNavigation(context.capabilityId);

  if (object.type === 'activity') {
    return { name: 'MainTabs', params: { screen: 'ActivitiesTab', params: { screen: 'ActivityDetail', params: { activityId: object.id } } } };
  }
  if (object.type === 'goal') {
    return { name: 'MainTabs', params: { screen: 'GoalsTab', params: { screen: 'GoalDetail', params: { goalId: object.id } } } };
  }
  if (object.type === 'chapter') {
    return { name: 'MainTabs', params: { screen: 'MoreTab', params: { screen: 'MoreChapterDetail', params: { chapterId: object.id } } } };
  }
  return { name: 'MainTabs', params: { screen: 'MoreTab', params: { screen: 'MoreArcs', params: { screen: 'ArcDetail', params: { arcId: object.id } } } } };
}

export function canRestoreCapabilityObject(
  context: CapabilityAgentContext,
  objects: { activityIds: ReadonlySet<string>; goalIds: ReadonlySet<string>; arcIds: ReadonlySet<string> },
): boolean {
  const object = context.object;
  if (!object || object.type === 'chapter') return true;
  if (object.type === 'activity') return objects.activityIds.has(object.id);
  if (object.type === 'goal') return objects.goalIds.has(object.id);
  return objects.arcIds.has(object.id);
}
