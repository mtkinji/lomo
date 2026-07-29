import type { CapabilityDefinition } from '../types';

export const gamesCapabilityDefinition = {
  id: 'games',
  label: 'Games',
  group: 'fun',
  icon: 'dices',
  availability: 'active',
  rootRoute: { root: 'Games', screen: 'GamesShelf' },
  deepLinks: ['kwilt://games'],
  agent: {
    surfaces: ['inventory'],
    supportsObjectContext: false,
  },
  lifecycle: {},
} as const satisfies CapabilityDefinition;
