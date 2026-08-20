import { buildCapabilityOnboardingNavigationTarget } from './capabilityOnboardingNavigationTarget';

describe('buildCapabilityOnboardingNavigationTarget', () => {
  it('routes Money through the real summary setup entry', () => {
    expect(buildCapabilityOnboardingNavigationTarget({ kind: 'money-app-control' })).toEqual({
      root: 'Money',
      params: {
        screen: 'MoneySummary',
        params: { entryIntent: 'app-control-onboarding' },
      },
    });
  });

  it('can rehearse the Money handoff without existing budgets', () => {
    expect(buildCapabilityOnboardingNavigationTarget(
      { kind: 'money-app-control' },
      { moneyBudgetState: 'none' },
    )).toEqual({
      root: 'Money',
      params: {
        screen: 'MoneySummary',
        params: {
          entryIntent: 'app-control-onboarding',
          devBudgetState: 'none',
        },
      },
    });
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
