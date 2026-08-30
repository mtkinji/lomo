export const CHAT_NAVIGABLE_CAPABILITY_IDS = [
  'goals', 'todos', 'plan', 'arcs', 'chapters', 'money',
  'recipes', 'meal-planning', 'groceries', 'chores', 'focus',
  'household', 'savings', 'screen-time', 'notifications', 'account-settings',
] as const;

export type ChatNavigableCapabilityId = typeof CHAT_NAVIGABLE_CAPABILITY_IDS[number];
export type ChatNavigableObjectType = 'goal' | 'activity' | 'chapter' | 'recipe';
export type CapabilityNavigationRequest = {
  capabilityId: ChatNavigableCapabilityId;
  objectRef: { objectType: ChatNavigableObjectType; objectId: string } | null;
};

const CHAT_NAVIGABLE_CAPABILITY_LABELS: Record<ChatNavigableCapabilityId, string> = {
  goals: 'Goals',
  todos: 'To-dos',
  plan: 'Plan',
  arcs: 'Arcs',
  chapters: 'Chapters',
  money: 'Money',
  recipes: 'Recipes',
  'meal-planning': 'Meal Plan',
  groceries: 'Groceries',
  chores: 'Chores',
  focus: 'Focus',
  household: 'Household',
  savings: 'Savings',
  'screen-time': 'Screen Time',
  notifications: 'Notifications',
  'account-settings': 'Settings',
};

export function capabilityNavigationLabel(capabilityId: ChatNavigableCapabilityId): string {
  return CHAT_NAVIGABLE_CAPABILITY_LABELS[capabilityId];
}

const objectTypeByCapability: Partial<Record<ChatNavigableCapabilityId, ChatNavigableObjectType>> = {
  goals: 'goal', todos: 'activity', chapters: 'chapter', recipes: 'recipe',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length <= allowed.length && keys.every((key) => allowed.includes(key));
}

export function parseCapabilityNavigationRequest(input: unknown): CapabilityNavigationRequest | null {
  if (!isRecord(input) || !hasExactKeys(input, ['capabilityId', 'objectRef'])) return null;
  if (typeof input.capabilityId !== 'string'
    || !(CHAT_NAVIGABLE_CAPABILITY_IDS as readonly string[]).includes(input.capabilityId)) return null;
  const capabilityId = input.capabilityId as ChatNavigableCapabilityId;
  if (input.objectRef == null) return { capabilityId, objectRef: null };
  if (!isRecord(input.objectRef)
    || !hasExactKeys(input.objectRef, ['objectType', 'objectId'])
    || typeof input.objectRef.objectType !== 'string'
    || typeof input.objectRef.objectId !== 'string') return null;
  const objectType = input.objectRef.objectType as ChatNavigableObjectType;
  const objectId = input.objectRef.objectId.trim();
  if (!objectId || objectTypeByCapability[capabilityId] !== objectType) return null;
  return { capabilityId, objectRef: { objectType, objectId } };
}
