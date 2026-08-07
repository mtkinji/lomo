import {
  FoodProposalContractError,
  InMemoryFoodReceiptLedger,
  applyFoodProposal,
  applyFoodProposalBatch,
  decideFoodProposal,
  toAgentLedgerRecords,
  type FoodProposal,
  type FoodProposalOperation,
} from './foodProposalContracts';

const operationFixtures: FoodProposalOperation[] = [
  {
    id: 'op-import', proposalId: 'proposal-import', capabilityId: 'recipes',
    operationId: 'recipes.import.approve', targetType: 'recipe_import_draft', targetId: 'draft-1',
    expectedResourceVersion: 3, summary: 'Create Lemon Pasta from the reviewed scan',
    idempotencyKey: 'import:draft-1:v3', sequence: 1, evidenceRefs: ['evidence-scan-1'],
    returnTarget: { capability: 'recipes', objectType: 'recipe', objectId: 'recipe-1' },
    reversible: true, payload: { draftId: 'draft-1', expectedDraftVersion: 3 },
  },
  {
    id: 'op-finalize', proposalId: 'proposal-finalize', capabilityId: 'meal_planning',
    operationId: 'meal_planning.plan.finalize', targetType: 'meal_plan', targetId: 'plan-1',
    expectedResourceVersion: 5, summary: 'Finalize three dinners', idempotencyKey: 'plan:plan-1:finalize:v5',
    sequence: 1, evidenceRefs: ['evidence-plan-1'],
    returnTarget: { capability: 'meal_planning', objectType: 'meal_plan', objectId: 'plan-1' },
    reversible: true, payload: { planId: 'plan-1', expectedPlanVersion: 5, selectedCandidateIds: ['candidate-1'] },
  },
  {
    id: 'op-round', proposalId: 'proposal-round', capabilityId: 'meal_planning',
    operationId: 'meal_planning.round.open', targetType: 'meal_plan', targetId: 'plan-1',
    expectedResourceVersion: 5, summary: 'Ask the family what sounds good', idempotencyKey: 'plan:plan-1:round:v5',
    sequence: 1, evidenceRefs: ['evidence-household-1'],
    returnTarget: { capability: 'meal_planning', objectType: 'meal_choice_round', objectId: 'round-1' },
    reversible: true, payload: { planId: 'plan-1', expectedPlanVersion: 5, invitedPersonIds: ['person-2'] },
  },
  {
    id: 'op-publish', proposalId: 'proposal-publish', capabilityId: 'recipes',
    operationId: 'recipes.publication.publish', targetType: 'recipe_publication', targetId: 'publication-1',
    expectedResourceVersion: 2, summary: 'Publish version 4 to Kwilt', idempotencyKey: 'publication:publication-1:v2',
    sequence: 1, evidenceRefs: ['evidence-rights-1'],
    returnTarget: { capability: 'recipes', objectType: 'recipe_publication', objectId: 'publication-1' },
    reversible: true,
    payload: { publicationId: 'publication-1', expectedPublicationVersion: 2, confirmedRecipeVersionId: 'recipe-version-4', confirmedScopes: ['kwilt_mobile'] },
  },
  {
    id: 'op-product', proposalId: 'proposal-product', capabilityId: 'groceries',
    operationId: 'groceries.product_match.confirm', targetType: 'grocery_item', targetId: 'item-1',
    expectedResourceVersion: 7, summary: 'Use the 16 ounce store-brand can', idempotencyKey: 'item:item-1:product:v7',
    sequence: 1, evidenceRefs: ['evidence-quote-1'],
    returnTarget: { capability: 'groceries', objectType: 'grocery_item', objectId: 'item-1' },
    reversible: true,
    payload: { groceryItemId: 'item-1', expectedItemVersion: 7, productId: 'product-1', priceQuoteId: 'quote-1' },
  },
  {
    id: 'op-savings', proposalId: 'proposal-savings', capabilityId: 'savings',
    operationId: 'savings.accept', targetType: 'savings_plan', targetId: 'savings-1',
    expectedResourceVersion: 1, summary: 'Accept two verified offers', idempotencyKey: 'savings:savings-1:v1',
    sequence: 1, evidenceRefs: ['evidence-offer-1'],
    returnTarget: { capability: 'savings', objectType: 'savings_plan', objectId: 'savings-1' },
    reversible: true,
    payload: { savingsPlanId: 'savings-1', expectedSavingsPlanVersion: 1, selectedOfferIds: ['offer-1', 'offer-2'] },
  },
];

function proposal(operation: FoodProposalOperation, overrides: Partial<FoodProposal> = {}): FoodProposal {
  return {
    id: operation.proposalId,
    origin: { channel: 'native_food', threadId: null, runId: null, messageId: null },
    title: operation.summary,
    body: '',
    status: 'pending',
    version: 1,
    operation,
    createdAt: '2026-08-05T12:00:00.000Z',
    updatedAt: '2026-08-05T12:00:00.000Z',
    ...overrides,
  } as FoodProposal;
}

