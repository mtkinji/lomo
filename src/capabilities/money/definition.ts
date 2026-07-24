import type { CapabilityDefinition } from '../types';

export const moneyCapabilityDefinition = {
  id: 'money',
  label: 'Money',
  group: 'money',
  icon: 'cart',
  availability: 'active',
  rootRoute: { root: 'Money', screen: 'MoneySummary' },
  deepLinks: [
    'kwilt://money',
    'kwilt://money/transactions',
    'kwilt://money/accounts',
  ],
  agent: {
    surfaces: ['inventory', 'detail'],
    supportsObjectContext: true,
  },
  lifecycle: {},
} as const satisfies CapabilityDefinition;
