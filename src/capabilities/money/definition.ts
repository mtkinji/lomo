import type { CapabilityDefinition } from '../types';
import { moneyLifecycle } from './runtime/moneyLifecycle';

export const moneyCapabilityDefinition = {
  id: 'money',
  label: 'Money',
  group: 'money',
  icon: 'cart',
  availability: 'preview',
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
  lifecycle: {
    activate: () => moneyLifecycle.activate(),
    deactivate: () => moneyLifecycle.deactivate(),
  },
} as const satisfies CapabilityDefinition;
