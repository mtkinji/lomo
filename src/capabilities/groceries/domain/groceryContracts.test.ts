import {
  calculateBasketTotal,
  calculateRealizedSavings,
  compileGroceryItems,
  evaluateOfferQualification,
  parseGroceryList,
  requireGroceryListVersion,
  type GroceryList,
  type ReceiptEvidence,
  type RetailerHandoff,
  type SavingsOutcome,
  type SavingsPlan,
} from './groceryContracts';

const list: GroceryList = {
  id: 'grocery-list-1',
  ownerPersonId: 'person-owner',
  version: 1,
  mealPlanId: 'plan-next-shop',
  mealPlanVersion: 2,
  status: 'review',
  compilation: {
    idempotencyKey: 'compile:plan-next-shop:v2',
    contentHash: 'sha256:compiled-plan-v2',
  },
  items: [],
  createdAt: '2026-08-05T12:30:00.000Z',
  updatedAt: '2026-08-05T12:30:00.000Z',
};

describe('Grocery contracts', () => {
  test('compiles compatible quantities deterministically and preserves every source', () => {
    const items = compileGroceryItems([
      { concept: 'flour', displayText: '1 1/2 cups flour', quantity: 1.5, unit: 'cup', source: { kind: 'recipe_ingredient', recipeVersionId: 'rv-1', ingredientLineId: 'line-1', planEntryId: 'entry-1' } },
      { concept: 'flour', displayText: '1/2 cup flour', quantity: 0.5, unit: 'cup', source: { kind: 'recipe_ingredient', recipeVersionId: 'rv-2', ingredientLineId: 'line-8', planEntryId: 'entry-2' } },
      { concept: 'flour', displayText: 'Flour for dusting', quantity: null, unit: null, source: { kind: 'manual', noteId: 'note-1' } },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ concept: 'flour', quantity: 2, unit: 'cup' });
    expect(items[0].sources).toHaveLength(2);
    expect(items[1]).toMatchObject({ quantity: null, originalDisplayTexts: ['Flour for dusting'] });
  });

  test('keeps product, quote, offer, plan, handoff, and receipt evidence separate', () => {
    const parsed = parseGroceryList({
      ...list,
      items: compileGroceryItems([{ concept: 'egg', displayText: '2 eggs', quantity: 2, unit: 'count', source: { kind: 'manual', noteId: 'note-eggs' } }]),
    });

    expect(parsed.items[0]).not.toHaveProperty('retailerProductId');
    expect(parsed.items[0]).not.toHaveProperty('priceCents');
    expect(parsed).not.toHaveProperty('savingsPlan');

    const savingsPlan: SavingsPlan = {
      id: 'savings-1', groceryListId: parsed.id, groceryListVersion: parsed.version, version: 1,
      provider: 'provider-1', locationId: 'store-1', selectedProductMappingIds: ['mapping-1'],
      selectedOfferIds: ['offer-1'], predictedSubtotalCents: 1200, predictedSavingsCents: 200,
      evidenceObservedAt: '2026-08-05T12:00:00.000Z', acceptedByPersonId: 'person-owner', acceptedAt: '2026-08-05T12:05:00.000Z',
    };
    const handoff: RetailerHandoff = {
      id: 'handoff-1', savingsPlanId: savingsPlan.id, provider: savingsPlan.provider,
      idempotencyKey: 'handoff:savings-1', payloadHash: 'sha256:handoff-payload', state: 'prepared', preparedItemCount: 1,
      providerReference: null, providerAcknowledgedAt: null, openedAt: null, expiresAt: null,
    };
    const receipt: ReceiptEvidence = {
      id: 'receipt-1', ownerPersonId: 'person-owner', provider: null, authority: 'user_supplied',
      observedAt: '2026-08-05T13:00:00.000Z', sourceArtifactId: 'artifact-1', providerReceiptId: null,
      reviewed: true, lineCount: 1, paidTotalCents: 1000,
    };
    const outcome: SavingsOutcome = {
      id: 'outcome-1', savingsPlanId: savingsPlan.id, receiptEvidenceId: receipt.id,
      baselineCents: 1200, paidCents: 1000, realizedSavingsCents: 200,
      itemized: [{ groceryItemId: 'item-1', receiptLineRef: 'line-1', baselineCents: 1200, paidCents: 1000, realizedSavingsCents: 200 }],
      calculatedAt: '2026-08-05T13:05:00.000Z',
    };
    expect(handoff).not.toHaveProperty('paidTotalCents');
    expect(receipt).not.toHaveProperty('predictedSavingsCents');
    expect(outcome.receiptEvidenceId).toBe(receipt.id);
  });

  test('pins compilation to one plan version and rejects conflicting replays', () => {
    expect(parseGroceryList(list)).toMatchObject({
      mealPlanId: 'plan-next-shop',
      mealPlanVersion: 2,
      compilation: { idempotencyKey: 'compile:plan-next-shop:v2', contentHash: 'sha256:compiled-plan-v2' },
    });
    expect(() => parseGroceryList({
      ...list,
      compilation: { ...list.compilation, contentHash: '' },
    })).toThrow(expect.objectContaining({ code: 'grocery.compilation_invalid' }));
  });

  test('exposes recovery choices for a stale list version', () => {
    expect(() => requireGroceryListVersion(list, 2)).toThrow(expect.objectContaining({
      code: 'grocery.version_conflict',
      recoveryChoices: ['review_current_list', 'rebuild_from_current_plan'],
    }));
  });

  test('calculates unit/basket economics with deterministic integer arithmetic', () => {
    const total = calculateBasketTotal([
      { productId: 'milk', quantity: 2, priceCents: 349, packageBaseUnits: 1 },
      { productId: 'eggs', quantity: 1, priceCents: 429, packageBaseUnits: 12 },
    ]);

    expect(total.subtotalCents).toBe(1127);
    expect(total.lines[1].unitPriceCents).toBe(35.75);
  });

  test('evaluates offer qualification without claiming activation or redemption', () => {
    const qualification = evaluateOfferQualification({
      offer: { id: 'offer-eggs', minQuantity: 2, memberRequired: true, state: 'observed', expiresAt: '2026-08-10T00:00:00.000Z' },
      basketQuantity: 2,
      hasMembership: true,
      now: '2026-08-05T12:00:00.000Z',
    });

    expect(qualification).toEqual({ qualifies: true, evidenceState: 'eligible' });
    expect(qualification.evidenceState).not.toBe('activated');
    expect(qualification.evidenceState).not.toBe('redeemed');
  });

  test('realized savings requires receipt evidence and never trusts an AI estimate', () => {
    expect(() => calculateRealizedSavings({ baselineCents: 1500, paidCents: 1100, receiptEvidenceId: null })).toThrow(
      expect.objectContaining({ code: 'grocery.receipt_evidence_required' }),
    );
    expect(calculateRealizedSavings({ baselineCents: 1500, paidCents: 1100, receiptEvidenceId: 'receipt-1' })).toEqual({
      receiptEvidenceId: 'receipt-1',
      realizedSavingsCents: 400,
    });
  });
});
