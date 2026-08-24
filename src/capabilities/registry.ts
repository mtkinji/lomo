import type {
  CapabilityDefinition,
  CapabilityGroupDefinition,
  CapabilityId,
  CapabilityMenuDestinationDefinition,
  CapabilityMenuDestinationId,
  CapabilityRouteTarget,
} from './types';
import { moneyCapabilityDefinition } from './money/definition';
import { exploreCapabilityDefinition } from './explore/definition';
import { gamesCapabilityDefinition } from './games/definition';

export const CAPABILITY_GROUPS = [
  { id: 'money', label: 'Money' },
  { id: 'food', label: 'Food' },
  { id: 'goals-plans', label: 'Goals & Plans' },
  { id: 'fun', label: 'Fun' },
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
  moneyCapabilityDefinition,
  exploreCapabilityDefinition,
  gamesCapabilityDefinition,
  {
    id: 'recipes', label: 'Recipes', group: 'food', icon: 'cookingPot', availability: 'active',
    rootRoute: { root: 'Food', screen: 'RecipeLibrary' }, deepLinks: [], agent: currentKwiltAgentContract, lifecycle: {},
  },
  {
    id: 'meal-planning', label: 'Meal Plan', group: 'food', icon: 'plan', availability: 'active',
    rootRoute: { root: 'Food', screen: 'NextMeals' }, deepLinks: [], agent: currentKwiltAgentContract, lifecycle: {},
  },
  {
    id: 'groceries', label: 'Groceries', group: 'food', icon: 'cart', availability: 'active',
    rootRoute: { root: 'Food', screen: 'GroceryList' }, deepLinks: [], agent: currentKwiltAgentContract, lifecycle: {},
  },
  {
    id: 'chores', label: 'Chores', group: null, icon: 'home', availability: 'active',
    rootRoute: { root: 'Chores' }, deepLinks: ['kwilt://chores'], agent: currentKwiltAgentContract, lifecycle: {},
  },
] as const satisfies readonly CapabilityDefinition[];

function currentCapabilityMenuDestination(
  id: Exclude<CapabilityId, 'money'>,
  labelOverride?: string,
): CapabilityMenuDestinationDefinition {
  const capability = getCapability(id);
  return {
    id,
    ownerId: id,
    label: labelOverride ?? capability.label,
    group: capability.group,
    icon: capability.icon,
    availability: capability.availability,
    rootRoute: capability.rootRoute,
  };
}

export const CAPABILITY_MENU_REGISTRY = [
  ...(['arcs', 'goals', 'todos', 'plan', 'chapters', 'recipes', 'groceries', 'explore', 'games', 'chores'] as const).map(
    (id) => currentCapabilityMenuDestination(id, id === 'plan' ? 'Plans' : undefined),
  ),
  {
    id: 'money-summary',
    ownerId: 'money',
    label: 'Budgets',
    group: 'money',
    icon: 'gauge',
    availability: 'active',
    rootRoute: { root: 'Money', screen: 'MoneySummary' },
  },
  {
    id: 'money-transactions',
    ownerId: 'money',
    label: 'Transactions',
    group: 'money',
    icon: 'receipt',
    availability: 'active',
    rootRoute: { root: 'Money', screen: 'MoneyTransactions' },
  },
  {
    id: 'money-accounts',
    ownerId: 'money',
    label: 'Accounts',
    group: 'money',
    icon: 'landmark',
    availability: 'active',
    rootRoute: { root: 'Money', screen: 'MoneyAccounts' },
  },
] as const satisfies readonly CapabilityMenuDestinationDefinition[];

export function getCapability(id: CapabilityId): CapabilityDefinition {
  const capability = CAPABILITY_REGISTRY.find((candidate) => candidate.id === id);
  if (!capability) {
    throw new Error(`Unknown capability: ${id}`);
  }
  return capability;
}

export function getCapabilityMenuDestination(
  id: CapabilityMenuDestinationId,
): CapabilityMenuDestinationDefinition {
  const destination = CAPABILITY_MENU_REGISTRY.find((candidate) => candidate.id === id);
  if (!destination) {
    throw new Error(`Unknown capability menu destination: ${id}`);
  }
  return destination;
}
