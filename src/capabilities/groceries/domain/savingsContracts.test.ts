import { parseSavingsEvidence, savingsActionLabel } from './savingsContracts';

describe('savings evidence', () => {
  const now = '2026-08-05T12:00:00.000Z';
  it('keeps observed, eligible, activated, redeemed, and expired distinct', () => {
    expect(parseSavingsEvidence({ id: 'o', kind: 'coupon', state: 'eligible', provider: 'kroger', productId: 'p', amountCents: 100, memberRequired: true, activationRequired: true, observedAt: now, expiresAt: '2026-08-06T12:00:00.000Z' }, now).state).toBe('eligible');
    expect(savingsActionLabel({ kind: 'coupon', state: 'eligible', activationRequired: true })).toBe('Activate in retailer app');
    expect(savingsActionLabel({ kind: 'coupon', state: 'activated', activationRequired: true })).toBe('Use this');
    expect(savingsActionLabel({ kind: 'public_promotion', state: 'observed', activationRequired: false })).toBe('Use this');
  });

  it('expires stale evidence and rejects impossible money', () => {
    expect(parseSavingsEvidence({ id: 'o', kind: 'coupon', state: 'eligible', provider: 'kroger', productId: 'p', amountCents: 100, memberRequired: false, activationRequired: true, observedAt: '2026-08-01T12:00:00.000Z', expiresAt: '2026-08-05T11:00:00.000Z' }, now).state).toBe('expired');
    expect(() => parseSavingsEvidence({ id: 'o', kind: 'rebate', state: 'observed', provider: null, productId: 'p', amountCents: -1, memberRequired: false, activationRequired: false, observedAt: now, expiresAt: null }, now)).toThrow('savings.money_invalid');
  });
});
