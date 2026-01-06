import type { ActivityType } from './types';

/**
 * Client-side capability map for Destinations.
 *
 * Today, the execution target definition schema does not expose supported Activity types
 * explicitly. We derive this from the definition `kind` until the backend adds a canonical field.
 */
export function getDestinationSupportedActivityTypes(kind: string): ActivityType[] {
  const k = String(kind ?? '').trim().toLowerCase();

  // Built-in retailer send-to options: only make sense for shopping lists.
  if (k === 'amazon' || k === 'home_depot' || k === 'instacart' || k === 'doordash') {
    return ['shopping_list'];
  }

  // Cursor MCP executor is intended for “engineering-like” work packets.
  // Exclude shopping-list semantics (retailer send-to already covers that).
  if (k === 'cursor_repo') {
    return ['task', 'checklist', 'plan', 'instructions'];
  }

  // Safe default: treat unknown destinations as compatible with non-shopping activities.
  return ['task', 'checklist', 'plan', 'instructions'];
}

export function formatActivityTypeLabel(t: ActivityType): string {
  if (t === 'task') return 'Task';
  if (t === 'checklist') return 'Checklist';
  if (t === 'shopping_list') return 'Shopping list';
  if (t === 'instructions') return 'Instructions';
  if (t === 'plan') return 'Plan';
  if (typeof t === 'string' && t.startsWith('custom:')) return 'Custom';
  return String(t);
}


