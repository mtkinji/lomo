import type { CapabilityDefinition } from '../types';

export const exploreCapabilityDefinition = {
  id: 'explore',
  label: 'Explore',
  group: 'play',
  icon: 'map',
  availability: 'active',
  rootRoute: { root: 'Explore', screen: 'ExploreMap' },
  deepLinks: ['kwilt://explore'],
  settings: [{ id: 'explore', label: 'Explore', route: 'SettingsExplore' }],
  permissions: ['location'],
  agent: {
    surfaces: ['inventory'],
    supportsObjectContext: false,
  },
  lifecycle: {},
} as const satisfies CapabilityDefinition;
