import type { CapabilityOnboardingHandoff } from './capabilityOnboardingContracts';

export type CapabilityOnboardingNavigationTarget =
  | {
      root: 'Money';
      params: {
        screen: 'MoneyEntry';
        params: {
          requestedPlace: 'MoneySummary';
          source: 'capability-onboarding';
          mode: 'automatic' | 'setup';
          demoScenario?: 'connected-household';
        };
      };
    }
  | {
      root: 'Food';
      params: {
        screen: 'RecipeLibrary';
        params: { onboarding: 'pick-meal' };
      };
    }
  | {
      root: 'UnifiedChat';
      params: {
        entry: 'fresh';
        source: 'capability-onboarding';
        threadId: null;
      };
    }
  | { root: 'FirstTimeUx'; entryMode: 'capability-path' }
  | null;

export function buildCapabilityOnboardingNavigationTarget(
  handoff: CapabilityOnboardingHandoff,
  _options: { moneyBudgetState?: 'current' | 'none' } = {},
): CapabilityOnboardingNavigationTarget {
  switch (handoff.kind) {
    case 'money-app-control':
      return {
        root: 'Money',
        params: {
          screen: 'MoneyEntry',
          params: {
            requestedPlace: 'MoneySummary',
            source: 'capability-onboarding',
            mode: _options.moneyBudgetState === 'none' ? 'setup' : 'automatic',
            ...(_options.moneyBudgetState === 'none' ? { demoScenario: 'connected-household' as const } : {}),
          },
        },
      };
    case 'food-meal-loop':
      return {
        root: 'Food',
        params: {
          screen: 'RecipeLibrary',
          params: { onboarding: 'pick-meal' },
        },
      };
    case 'identity-workflow':
      return { root: 'FirstTimeUx', entryMode: 'capability-path' };
    case 'unified-chat':
      return {
        root: 'UnifiedChat',
        params: {
          entry: 'fresh',
          source: 'capability-onboarding',
          threadId: null,
        },
      };
    default:
      return null;
  }
}
