import {
  decideProviderAction,
  parseProviderEvidence,
  providerCapabilities,
} from './groceryProviderContracts';

describe('grocery provider contracts', () => {
  it('keeps discovery, quote, coupon activation, cart, and order authority distinct', () => {
    expect(providerCapabilities.instacart).toEqual(expect.objectContaining({ handoff: true, couponActivation: false, orderEvidence: false }));
    expect(providerCapabilities.kroger).toEqual(expect.objectContaining({ cartAdd: 'gated', couponActivation: false, orderEvidence: false }));
  });

  it('does not call an ambiguous cart write ordered', () => {
    expect(decideProviderAction({ kind: 'cart_add', acknowledged: false, ambiguous: true })).toEqual({ state: 'check_retailer_cart', ordered: false });
    expect(decideProviderAction({ kind: 'handoff', acknowledged: true, ambiguous: false })).toEqual({ state: 'ready_for_retailer_review', ordered: false });
  });

  it('rejects expired or malformed evidence', () => {
    expect(() => parseProviderEvidence({ provider: 'instacart', kind: 'quote', observedAt: 'bad', expiresAt: 'bad', authority: 'provider_observed' }, '2026-08-05T12:00:00.000Z')).toThrow('provider.evidence_invalid');
    expect(() => parseProviderEvidence({ provider: 'instacart', kind: 'quote', observedAt: '2026-08-04T12:00:00.000Z', expiresAt: '2026-08-05T11:00:00.000Z', authority: 'provider_observed' }, '2026-08-05T12:00:00.000Z')).toThrow('provider.evidence_expired');
  });
});
