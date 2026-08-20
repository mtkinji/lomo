import {
  getMoneyCategoryDestination,
  isMoneyAppControlOnboardingComplete,
} from './moneyAppControlOnboarding';

describe('Money app-control onboarding entry', () => {
  it('keeps ordinary category taps in category detail', () => {
    expect(getMoneyCategoryDestination({
      categoryId: 'shopping',
      monthOffset: 0,
    })).toEqual({
      screen: 'MoneyCategoryDetail',
      params: { categoryId: 'shopping', monthOffset: 0 },
    });
  });

  it('opens the chosen current budget in real App Controls during onboarding', () => {
    expect(getMoneyCategoryDestination({
      categoryId: 'shopping',
      monthOffset: 0,
      entryIntent: 'app-control-onboarding',
    })).toEqual({
      screen: 'MoneyAppControl',
      params: { categoryId: 'shopping', source: 'capability-onboarding' },
    });
  });

  it('does not apply a current-budget onboarding intent to history', () => {
    expect(getMoneyCategoryDestination({
      categoryId: 'shopping',
      monthOffset: -1,
      entryIntent: 'app-control-onboarding',
    })).toEqual({
      screen: 'MoneyCategoryDetail',
      params: { categoryId: 'shopping', monthOffset: -1 },
    });
  });

  it('requires approved access, an enabled policy, and at least one opaque target', () => {
    const policy = {
      enabled: true,
      preset: 'when_over' as const,
      unlockWindowMinutes: 20,
      selectedApps: [{ token: 'opaque-app' }],
      selectedCategories: [],
      lastReview: null,
    };
    expect(isMoneyAppControlOnboardingComplete('approved', policy)).toBe(true);
    expect(isMoneyAppControlOnboardingComplete('denied', policy)).toBe(false);
    expect(isMoneyAppControlOnboardingComplete('approved', { ...policy, enabled: false })).toBe(false);
    expect(isMoneyAppControlOnboardingComplete('approved', {
      ...policy,
      selectedApps: [],
    })).toBe(false);
  });
});
