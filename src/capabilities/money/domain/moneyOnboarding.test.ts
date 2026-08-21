import {
  buildMoneyOnboardingTarget,
  getMoneyEntryDecision,
  getMoneyOnboardingCompletionDecision,
  getMoneyOnboardingInitialStep,
  getMoneyTransactionsAvailability,
  mergeMoneyTransactionsAvailability,
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

  it('preserves the requested Money place across first entry, dismissal, and completion', () => {
    const evidence = {
      localCompletedAt: null,
      hasLivingTarget: false,
      hasActiveLivingPlan: false,
      hasLinkedAccount: false,
    };

    expect(getMoneyEntryDecision({
      evidence,
      introductionSeenAt: null,
      requestedPlace: 'MoneyAccounts',
      mode: 'automatic',
    })).toEqual({ kind: 'introduce', requestedPlace: 'MoneyAccounts' });

    expect(getMoneyEntryDecision({
      evidence,
      introductionSeenAt: '2026-08-20T12:00:00.000Z',
      requestedPlace: 'MoneyTransactions',
      mode: 'automatic',
    })).toEqual({ kind: 'destination', requestedPlace: 'MoneyTransactions' });

    expect(getMoneyEntryDecision({
      evidence: { ...evidence, hasLinkedAccount: true, hasLivingTarget: true },
      introductionSeenAt: null,
      requestedPlace: 'MoneySummary',
      mode: 'automatic',
    })).toEqual({ kind: 'destination', requestedPlace: 'MoneySummary' });
  });

  it('allows an explicit setup action after the introduction was dismissed', () => {
    expect(getMoneyEntryDecision({
      evidence: {
        localCompletedAt: null,
        hasLivingTarget: false,
        hasActiveLivingPlan: false,
        hasLinkedAccount: false,
      },
      introductionSeenAt: '2026-08-20T12:00:00.000Z',
      requestedPlace: 'MoneySummary',
      mode: 'setup',
    })).toEqual({ kind: 'introduce', requestedPlace: 'MoneySummary' });
  });

  it('uses one illustrated introduction across Money entry sources without repeating it', () => {
    expect(getMoneyOnboardingInitialStep('capability-menu', null)).toBe('welcome');
    expect(getMoneyOnboardingInitialStep('direct', null)).toBe('welcome');
    expect(getMoneyOnboardingInitialStep('capability-onboarding', null)).toBe('account');
    expect(getMoneyOnboardingInitialStep('empty-state', null)).toBe('account');
    expect(getMoneyOnboardingInitialStep('capability-menu', 'account')).toBe('account');
    expect(getMoneyOnboardingInitialStep('capability-menu', 'intent')).toBe('intent');
    expect(getMoneyOnboardingInitialStep('capability-menu', 'target')).toBe('target');
  });

  it('hides Transactions only for authoritative pristine evidence', () => {
    expect(getMoneyTransactionsAvailability(null)).toBe('unknown');
    expect(getMoneyTransactionsAvailability({ accountCount: 0, transactionCount: 0 })).toBe('pristine');
    expect(getMoneyTransactionsAvailability({ accountCount: 1, transactionCount: 0 })).toBe('available');
    expect(getMoneyTransactionsAvailability({ accountCount: 0, transactionCount: 1 })).toBe('available');
  });

  it('keeps durable Transactions availability through empty or unknown refreshes', () => {
    expect(mergeMoneyTransactionsAvailability('unknown', 'pristine')).toBe('pristine');
    expect(mergeMoneyTransactionsAvailability('pristine', 'available')).toBe('available');
    expect(mergeMoneyTransactionsAvailability('available', 'pristine')).toBe('available');
    expect(mergeMoneyTransactionsAvailability('available', 'unknown')).toBe('available');
  });
});
