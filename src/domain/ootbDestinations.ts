import type { ActivityType } from './types';

export type OotbDestination =
  | {
      kind: 'amazon' | 'home_depot' | 'instacart' | 'doordash';
      displayName: string;
      description: string;
      supportedTypes: ActivityType[];
    }
  | {
      kind: 'cursor_repo';
      displayName: string;
      description: string;
      supportedTypes: ActivityType[];
    };

export const OOTB_DESTINATIONS: OotbDestination[] = [
  {
    kind: 'amazon',
    displayName: 'Amazon',
    description: 'Search Amazon with your shopping list items.',
    supportedTypes: ['shopping_list'],
  },
  {
    kind: 'home_depot',
    displayName: 'Home Depot',
    description: 'Search Home Depot with your shopping list items.',
    supportedTypes: ['shopping_list'],
  },
  {
    kind: 'instacart',
    displayName: 'Instacart',
    description: 'Search Instacart with your shopping list items.',
    supportedTypes: ['shopping_list'],
  },
  {
    kind: 'doordash',
    displayName: 'DoorDash',
    description: 'Search DoorDash with your shopping list items.',
    supportedTypes: ['shopping_list'],
  },
  {
    kind: 'cursor_repo',
    displayName: 'Cursor',
    description: 'Hand off engineering Activities to Cursor via Kwilt MCP.',
    supportedTypes: ['task', 'checklist', 'plan', 'instructions'],
  },
];


