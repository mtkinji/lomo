import type {
  OnlineShoppingPreferences,
  RetailerPreferenceId,
} from './onlineShoppingPreferences';
import type {
  OnlineRetailerCapability,
  OnlineRetailerMode,
  RetailerRuntimePolicy,
} from '../providers/groceryProviderContracts';

export type OnlineRetailerOutcome = {
  retailerId: RetailerPreferenceId;
  rank: number;
  capability: OnlineRetailerCapability;
  requestedMode: OnlineRetailerMode;
  reason:
    | 'ready'
    | 'store_required'
    | 'mode_unproved'
    | 'program_approval_required'
    | 'integration_unavailable'
    | 'membership_unconfirmed';
  mayClaimCoverage: boolean;
  mayClaimPrice: boolean;
};

type ResolverInput = {
  preferences: OnlineShoppingPreferences;
  policies: RetailerRuntimePolicy[];
  storeReady: boolean;
  fulfillmentOverride?: OnlineRetailerMode;
};

function selectMode(input: ResolverInput): OnlineRetailerMode {
  if (input.fulfillmentOverride) return input.fulfillmentOverride;
  if (input.preferences.defaultFulfillment !== 'either') {
    return input.preferences.defaultFulfillment;
  }
  const executable = input.policies.filter((policy) =>
    policy.capability === 'cart_prepare'
    && policy.approvedSurface
    && policy.productEvidence
    && policy.cartWrite,
  );
  if (executable.some((policy) => policy.supportedModes.includes('pickup'))) return 'pickup';
  if (executable.some((policy) => policy.supportedModes.includes('delivery'))) return 'delivery';
  return 'pickup';
}

export function resolveOnlineRetailerOutcomes(input: ResolverInput): OnlineRetailerOutcome[] {
  const requestedMode = selectMode(input);
  const policyByRetailer = new Map(input.policies.map((policy) => [policy.retailerId, policy]));

  return input.preferences.retailers
    .filter((retailer) => retailer.enabled)
    .sort((left, right) => left.rank - right.rank)
    .map((retailer): OnlineRetailerOutcome => {
      const policy = policyByRetailer.get(retailer.id);
      const base = {
        retailerId: retailer.id,
        rank: retailer.rank,
        requestedMode,
        mayClaimCoverage: false,
        mayClaimPrice: false,
      };
      if (!policy) {
        return { ...base, capability: 'unavailable', reason: 'integration_unavailable' };
      }
      if (policy.capability === 'remembered_only') {
        return { ...base, capability: 'remembered_only', reason: 'integration_unavailable' };
      }
      if (policy.capability === 'unavailable') {
        return { ...base, capability: 'unavailable', reason: 'integration_unavailable' };
      }
      if (!policy.supportedModes.includes(requestedMode)) {
        return { ...base, capability: 'unavailable', reason: 'mode_unproved' };
      }
      if (policy.capability === 'product_links') {
        if (!policy.approvedSurface || !policy.productEvidence) {
          return {
            ...base,
            capability: 'unavailable',
            reason: 'program_approval_required',
          };
        }
        return { ...base, capability: 'product_links', reason: 'ready' };
      }
      if (!policy.approvedSurface || !policy.productEvidence || !policy.cartWrite) {
        return { ...base, capability: 'unavailable', reason: 'integration_unavailable' };
      }
      if (!input.storeReady) {
        return { ...base, capability: 'cart_prepare', reason: 'store_required' };
      }
      return {
        ...base,
        capability: 'cart_prepare',
        reason: 'ready',
        mayClaimCoverage: true,
        mayClaimPrice: true,
      };
    });
}
