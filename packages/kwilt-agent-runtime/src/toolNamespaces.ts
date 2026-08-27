export const KWILT_TOOL_NAMESPACE_IDS = [
  'life_structure',
  'tasks_plan',
  'household',
  'money',
  'food',
  'device_wellbeing',
  'account_navigation',
] as const;

export type KwiltToolNamespaceId = (typeof KWILT_TOOL_NAMESPACE_IDS)[number];

export const KWILT_TOOL_NAMESPACES: readonly {
  id: KwiltToolNamespaceId;
  description: string;
  capabilityIds: readonly string[];
}[] = [
  {
    id: 'life_structure',
    description: 'Arcs, goals, chapters, profile, and remembered relationships.',
    capabilityIds: ['general', 'relationships', 'profile', 'arcs', 'goals', 'chapters', 'explore'],
  },
  {
    id: 'tasks_plan',
    description: 'Activities, reminders, focus, and calendar planning.',
    capabilityIds: ['todos', 'plan'],
  },
  {
    id: 'household',
    description: 'Household members, shared responsibilities, games, and chores.',
    capabilityIds: ['household', 'games', 'chores', 'channels'],
  },
  {
    id: 'money',
    description: 'Money accounts, plans, transactions, and financial explanations.',
    capabilityIds: ['money'],
  },
  {
    id: 'food',
    description: 'Recipes, meal planning, groceries, food stock, and savings.',
    capabilityIds: ['recipes', 'meal_planning', 'groceries', 'savings'],
  },
  {
    id: 'device_wellbeing',
    description: 'Screen Time, notifications, and device wellbeing controls.',
    capabilityIds: ['screenTime', 'notifications'],
  },
  {
    id: 'account_navigation',
    description: 'Account, subscription, settings, search, and navigation actions.',
    capabilityIds: ['account', 'navigation'],
  },
] as const;

const namespaceByCapability = new Map(
  KWILT_TOOL_NAMESPACES.flatMap((namespace) =>
    namespace.capabilityIds.map((capabilityId) => [capabilityId, namespace.id] as const)),
);

export function namespaceForCapability(capabilityId: string): KwiltToolNamespaceId {
  const namespace = namespaceByCapability.get(capabilityId);
  if (!namespace) throw new Error(`Tool capability has no namespace: ${capabilityId}`);
  return namespace;
}

export function namespaceForTool(tool: { id: string; capabilityId: string }): KwiltToolNamespaceId {
  return namespaceForCapability(tool.capabilityId);
}

export function isKwiltToolNamespaceId(value: unknown): value is KwiltToolNamespaceId {
  return typeof value === 'string' && (KWILT_TOOL_NAMESPACE_IDS as readonly string[]).includes(value);
}
