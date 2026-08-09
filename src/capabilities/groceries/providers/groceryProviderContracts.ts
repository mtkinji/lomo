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