describe('Food proposal compatibility', () => {
  it.each(operationFixtures)('maps $operationId into the shared proposal and receipt ledger', (operation) => {
    const records = toAgentLedgerRecords(proposal(operation));
    expect(records.proposal.capabilityId).toBe(operation.capabilityId);
    expect(records.proposal.threadId).toBeNull();
    expect(records.proposal.originChannel).toBe('native_food');
    expect(records.operation.payload).toEqual(operation.payload);
    expect(records.operation.expectedResourceVersion).toBe(operation.expectedResourceVersion);
    expect(records.operation.evidenceRefs).toEqual(operation.evidenceRefs);
    expect(records.operation.returnTarget).toEqual(operation.returnTarget);
  });

  it('rejects a stale proposal before reserving a receipt', () => {
    const approved = decideFoodProposal(proposal(operationFixtures[1]), { action: 'approve', expectedVersion: 1 });
    const ledger = new InMemoryFoodReceiptLedger();
    expect(() => applyFoodProposal({ proposal: approved, currentResourceVersion: 6, providerAvailable: true, ledger, apply: () => ({}) }))
      .toThrow(expect.objectContaining({ code: 'food_proposal.version_conflict' }));
    expect(ledger.all()).toHaveLength(0);
  });

  it('makes retries idempotent and returns the exact prior resource result', () => {
    const approved = decideFoodProposal(proposal(operationFixtures[0]), { action: 'approve', expectedVersion: 1 });
    const ledger = new InMemoryFoodReceiptLedger();
    const apply = jest.fn(() => ({ resultingObjectType: 'recipe', resultingObjectId: 'recipe-1', resourceVersion: 1 }));
    const first = applyFoodProposal({ proposal: approved, currentResourceVersion: 3, providerAvailable: true, ledger, apply });
    const retry = applyFoodProposal({ proposal: approved, currentResourceVersion: 3, providerAvailable: true, ledger, apply });
    expect(retry).toEqual(first);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('records decline and edit decisions without mutation receipts', () => {
    const ledger = new InMemoryFoodReceiptLedger();
    const rejected = decideFoodProposal(proposal(operationFixtures[4]), { action: 'reject', expectedVersion: 1 });
    const edited = decideFoodProposal(proposal(operationFixtures[4]), {
      action: 'edit', expectedVersion: 1,
      payload: { groceryItemId: 'item-1', expectedItemVersion: 7, productId: 'product-2', priceQuoteId: 'quote-2' },
    });
    expect(rejected.status).toBe('rejected');
    expect(edited.status).toBe('edited');
    expect(edited.operation.payload).toEqual(expect.objectContaining({ productId: 'product-2' }));
    expect(ledger.all()).toHaveLength(0);
  });

  it('reports a partial batch and skips dependent work after a failure', () => {
    const selected = operationFixtures.slice(0, 3).map((operation, index) => decideFoodProposal(
      proposal({ ...operation, outcomeStep: { sequence: index + 1, dependsOnSequence: index === 2 ? 2 : null } }),
      { action: 'approve', expectedVersion: 1 },
    ));
    const result = applyFoodProposalBatch({
      proposals: selected,
      currentResourceVersion: (candidate) => candidate.operation.expectedResourceVersion,
      providerAvailable: () => true,
      ledger: new InMemoryFoodReceiptLedger(),
      apply: (candidate) => {
        if (candidate.id === 'proposal-finalize') throw new Error('write failed');
        return { resultingObjectType: candidate.operation.targetType, resultingObjectId: candidate.operation.targetId, resourceVersion: 1 };
      },
    });
    expect(result.applied).toEqual(['proposal-import']);
    expect(result.failed).toEqual([{ proposalId: 'proposal-finalize', message: 'write failed' }]);
    expect(result.skipped).toEqual([{ proposalId: 'proposal-round', reason: 'Its prerequisite did not complete.' }]);
  });

  it('recovers a reserved receipt instead of creating a duplicate', () => {
    const approved = decideFoodProposal(proposal(operationFixtures[5]), { action: 'approve', expectedVersion: 1 });
    const ledger = new InMemoryFoodReceiptLedger();
    const reserved = ledger.reserve(approved);
    const recovered = applyFoodProposal({
      proposal: approved, currentResourceVersion: 1, providerAvailable: true, ledger,
      apply: () => ({ resultingObjectType: 'savings_plan', resultingObjectId: 'savings-1', resourceVersion: 2 }),
    });
    expect(recovered.id).toBe(reserved.id);
    expect(recovered.status).toBe('applied');
    expect(ledger.all()).toHaveLength(1);
  });

  it('persists an honest failed receipt when a required provider is unavailable', () => {
    const approved = decideFoodProposal(proposal(operationFixtures[4]), { action: 'approve', expectedVersion: 1 });
    const ledger = new InMemoryFoodReceiptLedger();
    expect(() => applyFoodProposal({ proposal: approved, currentResourceVersion: 7, providerAvailable: false, ledger, apply: () => ({}) }))
      .toThrow(expect.objectContaining({ code: 'food_proposal.provider_unavailable' } satisfies Partial<FoodProposalContractError>));
    expect(ledger.all()).toEqual([expect.objectContaining({ status: 'failed', errorCode: 'food_proposal.provider_unavailable' })]);
  });
});
