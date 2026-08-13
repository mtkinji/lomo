import type { KrogerFulfillmentMode, KrogerProduct } from '../providers/krogerProvider';
import { productStronglyMatchesConcept } from './krogerProductMatching';

export const PROTECTED_GROCERY_CONCEPTS = [/baby formula/i, /infant formula/i, /medicine/i, /medication/i];

export type KrogerMatchReadiness =
  | { state: 'ready'; productId: string; reason: 'remembered_exact' | 'strong_concept_match' }
  | { state: 'review'; reason: 'ambiguous_identity' | 'protected_product' | 'package_unknown' | 'quantity_unknown' }
  | { state: 'unmatched'; reason: 'not_found' | 'mode_unavailable' };

type RememberedMatch = { provider: string; locationId: string; concept: string; productId: string };

export function classifyKrogerMatchReadiness(input: {
  concept: string;
  products: KrogerProduct[];
  provider: 'kroger';
  locationId: string;
  fulfillmentMode: KrogerFulfillmentMode;
  remembered?: RememberedMatch | null;
  quantityKnown: boolean;
  packageKnown: boolean;
}): KrogerMatchReadiness {
  if (!input.products.length) return { state: 'unmatched', reason: 'not_found' };
  const available = input.products.filter((product) => input.fulfillmentMode === 'pickup' ? product.pickupAvailable : product.deliveryAvailable === true);
  if (!available.length) return { state: 'unmatched', reason: 'mode_unavailable' };
  if (PROTECTED_GROCERY_CONCEPTS.some((pattern) => pattern.test(input.concept))) return { state: 'review', reason: 'protected_product' };
  if (!input.quantityKnown) return { state: 'review', reason: 'quantity_unknown' };
  if (!input.packageKnown) return { state: 'review', reason: 'package_unknown' };
  const rememberedProduct = available.find((product) =>
    input.remembered?.provider === input.provider
    && input.remembered.locationId === input.locationId
    && input.remembered.concept.trim().toLowerCase() === input.concept.trim().toLowerCase()
    && (input.remembered.productId === product.id || input.remembered.productId === product.upc),
  );
  if (rememberedProduct) return { state: 'ready', productId: rememberedProduct.id, reason: 'remembered_exact' };
  const strong = available.filter((product) => productStronglyMatchesConcept(input.concept, product));
  return strong.length === 1
    ? { state: 'ready', productId: strong[0].id, reason: 'strong_concept_match' }
    : { state: 'review', reason: 'ambiguous_identity' };
}
