import type { RetailerPreferenceId } from '../domain/onlineShoppingPreferences';

export type GroceryProviderId = 'instacart' | 'kroger';
export type ProviderCapabilityState = boolean | 'gated';

export type GroceryProviderCapabilities = {
  stores: ProviderCapabilityState;
  productMatch: ProviderCapabilityState;
  quote: ProviderCapabilityState;
  offers: ProviderCapabilityState;
  couponActivation: ProviderCapabilityState;
  cartAdd: ProviderCapabilityState;
  handoff: ProviderCapabilityState;
  orderEvidence: ProviderCapabilityState;
};

export const providerCapabilities: Record<GroceryProviderId, GroceryProviderCapabilities> = {
  instacart: { stores: true, productMatch: 'gated', quote: false, offers: false, couponActivation: false, cartAdd: false, handoff: true, orderEvidence: false },
  kroger: { stores: true, productMatch: true, quote: true, offers: true, couponActivation: false, cartAdd: true, handoff: true, orderEvidence: false },
};

export type ProviderEvidence = {
  provider: GroceryProviderId;
  kind: 'store' | 'match' | 'quote' | 'offer' | 'activation_acknowledgement' | 'cart_acknowledgement' | 'order';
  authority: 'provider_observed' | 'provider_acknowledged' | 'user_reported';
  observedAt: string;
  expiresAt: string | null;
  reference?: string | null;
};

export class GroceryProviderContractError extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'GroceryProviderContractError'; }
}

export type OnlineRetailerCapability =
  | 'cart_prepare'
  | 'product_links'
  | 'remembered_only'
  | 'unavailable';

export type OnlineRetailerMode = 'pickup' | 'delivery';

export type RetailerRuntimePolicy = {
  retailerId: RetailerPreferenceId;
  capability: OnlineRetailerCapability;
  supportedModes: OnlineRetailerMode[];
  approvedSurface: boolean;
  productEvidence: boolean;
  cartWrite: boolean;
};

const RETAILER_IDS: RetailerPreferenceId[] = [
  'amazon',
  'costco',
  'kroger',
  'walmart',
  'other',
];
const ONLINE_CAPABILITIES: OnlineRetailerCapability[] = [
  'cart_prepare',
  'product_links',
  'remembered_only',
  'unavailable',
];

export function parseRetailerRuntimePolicy(value: RetailerRuntimePolicy): RetailerRuntimePolicy {
  const modes = value.supportedModes;
  const modesValid = Array.isArray(modes)
    && modes.every((mode) => mode === 'pickup' || mode === 'delivery')
    && new Set(modes).size === modes.length;
  const basicsValid = RETAILER_IDS.includes(value.retailerId)
    && ONLINE_CAPABILITIES.includes(value.capability)
    && modesValid
    && typeof value.approvedSurface === 'boolean'
    && typeof value.productEvidence === 'boolean'
    && typeof value.cartWrite === 'boolean';
  const capabilityValid = value.capability === 'cart_prepare'
    ? value.approvedSurface && value.productEvidence && value.cartWrite && modes.length > 0
    : value.capability === 'product_links'
      ? value.approvedSurface && value.productEvidence && !value.cartWrite && modes.length > 0
      : !value.cartWrite;

  if (!basicsValid || !capabilityValid) {
    throw new GroceryProviderContractError('provider.runtime_policy_invalid');
  }
  return { ...value, supportedModes: [...modes] };
}

export function parseProviderEvidence(value: ProviderEvidence, now = new Date().toISOString()): ProviderEvidence {
  if (!providerCapabilities[value.provider] || !Number.isFinite(Date.parse(value.observedAt)) || (value.expiresAt !== null && !Number.isFinite(Date.parse(value.expiresAt)))) {
    throw new GroceryProviderContractError('provider.evidence_invalid');
  }
  if (value.expiresAt && Date.parse(value.expiresAt) <= Date.parse(now)) throw new GroceryProviderContractError('provider.evidence_expired');
  return { ...value };
}

export function decideProviderAction(input: { kind: 'handoff' | 'cart_add' | 'order'; acknowledged: boolean; ambiguous: boolean }): { state: 'ready_for_retailer_review' | 'check_retailer_cart' | 'provider_acknowledged' | 'failed'; ordered: boolean } {
  if (input.ambiguous && input.kind === 'cart_add') return { state: 'check_retailer_cart', ordered: false };
  if (!input.acknowledged) return { state: 'failed', ordered: false };
  if (input.kind === 'order') return { state: 'provider_acknowledged', ordered: true };
  return { state: input.kind === 'handoff' ? 'ready_for_retailer_review' : 'provider_acknowledged', ordered: false };
}
