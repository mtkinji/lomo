import type {
  CapabilityDefinition,
  CapabilityGroupDefinition,
  CapabilityId,
  CapabilityRouteTarget,
} from './types';

export const CAPABILITY_GROUPS = [
  { id: 'goals-plans', label: 'Goals & Plans' },
] as const satisfies readonly CapabilityGroupDefinition[];

const currentKwiltAgentContract = {
  surfaces: ['inventory', 'detail'],
  supportsObjectContext: true,
} as const;

function currentCapability(
  id: CapabilityId,
  label: string,
  icon: CapabilityDefinition['icon'],
  rootRoute: CapabilityRouteTarget,
  deepLinks: readonly string[],
): CapabilityDefinition {
  return {
    id,
    label,
    group: 'goals-plans',
    icon,
    availability: 'active',
    rootRoute,
    deepLinks,
    agent: currentKwiltAgentContract,
    lifecycle: {},
  };
}

export const CAPABILITY_REGISTRY = [
  currentCapability(
    'goals',
    'Goals',
    'navGoals',
    { root: 'MainTabs', tab: 'GoalsTab', screen: 'GoalsList' },
    ['kwilt://goals'],
  ),
  currentCapability(
    'todos',
    'To-dos',
    'navActivities',
    { root: 'MainTabs', tab: 'ActivitiesTab', screen: 'ActivitiesList' },
    ['kwilt://today', 'kwilt://todos', 'kwilt://activities'],
  ),
  currentCapability(
    'plan',
    'Plan',
    'navPlan',
    { root: 'MainTabs', tab: 'PlanTab' },
    ['kwilt://plan'],
  ),
  currentCapability(
    'arcs',
    'Arcs',
    'navArcs',
    { root: 'MainTabs', tab: 'MoreTab', screen: 'MoreArcs' },
    ['kwilt://arcs'],
  ),
  currentCapability(
    'chapters',
    'Chapters',
    'chapters',
    { root: 'MainTabs', tab: 'MoreTab', screen: 'MoreChapters' },
    ['kwilt://chapters'],
  ),
] as const satisfies readonly CapabilityDefinition[];

export function getCapability(id: CapabilityId): CapabilityDefinition {
  const capability = CAPABILITY_REGISTRY.find((candidate) => candidate.id === id);
  if (!capability) {
    throw new Error(`Unknown capability: ${id}`);
  }
  return capability;
}
