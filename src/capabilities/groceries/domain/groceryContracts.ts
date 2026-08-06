export type GroceryItemSource =
  | { kind: 'recipe_ingredient'; recipeVersionId: string; ingredientLineId: string; planEntryId: string }
  | { kind: 'manual'; noteId: string }
  | { kind: 'household_request'; requestId: string; requestedByPersonId: string };

export type GroceryItem = {
  id: string;
  concept: string;
  quantity: number | null;
  unit: string | null;
  originalDisplayTexts: string[];
  sources: GroceryItemSource[];
  state: 'needed' | 'already_have' | 'purchased' | 'removed';
};

export type GroceryList = {
  id: string;
  ownerPersonId: string;
  version: number;
  mealPlanId: string;
  mealPlanVersion: number;
  status: 'review' | 'ready' | 'handed_off' | 'completed';
  compilation: { idempotencyKey: string; contentHash: string };
  items: GroceryItem[];
  createdAt: string;
  updatedAt: string;
};

export type ProductMapping = {
  groceryItemId: string;
  provider: string;
  retailerProductId: string;
  state: 'proposed' | 'confirmed' | 'rejected';
  confirmedByPersonId: string | null;
};

export type PriceQuote = {
  provider: string;
  locationId: string;
  retailerProductId: string;
  priceCents: number;
  observedAt: string;
  expiresAt: string;
};

export type OfferEvidenceState = 'observed' | 'eligible' | 'activated' | 'redeemed' | 'expired';

export type SavingsPlan = {
  id: string;
  groceryListId: string;
  groceryListVersion: number;
  version: number;
  provider: string;
  locationId: string;
  selectedProductMappingIds: string[];
  selectedOfferIds: string[];
  predictedSubtotalCents: number;
  predictedSavingsCents: number;
  evidenceObservedAt: string;
  acceptedByPersonId: string;
  acceptedAt: string;
};

export type RetailerHandoff = {
  id: string;
  savingsPlanId: string;
  provider: string;
  idempotencyKey: string;
  payloadHash: string;
  state: 'prepared' | 'opened' | 'acknowledged' | 'expired' | 'failed';
  preparedItemCount: number;
  providerReference: string | null;
  providerAcknowledgedAt: string | null;
  openedAt: string | null;
  expiresAt: string | null;
};

export type ReceiptEvidence = {
  id: string;
  ownerPersonId: string;
  provider: string | null;
  authority: 'user_supplied' | 'provider_authoritative';
  observedAt: string;
  sourceArtifactId: string | null;
  providerReceiptId: string | null;
  reviewed: boolean;
  lineCount: number;
  paidTotalCents: number;
};

export type SavingsOutcome = {
  id: string;
  savingsPlanId: string;
  receiptEvidenceId: string;
  baselineCents: number;
  paidCents: number;
  realizedSavingsCents: number;
  itemized: Array<{
    groceryItemId: string;
    receiptLineRef: string;
    baselineCents: number;
    paidCents: number;
    realizedSavingsCents: number;
  }>;
  calculatedAt: string;
};

export class GroceryContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly recoveryChoices: string[] = [],
  ) {
    super(message);
    this.name = 'GroceryContractError';
  }
}

export function requireGroceryListVersion(list: GroceryList, expectedVersion: number): GroceryList {
  const parsed = parseGroceryList(list);
  if (parsed.version !== expectedVersion) {
    throw new GroceryContractError(
      'grocery.version_conflict',
      'This grocery list changed after it was opened.',
      ['review_current_list', 'rebuild_from_current_plan'],
    );
  }
  return parsed;
}

function stableSourceKey(source: GroceryItemSource): string {
  if (source.kind === 'recipe_ingredient') return `${source.kind}:${source.recipeVersionId}:${source.ingredientLineId}:${source.planEntryId}`;
  if (source.kind === 'household_request') return `${source.kind}:${source.requestId}:${source.requestedByPersonId}`;
  return `${source.kind}:${source.noteId}`;
}

