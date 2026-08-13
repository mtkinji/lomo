import type { OnlineShoppingPreferences } from './onlineShoppingPreferences';
import { resolveOnlineRetailerOutcomes } from './onlineRetailerResolver';
import type { RetailerRuntimePolicy } from '../providers/groceryProviderContracts';

const preferences: OnlineShoppingPreferences = {
  schemaVersion: 1,
  defaultFulfillment: 'pickup',
  homePostalCode: null,
  savedAt: '2026-08-13T16:00:00.000Z',
  retailers: [
    { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: true },
    { id: 'kroger', enabled: true, rank: 2, label: "Smith's", membershipConfirmed: null },
    { id: 'costco', enabled: true, rank: 3, label: 'Costco', membershipConfirmed: true },
    { id: 'walmart', enabled: true, rank: 4, label: 'Walmart', membershipConfirmed: null },
  ],
};

const policies: RetailerRuntimePolicy[] = [
  { retailerId: 'amazon', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: false, productEvidence: false, cartWrite: false },
  { retailerId: 'kroger', capability: 'cart_prepare', supportedModes: ['pickup'], approvedSurface: true, productEvidence: true, cartWrite: true },
  { retailerId: 'costco', capability: 'remembered_only', supportedModes: [], approvedSurface: false, productEvidence: false, cartWrite: false },
  { retailerId: 'walmart', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: false, productEvidence: false, cartWrite: false },
];

describe('online retailer resolver', () => {
  it('preserves preference order and filters capability through current evidence', () => {
    expect(resolveOnlineRetailerOutcomes({ preferences, policies, storeReady: true })).toEqual([
      { retailerId: 'amazon', rank: 1, capability: 'unavailable', requestedMode: 'pickup', reason: 'program_approval_required', mayClaimCoverage: false, mayClaimPrice: false },
      { retailerId: 'kroger', rank: 2, capability: 'cart_prepare', requestedMode: 'pickup', reason: 'ready', mayClaimCoverage: true, mayClaimPrice: true },
      { retailerId: 'costco', rank: 3, capability: 'remembered_only', requestedMode: 'pickup', reason: 'integration_unavailable', mayClaimCoverage: false, mayClaimPrice: false },
      { retailerId: 'walmart', rank: 4, capability: 'unavailable', requestedMode: 'pickup', reason: 'program_approval_required', mayClaimCoverage: false, mayClaimPrice: false },
    ]);
  });

  it('requires a store before a cart-capable Kroger pickup can be ready', () => {
    expect(resolveOnlineRetailerOutcomes({ preferences, policies, storeReady: false })[1]).toMatchObject({
      capability: 'cart_prepare',
      requestedMode: 'pickup',
      reason: 'store_required',
      mayClaimCoverage: false,
      mayClaimPrice: false,
    });
  });

  it('keeps Kroger delivery unavailable until that mode is proved', () => {
    expect(resolveOnlineRetailerOutcomes({
      preferences: { ...preferences, defaultFulfillment: 'delivery' },
      policies,
      storeReady: true,
    })[1]).toMatchObject({
      capability: 'unavailable',
      requestedMode: 'delivery',
      reason: 'mode_unproved',
    });
  });

  it('expands Either to a proved executable mode without mutating preferences', () => {
    const eitherPreferences = { ...preferences, defaultFulfillment: 'either' as const };
    const outcomes = resolveOnlineRetailerOutcomes({
      preferences: eitherPreferences,
      policies,
      storeReady: true,
    });

    expect(outcomes[1]).toMatchObject({ requestedMode: 'pickup', capability: 'cart_prepare' });
    expect(eitherPreferences.defaultFulfillment).toBe('either');
  });

  it('allows approved product links but never cart coverage or price claims', () => {
    const approvedPolicies = policies.map((policy) => policy.retailerId === 'amazon'
      ? { ...policy, approvedSurface: true, productEvidence: true }
      : policy);

    expect(resolveOnlineRetailerOutcomes({
      preferences,
      policies: approvedPolicies,
      storeReady: true,
    })[0]).toEqual({
      retailerId: 'amazon',
      rank: 1,
      capability: 'product_links',
      requestedMode: 'pickup',
      reason: 'ready',
      mayClaimCoverage: false,
      mayClaimPrice: false,
    });
  });
});
