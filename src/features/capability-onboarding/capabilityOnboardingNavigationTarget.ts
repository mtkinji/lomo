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
  | { root: 'Chores' }
  | { root: 'Settings'; params: { screen: 'SettingsScreenTimeProtection' } }
  | { root: 'Settings'; params: { screen: 'SettingsHousehold' } }
  | { root: 'Settings'; params: { screen: 'SettingsScreenTimeRuleBuilder'; params: { entry: 'contextual'; authorizationMember: 'child'; suggestedKind: 'daily_limit' } } }
  | { root: 'Settings'; params: { screen: 'SettingsScreenTimeRuleBuilder'; params: { entry: 'contextual'; suggestedKind: 'daily_limit' | 'focus' | 'real_step' } } }
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
    case 'chores-setup':
      return { root: 'Chores' };
    case 'screen-time-setup':
      if (handoff.suggestedKind) return {
        root: 'Settings', params: { screen: 'SettingsScreenTimeRuleBuilder', params: { entry: 'contextual', suggestedKind: handoff.suggestedKind } },
      };
      return { root: 'Settings', params: { screen: 'SettingsScreenTimeProtection' } };
    case 'screen-time-family':
      return handoff.device === 'child'
        ? { root: 'Settings', params: { screen: 'SettingsScreenTimeRuleBuilder', params: { entry: 'contextual', authorizationMember: 'child', suggestedKind: 'daily_limit' } } }
        : { root: 'Settings', params: { screen: 'SettingsHousehold' } };
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