export function compileGroceryItems(lines: Array<{
  concept: string;
  displayText: string;
  quantity: number | null;
  unit: string | null;
  source: GroceryItemSource;
}>): GroceryItem[] {
  const groups = new Map<string, GroceryItem>();
  for (const line of lines) {
    if (!line.concept.trim() || !line.displayText.trim()) {
      throw new GroceryContractError('grocery.line_invalid', 'Ingredient concept and display text are required.');
    }
    if (line.quantity !== null && (!Number.isFinite(line.quantity) || line.quantity < 0)) {
      throw new GroceryContractError('grocery.quantity_invalid', 'Grocery quantity must be non-negative.');
    }
    const normalizedConcept = line.concept.trim().toLocaleLowerCase('en-US');
    const normalizedUnit = line.unit?.trim().toLocaleLowerCase('en-US') ?? null;
    const mergeable = line.quantity !== null && normalizedUnit !== null;
    const key = mergeable
      ? `${normalizedConcept}|${normalizedUnit}`
      : `${normalizedConcept}|unparsed|${stableSourceKey(line.source)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.quantity = (existing.quantity ?? 0) + (line.quantity ?? 0);
      existing.originalDisplayTexts.push(line.displayText);
      existing.sources.push({ ...line.source });
    } else {
      groups.set(key, {
        id: `grocery:${groups.size + 1}:${normalizedConcept}`,
        concept: normalizedConcept,
        quantity: line.quantity,
        unit: normalizedUnit,
        originalDisplayTexts: [line.displayText],
        sources: [{ ...line.source }],
        state: 'needed',
      });
    }
  }
  return [...groups.values()];
}

export function parseGroceryList(value: GroceryList): GroceryList {
  if (!value.id || !value.ownerPersonId || !value.mealPlanId ||
      !Number.isInteger(value.version) || value.version < 1 ||
      !Number.isInteger(value.mealPlanVersion) || value.mealPlanVersion < 1) {
    throw new GroceryContractError('grocery.identity_invalid', 'Grocery list identity and source plan version are required.');
  }
  if (!['review', 'ready', 'handed_off', 'completed'].includes(value.status)) {
    throw new GroceryContractError('grocery.state_invalid', 'Unsupported Grocery list state.');
  }
  if (!value.compilation?.idempotencyKey?.trim() || !value.compilation?.contentHash?.trim()) {
    throw new GroceryContractError('grocery.compilation_invalid', 'Grocery compilation requires an idempotency key and content hash.');
  }
  const ids = new Set<string>();
  const items = value.items.map((item) => {
    if (!item.id || ids.has(item.id) || !item.concept || item.sources.length === 0) {
      throw new GroceryContractError('grocery.item_invalid', 'Grocery items require unique identity, concept, and provenance.');
    }
    ids.add(item.id);
    return { ...item, originalDisplayTexts: [...item.originalDisplayTexts], sources: item.sources.map((source) => ({ ...source })) };
  });
  return { ...value, compilation: { ...value.compilation }, items };
}

function assertIntegerCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new GroceryContractError('grocery.money_invalid', `${label} must be non-negative integer cents.`);
}

export function calculateBasketTotal(lines: Array<{
  productId: string;
  quantity: number;
  priceCents: number;
  packageBaseUnits: number;
}>): { subtotalCents: number; lines: Array<{ productId: string; lineTotalCents: number; unitPriceCents: number }> } {
  const resultLines = lines.map((line) => {
    assertIntegerCents(line.priceCents, 'priceCents');
    if (!Number.isInteger(line.quantity) || line.quantity < 0 || !Number.isFinite(line.packageBaseUnits) || line.packageBaseUnits <= 0) {
      throw new GroceryContractError('grocery.quantity_invalid', 'Basket quantities and package units must be positive.');
    }
    return {
      productId: line.productId,
      lineTotalCents: line.priceCents * line.quantity,
      unitPriceCents: Math.round((line.priceCents / line.packageBaseUnits) * 100) / 100,
    };
  });
  return {
    subtotalCents: resultLines.reduce((sum, line) => sum + line.lineTotalCents, 0),
    lines: resultLines,
  };
}

export function evaluateOfferQualification(input: {
  offer: { id: string; minQuantity: number; memberRequired: boolean; state: 'observed'; expiresAt: string };
  basketQuantity: number;
  hasMembership: boolean;
  now: string;
}): { qualifies: boolean; evidenceState: 'observed' | 'eligible' | 'expired' } {
  if (Date.parse(input.offer.expiresAt) <= Date.parse(input.now)) return { qualifies: false, evidenceState: 'expired' };
  const qualifies = input.basketQuantity >= input.offer.minQuantity && (!input.offer.memberRequired || input.hasMembership);
  return { qualifies, evidenceState: qualifies ? 'eligible' : 'observed' };
}

export function calculateRealizedSavings(input: {
  baselineCents: number;
  paidCents: number;
  receiptEvidenceId: string | null;
}): { receiptEvidenceId: string; realizedSavingsCents: number } {
  assertIntegerCents(input.baselineCents, 'baselineCents');
  assertIntegerCents(input.paidCents, 'paidCents');
  if (!input.receiptEvidenceId) {
    throw new GroceryContractError('grocery.receipt_evidence_required', 'Realized savings requires receipt or provider evidence.');
  }
  return {
    receiptEvidenceId: input.receiptEvidenceId,
    realizedSavingsCents: Math.max(0, input.baselineCents - input.paidCents),
  };
}
