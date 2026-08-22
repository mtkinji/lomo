import {
  buildTransactionPlanCoverage,
  projectTransactionCoverageImpact,
  usesOnlySavedMoney,
} from './transactionPlanCoverage';

describe('transaction plan coverage', () => {
  it('derives exact month-plan and saved-money portions for a posted outflow', () => {
    expect(buildTransactionPlanCoverage({
      amountCents: 311600,
      savedResourceCents: 200000,
      direction: 'outflow',
      pending: false,
      moneyMeaning: null,
      reviewState: 'assigned',
    })).toEqual({ monthlyPlanCents: 111600, savedResourceCents: 200000 });
  });

  it.each([
    ['pending outflow', { direction: 'outflow' as const, pending: true, moneyMeaning: null, reviewState: 'assigned' as const }],
    ['inflow', { direction: 'inflow' as const, pending: false, moneyMeaning: null, reviewState: 'assigned' as const }],
    ['transfer', { direction: 'outflow' as const, pending: false, moneyMeaning: 'transfer' as const, reviewState: 'assigned' as const }],
    ['outside-plan activity', { direction: 'outflow' as const, pending: false, moneyMeaning: 'not_counted' as const, reviewState: 'not_counted' as const }],
  ])('rejects coverage for a %s', (_label, transaction) => {
    expect(() => buildTransactionPlanCoverage({ amountCents: 10000, savedResourceCents: 5000, ...transaction }))
      .toThrow('Only posted household spending can be covered by saved money.');
  });

  it('rejects a saved-money portion above the canonical transaction amount', () => {
    expect(() => buildTransactionPlanCoverage({
      amountCents: 10000,
      savedResourceCents: 10001,
      direction: 'outflow',
      pending: false,
      moneyMeaning: null,
      reviewState: 'assigned',
    })).toThrow('Saved money cannot exceed the purchase amount.');
  });

  it('previews the exact flexible result without changing the transaction amount', () => {
    expect(projectTransactionCoverageImpact({
      flexibleRoomCents: -248000,
      currentSavedResourceCents: 0,
      nextSavedResourceCents: 200000,
      transactionAmountCents: 311600,
    })).toEqual({
      currentFlexibleRoomCents: -248000,
      nextFlexibleRoomCents: -48000,
      transactionAmountCents: 311600,
      savedResourceDeltaCents: 200000,
    });
  });

  it('identifies only a fully saved-money-covered posted outflow', () => {
    const transaction = {
      amountCents: 311600,
      direction: 'outflow' as const,
      pending: false,
      moneyMeaning: null,
      reviewState: 'assigned' as const,
    };

    expect(usesOnlySavedMoney({ ...transaction, savedResourceCents: 311600 })).toBe(true);
    expect(usesOnlySavedMoney({ ...transaction, savedResourceCents: 200000 })).toBe(false);
  });
});
