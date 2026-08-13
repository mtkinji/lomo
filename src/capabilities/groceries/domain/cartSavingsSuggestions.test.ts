import { generateCartSavingsSuggestions } from './cartSavingsSuggestions';

const now = '2026-08-13T12:00:00.000Z';

describe('cart savings suggestions', () => {
  it('calculates a selected public promotion across exact retail quantity', () => {
    expect(generateCartSavingsSuggestions([{ id: 'milk-sale', kind: 'selected_promotion', productId: 'milk', regularPriceCents: 499, promoPriceCents: 399, retailQuantity: 2, observedAt: now, expiresAt: '2026-08-14T12:00:00.000Z', coverageItemCount: 1, totalCartItemCount: 3, fulfillmentMode: 'pickup', memberOnly: false, membershipConfirmed: false, includesFees: false }], { now, fulfillmentMode: 'pickup' })).toEqual([expect.objectContaining({ id: 'milk-sale', savingsCents: 200, coverageItemCount: 1, totalCartItemCount: 3, merchandiseOnly: true })]);
  });

  it('allows reviewed alternatives only for equal normalized required units', () => {
    const suggestions = generateCartSavingsSuggestions([{ id: 'alt', kind: 'reviewed_alternative', productId: 'current', alternativeProductId: 'alt', selectedTotalCents: 800, alternativeTotalCents: 650, requiredBaseUnits: 1000, alternativeRequiredBaseUnits: 1000, baseUnit: 'ml', alternativeBaseUnit: 'ml', observedAt: now, expiresAt: null, coverageItemCount: 2, totalCartItemCount: 4, fulfillmentMode: 'pickup', memberOnly: false, membershipConfirmed: null, includesFees: false }], { now, fulfillmentMode: 'pickup' });
    expect(suggestions).toEqual([expect.objectContaining({ savingsCents: 150, decisionChanges: 1 })]);
    expect(generateCartSavingsSuggestions([{ ...suggestionsInput(), requiredBaseUnits: 1000, alternativeRequiredBaseUnits: 900 }], { now, fulfillmentMode: 'pickup' })).toEqual([]);
  });

  it('rejects stale, non-positive, cross-mode, member-unproved, unknown-unit, and fee-inclusive claims', () => {
    const base = suggestionsInput();
    expect(generateCartSavingsSuggestions([
      { ...base, id: 'expired', expiresAt: '2026-08-13T11:00:00.000Z' },
      { ...base, id: 'zero', alternativeTotalCents: 800 },
      { ...base, id: 'mode', fulfillmentMode: 'delivery' },
      { ...base, id: 'member', memberOnly: true, membershipConfirmed: false },
      { ...base, id: 'unit', baseUnit: null, alternativeBaseUnit: null },
      { ...base, id: 'fees', includesFees: true },
    ], { now, fulfillmentMode: 'pickup' })).toEqual([]);
  });

  it('returns at most three by savings, then fewer decisions, then stable ID', () => {
    const base = suggestionsInput();
    const result = generateCartSavingsSuggestions([
      { ...base, id: 'd', selectedTotalCents: 1000, alternativeTotalCents: 800 },
      { ...base, id: 'b', selectedTotalCents: 1000, alternativeTotalCents: 700 },
      { ...base, id: 'a', selectedTotalCents: 1000, alternativeTotalCents: 700 },
      { ...base, id: 'c', selectedTotalCents: 1000, alternativeTotalCents: 900 },
    ], { now, fulfillmentMode: 'pickup' });
    expect(result.map((row) => row.id)).toEqual(['a', 'b', 'd']);
  });
});

function suggestionsInput() {
  return { id: 'alt', kind: 'reviewed_alternative' as const, productId: 'current', alternativeProductId: 'alt', selectedTotalCents: 800, alternativeTotalCents: 650, requiredBaseUnits: 1000, alternativeRequiredBaseUnits: 1000, baseUnit: 'ml' as const, alternativeBaseUnit: 'ml' as const, observedAt: now, expiresAt: null, coverageItemCount: 1, totalCartItemCount: 1, fulfillmentMode: 'pickup' as const, memberOnly: false, membershipConfirmed: null, includesFees: false };
}
