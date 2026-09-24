import { buildCapabilityOnboardingNavigationTarget } from './capabilityOnboardingNavigationTarget';

describe('buildCapabilityOnboardingNavigationTarget', () => {
  it('hands Screen Time to its real permission and rule owner', () => {
    expect(buildCapabilityOnboardingNavigationTarget({ kind: 'screen-time-setup' })).toEqual({
      root: 'Settings', params: { screen: 'SettingsScreenTimeProtection' },
    });
  });
  it('routes Money through the real summary setup entry', () => {
    expect(buildCapabilityOnboardingNavigationTarget({ kind: 'money-app-control' })).toEqual({
      root: 'Money',
      params: {
        screen: 'MoneyEntry',
        params: {
          requestedPlace: 'MoneySummary',
          source: 'capability-onboarding',
          mode: 'automatic',
        },
      },
    });
  });

  it('never injects sample accounts when a real user has no budget', () => {
    expect(buildCapabilityOnboardingNavigationTarget(
      { kind: 'money-app-control' },
      { moneyBudgetState: 'none' },
    )).toEqual({
      root: 'Money',
      params: {
        screen: 'MoneyEntry',
        params: {
          requestedPlace: 'MoneySummary',
          source: 'capability-onboarding',
          mode: 'setup',
        },
      },
    });
  });

  it('routes Chores into its household-aware native owner', () => {
    expect(buildCapabilityOnboardingNavigationTarget({ kind: 'chores-setup' })).toEqual({ root: 'Chores' });
  });

  it('routes Meals into the real recipe library', () => {
    expect(buildCapabilityOnboardingNavigationTarget({ kind: 'food-meal-loop' })).toEqual({
      root: 'Food',
      params: {
        screen: 'RecipeLibrary',
        params: { onboarding: 'pick-meal' },
      },
    });
  });

  it('routes Goals into the capability-specific FTUX entry', () => {
    expect(buildCapabilityOnboardingNavigationTarget({ kind: 'identity-workflow' })).toEqual({
      root: 'FirstTimeUx',
      entryMode: 'capability-path',
    });
  });

  it('opens a fresh Chat thread without injecting content', () => {
    expect(buildCapabilityOnboardingNavigationTarget({ kind: 'unified-chat' })).toEqual({
      root: 'UnifiedChat',
      params: {
        entry: 'fresh',
        source: 'capability-onboarding',
        threadId: null,
      },
    });
  });
});
