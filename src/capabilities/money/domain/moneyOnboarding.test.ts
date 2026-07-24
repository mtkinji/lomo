import {
  buildMoneyOnboardingTarget,
  getMoneyOnboardingCompletionDecision,
  shouldOfferMoneyOnboarding,
} from './moneyOnboarding';

describe('Money onboarding', () => {
  it('offers setup only when durable and local completion evidence are absent', () => {
    expect(shouldOfferMoneyOnboarding({
      localCompletedAt: null,
      hasLivingTarget: false,
      hasActiveLivingPlan: false,
      hasLinkedAccount: false,
    })).toBe(true);
    expect(shouldOfferMoneyOnboarding({
      localCompletedAt: '2026-07-24T12:00:00.000Z',
      hasLivingTarget: false,
      hasActiveLivingPlan: false,
      hasLinkedAccount: false,
    })).toBe(false);
    expect(shouldOfferMoneyOnboarding({
      localCompletedAt: null,
      hasLivingTarget: false,
      hasActiveLivingPlan: true,
      hasLinkedAccount: false,
    })).toBe(false);
    expect(shouldOfferMoneyOnboarding({
      localCompletedAt: null,
      hasLivingTarget: true,
      hasActiveLivingPlan: false,
      hasLinkedAccount: true,
    })).toBe(false);
  });

  it('clamps and rounds the living target to supported five-point steps', () => {
    expect(buildMoneyOnboardingTarget(68, '2026-07-24T12:00:00.000Z')).toEqual({
      livingPercent: 70,
      provenance: 'onboarding',
      updatedAtIso: '2026-07-24T12:00:00.000Z',
    });
    expect(buildMoneyOnboardingTarget(20, 'now').livingPercent).toBe(50);
    expect(buildMoneyOnboardingTarget(120, 'now').livingPercent).toBe(100);
  });

  it('only completes after a usable living plan exists', () => {
    expect(getMoneyOnboardingCompletionDecision({ outcome: 'promoted' }, false)).toEqual({ complete: true });
    expect(getMoneyOnboardingCompletionDecision({ outcome: 'no_op' }, false)).toEqual({ complete: true });
    expect(getMoneyOnboardingCompletionDecision({ outcome: 'not_ready', hasUsablePlan: true }, true)).toEqual({ complete: true });
    expect(getMoneyOnboardingCompletionDecision({ outcome: 'blocked', reason: 'sync_stale' }, false)).toEqual({
      complete: false,
      message: 'Refresh your connected account, then build your plan again.',
    });
    expect(getMoneyOnboardingCompletionDecision({ outcome: 'not_ready' }, true).complete).toBe(false);
  });
});
