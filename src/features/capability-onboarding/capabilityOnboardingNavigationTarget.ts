import type { CapabilityOnboardingHandoff } from './capabilityOnboardingContracts';

export type CapabilityOnboardingNavigationTarget =
  | {
      root: 'Money';
      params: {
        screen: 'MoneySummary';
        params: {
          entryIntent: 'app-control-onboarding';
          devBudgetState?: 'none';
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
  options: { moneyBudgetState?: 'current' | 'none' } = {},
): CapabilityOnboardingNavigationTarget {
  switch (handoff.kind) {
    case 'money-app-control':
      return {
        root: 'Money',
        params: {
          screen: 'MoneySummary',
          params: {
            entryIntent: 'app-control-onboarding',
            ...(options.moneyBudgetState === 'none' ? { devBudgetState: 'none' as const } : {}),
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
