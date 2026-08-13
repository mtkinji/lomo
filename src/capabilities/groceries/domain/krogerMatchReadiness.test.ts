import type { KrogerProduct } from '../providers/krogerProvider';
import { classifyKrogerMatchReadiness } from './krogerMatchReadiness';

const milk: KrogerProduct = { id: 'milk', upc: '001', title: 'Simple Truth Unsweetened Almond Milk', brand: 'Simple Truth', size: '64 fl oz', regularPriceCents: 399, promoPriceCents: null, pickupAvailable: true, deliveryAvailable: false };
const input = { concept: 'unsweetened almond milk', products: [milk], provider: 'kroger' as const, locationId: 'store-1', fulfillmentMode: 'pickup' as const, quantityKnown: true, packageKnown: true };

describe('Kroger match readiness', () => {
  it('reuses remembered evidence only for the same concept, provider, location, and available product', () => {
    expect(classifyKrogerMatchReadiness({ ...input, remembered: { provider: 'kroger', locationId: 'store-1', concept: input.concept, productId: milk.id } })).toEqual({ state: 'ready', productId: milk.id, reason: 'remembered_exact' });
    expect(classifyKrogerMatchReadiness({ ...input, remembered: { provider: 'kroger', locationId: 'store-2', concept: input.concept, productId: milk.id } })).toEqual({ state: 'ready', productId: milk.id, reason: 'strong_concept_match' });
  });

  it('requires every meaningful concept token and rejects ambiguity', () => {
    expect(classifyKrogerMatchReadiness(input)).toEqual({ state: 'ready', productId: milk.id, reason: 'strong_concept_match' });
    expect(classifyKrogerMatchReadiness({ ...input, products: [milk, { ...milk, id: 'milk-2', upc: '002' }] })).toEqual({ state: 'review', reason: 'ambiguous_identity' });
    expect(classifyKrogerMatchReadiness({ ...input, products: [{ ...milk, title: 'Almond Beverage' }] })).toEqual({ state: 'review', reason: 'ambiguous_identity' });
  });

  it('keeps protected, unknown-quantity, unknown-package, missing, and unavailable lines out of Ready', () => {
    expect(classifyKrogerMatchReadiness({ ...input, concept: 'baby formula' })).toEqual({ state: 'review', reason: 'protected_product' });
    expect(classifyKrogerMatchReadiness({ ...input, quantityKnown: false })).toEqual({ state: 'review', reason: 'quantity_unknown' });
    expect(classifyKrogerMatchReadiness({ ...input, packageKnown: false })).toEqual({ state: 'review', reason: 'package_unknown' });
    expect(classifyKrogerMatchReadiness({ ...input, products: [] })).toEqual({ state: 'unmatched', reason: 'not_found' });
    expect(classifyKrogerMatchReadiness({ ...input, fulfillmentMode: 'delivery' })).toEqual({ state: 'unmatched', reason: 'mode_unavailable' });
  });
});
