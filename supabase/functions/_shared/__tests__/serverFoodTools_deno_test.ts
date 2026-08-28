import { executeServerFoodTool } from '../serverFoodTools.ts';

const cookSession = {
  id: 'session-1', owner_person_id: 'person-1', recipe_id: 'recipe-1', recipe_version_id: 'version-1', recipe_version: 2,
  serving_scale: 1, status: 'active', current_cue_index: 0, cue_count: 2, revision: 2, timers: [],
  last_device: { deviceId: 'device-1', platform: 'ios', appVersion: '1', observedAt: '2026-08-27T12:00:00.000Z' },
  started_at: '2026-08-27T12:00:00.000Z', paused_at: null, completed_at: null, updated_at: '2026-08-27T12:00:00.000Z',
};
const snapshot = {
  actorPersonId: 'person-1', cookSessions: [cookSession],
  foodStock: [{ id: 'stock-1', ownerPersonId: 'person-1', concept: 'Beans', state: 'confirmed',
    quantityMin: 2, quantityMax: 3, unit: 'cans', source: 'manual', confidence: 1,
    observedAt: '2026-08-27T12:00:00.000Z', expiresAt: '2026-09-03T12:00:00.000Z',
    supersedesObservationId: null, correctedAt: null }],
  foodCycle: { id: 'cycle-1', cycleRef: 'next-shop', tripTargetCents: 6500,
    moneyEnvelope: { sourcePlanVersionId: 'money-v4', categoryIds: ['food'], remainingCents: 8000,
      observedAt: '2026-08-27T12:00:00.000Z', assumptions: ['Food category only'] }, updatedAt: 'now' },
  groceryLists: [{ id: 'list-1', revision: 3, status: 'review_needed', sourceKind: 'meal_plan',
    sourceMealPlanId: 'plan-final', sourceMealPlanVersion: 7, updatedAt: 'now', items: [{ id: 'item-1', concept: 'milk',
      quantityMin: 1, quantityMax: 1, unit: 'gallon', aisle: 'dairy', originalDisplayTexts: ['1 gallon milk'],
      reviewReason: null, state: 'needed', note: null, sources: [] }] }],
  retailerHandoffs: [],
  mealPlans: [{ id: 'plan-1', organizerPersonId: 'person-1', householdId: null, version: 3, state: 'draft', horizon: { kind: 'open' },
    candidates: [{ id: 'candidate-old', kind: 'meal_note', title: 'Leftovers', recipeSnapshot: null }],
    activeRound: null, updatedAt: 'now' },
  { id: 'plan-shared', householdId: 'household-1', version: 4, state: 'draft', horizon: { kind: 'open' },
    candidates: [{ id: 'candidate-1', kind: 'meal_note', title: 'Tacos', recipeSnapshot: null }], activeRound: null, updatedAt: 'now' },
  { id: 'plan-open', householdId: 'household-1', version: 5, state: 'collecting_choices', horizon: { kind: 'open' },
    candidates: [{ id: 'candidate-1', kind: 'meal_note', title: 'Tacos', recipeSnapshot: null }],
    activeRound: { id: 'round-1', version: 2, state: 'open', closesAt: null }, updatedAt: 'now' },
  { id: 'plan-final', householdId: 'household-1', version: 7, state: 'finalized', horizon: { kind: 'open' },
    candidates: [{ id: 'candidate-1', kind: 'meal_note', title: 'Tacos', recipeSnapshot: null }], activeRound: null, updatedAt: 'now' }],
  mealChoiceRounds: [{ roundId: 'round-1', planId: 'plan-open', version: 2, state: 'open', closesAt: null,
    candidates: [{ id: 'candidate-1', kind: 'meal_note', title: 'Tacos', recipeSnapshot: null }],
    myResponse: { id: 'response-1', version: 1, state: 'submitted', selectedCandidateIds: ['candidate-1'], pass: false, suggestion: null } }],
  recipeFavorites: ['recipe-1'], hiddenRecipes: [],
  recipeImportDrafts: [{ id: 'draft-1', version: 2, state: 'needs_review', sourceMethod: 'photo',
    sourceArtifacts: [{ id: 'artifact-1' }], extractedData: { sourceTitle: 'Grandma card' }, evidence: {}, warnings: [],
    expiresAt: '2099-01-01T00:00:00.000Z', createdAt: 'now', updatedAt: 'now' }],
  recipes: [{ recipeId: 'recipe-1', ownerPersonId: 'person-1', lifecycle: 'active', ownershipKind: 'personal', updatedAt: 'now',
    provenance: { method: 'manual', sourceUrl: null, sourceTitle: null, sourceAuthor: null, sourceContentHash: null, rightsBasis: 'user_authored' },
    credits: [], lineage: [],
    version: { id: 'version-1', version: 2, title: 'Lemon pasta', description: 'Weeknight dinner', yieldQuantity: 4,
      yieldUnit: 'servings', scalingState: 'verified', prepMinutes: 10, cookMinutes: 15, notes: null,
      ingredients: [{ id: 'ingredient-1', originalText: '1 lemon', groupLabel: null, quantityMin: 1, quantityMax: null,
        unit: 'count', ingredientConcept: 'lemon', preparation: null, optional: false, parseConfidence: 1,
        scaleRule: { kind: 'multiply' } }],
      instructions: [{ id: 'instruction-1', sectionLabel: null, stepText: 'Cook pasta.' }], equipmentRequirements: [] } }],
  mealPreferences: { householdId: 'household-1', version: 3, updatedAt: 'now', usualDinerPersonIds: ['person-1'],
    usualDinerCount: 4, setupState: 'completed', foodNeeds: [], members: [{ personId: 'person-1' }, { personId: 'person-2' }] },
  observedAt: '2026-08-27T12:00:00.000Z',
};
const client = { rpc: async (name: string, args: Record<string, unknown>) => name === 'apply_kwilt_cook_session_conversational'
  ? ({ data: { session: (args.p_session as Record<string, unknown>), replayed: false }, error: null })
  : ({ data: snapshot, error: null }) };
const common = { client, userId: 'user-1' };

Deno.test('server food controls read bounded meal preferences', async () => {
  const result = await executeServerFoodTool({ ...common, call: { id: 'call-1', toolId: 'meal_planning.preferences.read', arguments: {} } });
  if (result?.status !== 'completed' || result.output.householdId !== 'household-1') throw new Error('missing bounded meal projection');
});

Deno.test('remaining Food operations create truthful native review handoffs', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageDeviceAction = async (request: unknown) => { requests.push(request as Record<string, unknown>); };
  const publication = await executeServerFoodTool({ ...common, stageDeviceAction,
    call: { id: 'publish', toolId: 'recipes.publication.prepare', arguments: {
      recipeVersionId: 'version-1', publicProfileId: 'profile-1', distributionScopes: ['kwilt_mobile'],
    } } });
  const scenario = await executeServerFoodTool({ ...common, stageDeviceAction,
    call: { id: 'scenario', toolId: 'food_scenario.accept', arguments: { scenarioId: 'scenario-1', expectedVersion: 2 } } });
  const savings = await executeServerFoodTool({ ...common, stageDeviceAction,
    call: { id: 'savings', toolId: 'savings.review', arguments: {
      groceryListId: 'list-1', provider: 'kroger', locationId: 'store-1',
    } } });
  const receipt = await executeServerFoodTool({ ...common, stageDeviceAction,
    call: { id: 'receipt', toolId: 'receipt.extract', arguments: { sourceArtifactRefs: ['artifact-1'] } } });
  if ([publication, scenario, savings, receipt].some((result) => result?.status !== 'pending_client_action')
    || requests.map((request) => request.actionType).join(',')
      !== 'open_recipe_publication_review,open_food_scenario_review,open_grocery_savings,open_grocery_receipt_review'
    || requests.some((request) => !String(request.consequenceSummary).match(/review|Nothing|not claimed/i))) {
    throw new Error('advanced Food handoffs overstated completion or lost their native owner');
  }
});

Deno.test('server food controls read owner stock and bounded food-cycle budget evidence', async () => {
  const stock = await executeServerFoodTool({ ...common, call: { id: 'stock-read', toolId: 'food_stock.read', arguments: { concepts: ['beans'] } } });
  const budget = await executeServerFoodTool({ ...common, call: { id: 'budget-read', toolId: 'food_budget.read', arguments: {} } });
  if (stock?.status !== 'completed' || !Array.isArray(stock.output.observations)
    || (stock.output.observations[0] as Record<string, unknown>).id !== 'stock-1') throw new Error('stock read failed');
  if (budget?.status !== 'completed' || budget.output.tripTargetCents !== 6500
    || !String(budget.output.limitation).includes('not a claim')) throw new Error('food budget overstated authority');
});

Deno.test('server food controls stage exact reviewed stock observation and depletion writes', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageProposal = async (input: unknown) => { requests.push(input as Record<string, unknown>); return { id: `proposal-${requests.length}` } as never; };
  const observe = await executeServerFoodTool({ ...common, call: { id: 'observe', toolId: 'food_stock.observe', arguments: {
    observation: { concept: 'Beans', state: 'confirmed', quantityMin: 4, quantityMax: 5, unit: 'cans', source: 'voice',
      confidence: 0.9, observedAt: '2026-08-28T12:00:00.000Z', expiresAt: null },
    expectedObservationId: 'stock-1', idempotencyKey: 'observe-1',
  } }, stageProposal });
  const deplete = await executeServerFoodTool({ ...common, call: { id: 'deplete', toolId: 'food_stock.deplete', arguments: {
    concept: 'Beans', expectedObservationId: 'stock-1', observedAt: '2026-08-28T13:00:00.000Z', idempotencyKey: 'deplete-1',
  } }, stageProposal });
  const observeOperation = requests[0].operation as Record<string, unknown>;
  const depleteOperation = requests[1].operation as Record<string, unknown>;
  if (observe?.status !== 'proposed' || observeOperation.type !== 'food_stock.observe'
    || (observeOperation.payload as Record<string, unknown>).expectedObservationId !== 'stock-1'
    || deplete?.status !== 'proposed' || depleteOperation.type !== 'food_stock.deplete'
    || (depleteOperation.payload as Record<string, unknown>).expectedObservationId !== 'stock-1') {
    throw new Error('Food Stock proposals lost exact evidence authority');
  }
});

Deno.test('server food controls reject stale stock evidence and confirmed receipt inference', async () => {
  const stageProposal = async () => ({ id: 'proposal' } as never);
  const stale = await executeServerFoodTool({ ...common, call: { id: 'stale', toolId: 'food_stock.deplete', arguments: {
    concept: 'Beans', expectedObservationId: 'stock-old', observedAt: '2026-08-28T13:00:00.000Z', idempotencyKey: 'deplete-1',
  } }, stageProposal });
  const receipt = await executeServerFoodTool({ ...common, call: { id: 'receipt', toolId: 'food_stock.observe', arguments: {
    observation: { concept: 'Milk', state: 'confirmed', quantityMin: 1, quantityMax: 1, unit: 'gallon', source: 'receipt',
      confidence: 1, observedAt: '2026-08-28T12:00:00.000Z', expiresAt: null },
    expectedObservationId: null, idempotencyKey: 'observe-1',
  } }, stageProposal });
  if (stale?.status !== 'failed' || stale.code !== 'food_stock_observation_stale'
    || receipt?.status !== 'failed' || receipt.code !== 'food_stock_observation_invalid') {
    throw new Error('Food Stock write guardrails failed');
  }
});

Deno.test('server food controls read Grocery lists and stage exact compile and item changes', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageProposal = async (input: unknown) => { requests.push(input as Record<string, unknown>); return { id: `proposal-${requests.length}` } as never; };
  const review = await executeServerFoodTool({ ...common, call: { id: 'review', toolId: 'groceries.list.review', arguments: { groceryListId: 'list-1' } } });
  const calls = [
    { id: 'compile', toolId: 'groceries.compile', arguments: { mealPlanId: 'plan-final', mealPlanVersion: 7, idempotencyKey: 'compile-1' } },
    { id: 'add', toolId: 'groceries.item.add', arguments: { groceryListId: 'list-1', expectedVersion: 3, title: 'Eggs', sourceKind: 'manual', idempotencyKey: 'add-1' } },
    { id: 'update', toolId: 'groceries.item.update', arguments: { groceryItemId: 'item-1', expectedVersion: 3, patch: { quantityMin: 2 }, reason: null, idempotencyKey: 'update-1' } },
    { id: 'state', toolId: 'groceries.item.set_state', arguments: { groceryItemId: 'item-1', expectedVersion: 3, state: 'already_have', idempotencyKey: 'state-1' } },
  ];
  for (const call of calls) {
    const result = await executeServerFoodTool({ ...common, call, stageProposal });
    if (result?.status !== 'proposed') throw new Error(`${call.toolId} was not staged`);
  }
  if (review?.status !== 'completed' || (review.output.groceryList as Record<string, unknown>).id !== 'list-1'
    || requests.map((request) => (request.operation as Record<string, unknown>).type).join(',')
      !== 'groceries.compile,groceries.item.add,groceries.item.update,groceries.item.set_state') {
    throw new Error('Grocery server controls lost list or operation authority');
  }
});

Deno.test('server food controls reject stale Grocery list mutations', async () => {
  const result = await executeServerFoodTool({ ...common, call: { id: 'stale-add', toolId: 'groceries.item.add', arguments: {
    groceryListId: 'list-1', expectedVersion: 2, title: 'Eggs', sourceKind: 'manual', idempotencyKey: 'add-1',
  } }, stageProposal: async () => ({ id: 'proposal' } as never) });
  if (result?.status !== 'failed' || result.code !== 'grocery_version_stale' || !result.retryable) throw new Error('stale Grocery mutation was not rejected');
});

Deno.test('server food controls hand exact retailer review back to the native device', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageDeviceAction = async (input: unknown) => { requests.push(input as Record<string, unknown>); };
  const readyClient = { rpc: async () => ({ data: { ...snapshot,
    groceryLists: [{ ...snapshot.groceryLists[0], status: 'ready' }],
    retailerHandoffs: [{ id: 'handoff-1', groceryListId: 'list-1', provider: 'instacart',
      state: 'provider_link_created', expiresAt: '2026-08-28T20:00:00.000Z' }] }, error: null }) };
  const calls = [
    { id: 'match', toolId: 'groceries.product_match.prepare', arguments: {
      groceryItemId: 'item-1', provider: 'kroger', locationId: 'store-1',
    } },
    { id: 'confirm', toolId: 'groceries.product_match.confirm', arguments: {
      groceryItemId: 'item-1', provider: 'kroger', retailerProductId: 'upc-1',
      evidenceObservedAt: '2026-08-27T20:00:00.000Z',
    } },
    { id: 'handoff', toolId: 'groceries.handoff.prepare', arguments: {
      groceryListId: 'list-1', provider: 'instacart', idempotencyKey: 'handoff-1',
    } },
    { id: 'open', toolId: 'groceries.handoff.open', arguments: { retailerHandoffId: 'handoff-1' } },
  ];
  for (const call of calls) {
    const result = await executeServerFoodTool({ client: readyClient, userId: 'user-1', call, stageDeviceAction });
    if (result?.status !== 'pending_client_action') throw new Error(`${call.toolId} did not preserve native review`);
  }
  if (requests.map((request) => request.actionType).join(',')
    !== 'open_grocery_product_match,open_grocery_product_match,open_grocery_handoff,open_grocery_handoff') {
    throw new Error('retailer review action routing changed');
  }
});

Deno.test('server food controls stage exact-version Meal Plan create and update', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageProposal = async (input: unknown) => { requests.push(input as Record<string, unknown>); return { id: `proposal-${requests.length}` } as never; };
  const create = await executeServerFoodTool({ ...common,
    call: { id: 'create-plan', toolId: 'meal_planning.plan.create', arguments: {
      householdId: null, horizon: { kind: 'meal_count', count: 5 }, idempotencyKey: 'create-plan-1',
    } }, stageProposal,
  });
  const update = await executeServerFoodTool({ ...common,
    call: { id: 'update-plan', toolId: 'meal_planning.plan.update', arguments: {
      mealPlanId: 'plan-1', expectedVersion: 3, horizon: { kind: 'date_range', startsOn: '2026-08-28', endsOn: '2026-09-03' },
    } }, stageProposal,
  });
  const createOperation = requests[0].operation as Record<string, unknown>;
  const updateOperation = requests[1].operation as Record<string, unknown>;
  if (create?.status !== 'proposed' || createOperation.type !== 'meal_planning.plan.create'
    || createOperation.targetId !== null || (createOperation.payload as Record<string, unknown>).expectedVersion !== 0
    || update?.status !== 'proposed' || updateOperation.type !== 'meal_planning.plan.update'
    || updateOperation.targetId !== 'plan-1' || (updateOperation.payload as Record<string, unknown>).expectedVersion !== 3) {
    throw new Error('Meal Plan create/update proposal is not exact');
  }
});

Deno.test('server food controls stage immutable candidates and exact removal', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageProposal = async (input: unknown) => { requests.push(input as Record<string, unknown>); return { id: `proposal-${requests.length}` } as never; };
  const add = await executeServerFoodTool({ ...common,
    call: { id: 'add-candidate', toolId: 'meal_planning.candidate.add', arguments: {
      mealPlanId: 'plan-1', expectedVersion: 3,
      candidate: { candidateId: 'candidate-recipe', title: 'Lemon pasta', recipeVersionId: 'version-1', plannedPortions: 4 },
    } }, stageProposal,
  });
  const remove = await executeServerFoodTool({ ...common,
    call: { id: 'remove-candidate', toolId: 'meal_planning.candidate.remove', arguments: {
      mealPlanId: 'plan-1', expectedVersion: 3, candidateId: 'candidate-old',
    } }, stageProposal,
  });
  const addOperation = requests[0].operation as Record<string, unknown>;
  const addPayload = addOperation.payload as Record<string, unknown>;
  const candidate = addPayload.candidate as Record<string, unknown>;
  const recipeSnapshot = candidate.recipeSnapshot as Record<string, unknown>;
  const removeOperation = requests[1].operation as Record<string, unknown>;
  if (add?.status !== 'proposed' || addOperation.type !== 'meal_planning.candidate.add'
    || recipeSnapshot.recipeVersionId !== 'version-1' || recipeSnapshot.recipeVersion !== 2
    || remove?.status !== 'proposed' || removeOperation.type !== 'meal_planning.candidate.remove'
    || (removeOperation.payload as Record<string, unknown>).candidateId !== 'candidate-old') {
    throw new Error('Meal Plan candidate proposals lost exact authority');
  }
});

Deno.test('server food controls reject stale Meal Plans and duplicate Recipe candidates', async () => {
  const stageProposal = async () => ({ id: 'proposal' } as never);
  const stale = await executeServerFoodTool({ ...common,
    call: { id: 'stale-plan', toolId: 'meal_planning.plan.update', arguments: {
      mealPlanId: 'plan-1', expectedVersion: 2, horizon: { kind: 'open' },
    } }, stageProposal,
  });
  const duplicateClient = { rpc: async () => ({ data: { ...snapshot, mealPlans: [{ ...snapshot.mealPlans[0], candidates: [{
    id: 'candidate-existing', kind: 'recipe', title: 'Lemon pasta', recipeSnapshot: { recipeVersionId: 'version-1' },
  }] }] }, error: null }) };
  const duplicate = await executeServerFoodTool({ client: duplicateClient, userId: 'user-1',
    call: { id: 'duplicate-candidate', toolId: 'meal_planning.candidate.add', arguments: {
      mealPlanId: 'plan-1', expectedVersion: 3,
      candidate: { candidateId: 'candidate-new', title: 'Lemon pasta', recipeVersionId: 'version-1', plannedPortions: 4 },
    } }, stageProposal,
  });
  if (stale?.status !== 'failed' || stale.code !== 'meal_plan_version_stale') throw new Error('stale Meal Plan accepted');
  if (duplicate?.status !== 'failed' || duplicate.code !== 'meal_candidate_recipe_exists') throw new Error('duplicate Recipe candidate accepted');
});

Deno.test('server food controls stage exact family round lifecycle and finalized revision', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageProposal = async (input: unknown) => { requests.push(input as Record<string, unknown>); return { id: `proposal-${requests.length}` } as never; };
  const open = await executeServerFoodTool({ ...common, call: { id: 'open-round', toolId: 'meal_planning.round.open', arguments: {
    mealPlanId: 'plan-shared', expectedVersion: 4, participantPersonIds: ['person-2'],
  } }, stageProposal });
  const close = await executeServerFoodTool({ ...common, call: { id: 'close-round', toolId: 'meal_planning.round.close', arguments: {
    choiceRoundId: 'round-1', expectedVersion: 2,
  } }, stageProposal });
  const revise = await executeServerFoodTool({ ...common, call: { id: 'revise-plan', toolId: 'meal_planning.plan.revise', arguments: {
    mealPlanId: 'plan-final', expectedVersion: 7,
  } }, stageProposal });
  if (open?.status !== 'proposed' || close?.status !== 'proposed' || revise?.status !== 'proposed') throw new Error('Meal Plan lifecycle proposal missing');
  const types = requests.map((request) => (request.operation as Record<string, unknown>).type);
  if (types.join(',') !== 'meal_planning.round.open,meal_planning.round.close,meal_planning.plan.revise') throw new Error('wrong Meal Plan lifecycle operations');
});

Deno.test('server food controls stage only the current participant own exact-round response', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageProposal = async (input: unknown) => { requests.push(input as Record<string, unknown>); return { id: `proposal-${requests.length}` } as never; };
  const submit = await executeServerFoodTool({ ...common, call: { id: 'submit-response', toolId: 'meal_planning.response.submit', arguments: {
    choiceRoundId: 'round-1', expectedVersion: 2, candidateIds: ['candidate-1'], pass: false, suggestion: null,
  } }, stageProposal });
  const withdraw = await executeServerFoodTool({ ...common, call: { id: 'withdraw-response', toolId: 'meal_planning.response.withdraw', arguments: {
    choiceRoundId: 'round-1', expectedVersion: 2,
  } }, stageProposal });
  const submitPayload = (requests[0].operation as Record<string, unknown>).payload as Record<string, unknown>;
  if (submit?.status !== 'proposed' || withdraw?.status !== 'proposed'
    || !Array.isArray(submitPayload.availableCandidateIds) || submitPayload.availableCandidateIds[0] !== 'candidate-1') {
    throw new Error('participant response proposal lost bounded candidate authority');
  }
});

Deno.test('server food controls stage exact reviewed Meal Plan finalization', async () => {
  const requests: Record<string, unknown>[] = [];
  const result = await executeServerFoodTool({ ...common,
    call: { id: 'finalize-plan', toolId: 'meal_planning.plan.finalize', arguments: {
      mealPlanId: 'plan-1', expectedVersion: 3, idempotencyKey: 'finalize-plan-1', organizerNote: null,
      occasions: [{ id: 'occasion-1', title: null, placementDate: null, timing: { kind: 'flexible' },
        notEatingPersonIds: [], dishes: [{ id: 'dish-1', candidateId: 'candidate-old',
          dinerPersonIds: ['person-1'], servings: 2 }] }],
    } }, stageProposal: async (input) => { requests.push(input as unknown as Record<string, unknown>); return { id: 'proposal-finalize' } as never; },
  });
  const operation = requests[0].operation as Record<string, unknown>;
  const payload = operation.payload as Record<string, unknown>;
  if (result?.status !== 'proposed' || operation.type !== 'meal_planning.plan.finalize'
    || operation.targetId !== 'plan-1' || payload.expectedVersion !== 3
    || !Array.isArray(payload.occasions)) throw new Error('Meal Plan finalization proposal is not exact');
});

Deno.test('server food controls prepare bounded Recipe candidates with honest evidence freshness', async () => {
  const result = await executeServerFoodTool({ ...common,
    call: { id: 'prepare-candidates', toolId: 'meal_planning.candidates.prepare', arguments: {
      horizon: { kind: 'meal_count', count: 4 }, constraints: { query: 'best_use', maxResults: 2 },
    } },
  });
  if (result?.status !== 'completed' || !Array.isArray(result.output.candidates)
    || result.output.candidates.length !== 1 || !String(result.output.evidenceNotice).includes('does not claim')) {
    throw new Error('Meal candidate preparation overstated or lost evidence');
  }
});

Deno.test('server food controls search and read only authorized recipe projections', async () => {
  const search = await executeServerFoodTool({ ...common, call: { id: 'call-search', toolId: 'recipes.search', arguments: { query: 'lemon', limit: 5 } } });
  if (search?.status !== 'completed' || !Array.isArray(search.output.recipes) || search.output.recipes.length !== 1) throw new Error('recipe search failed');
  const read = await executeServerFoodTool({ ...common, call: { id: 'call-read', toolId: 'recipes.read', arguments: { recipeId: 'recipe-1' } } });
  if (read?.status !== 'completed' || read.output.recipeId !== 'recipe-1') throw new Error('recipe read failed');
  const denied = await executeServerFoodTool({ ...common, call: { id: 'call-denied', toolId: 'recipes.read', arguments: { recipeId: 'recipe-other' } } });
  if (denied?.status !== 'refused') throw new Error('unauthorized recipe exposed');
});

Deno.test('server food controls preview deterministic Recipe scaling without mutation', async () => {
  const result = await executeServerFoodTool({ ...common, call: { id: 'call-scale', toolId: 'recipes.scale.preview',
    arguments: { recipeVersionId: 'version-1', targetYield: 8 } } });
  const ingredients = result?.status === 'completed' && Array.isArray(result.output.ingredients) ? result.output.ingredients : [];
  if (ingredients.length !== 1 || (ingredients[0] as Record<string, unknown>).quantity !== 2) throw new Error('recipe scale preview failed');
});

Deno.test('server food controls stage an attributed exact-version Recipe fork', async () => {
  const requests: Record<string, unknown>[] = [];
  const result = await executeServerFoodTool({ ...common,
    call: { id: 'call-fork', toolId: 'recipes.fork', arguments: {
      sourceRecipeVersionId: 'version-1', idempotencyKey: 'fork-request-1',
    } }, stageProposal: async (input) => { requests.push(input as unknown as Record<string, unknown>); return { id: 'proposal-fork' } as never; },
  });
  const operation = requests[0]?.operation as Record<string, unknown>;
  const payload = operation?.payload as Record<string, unknown>;
  const reviewed = payload?.reviewedData as Record<string, unknown>;
  const lineage = reviewed?.lineage as Record<string, unknown>[];
  if (result?.status !== 'proposed' || operation.type !== 'recipes.fork' || operation.targetId !== 'version-1'
    || payload.expectedVersion !== 2 || payload.sourceRecipeId !== 'recipe-1'
    || (reviewed.provenance as Record<string, unknown>).method !== 'copy'
    || lineage[0]?.sourceRecipeVersionId !== 'version-1') throw new Error('Recipe fork proposal lost source lineage');
});

Deno.test('server food controls stage one exact-version Recipe collaborator grant', async () => {
  const requests: Record<string, unknown>[] = [];
  const result = await executeServerFoodTool({ ...common,
    call: { id: 'call-collaborator', toolId: 'recipes.collaborator.invite', arguments: {
      recipeId: 'recipe-1', recipientPersonId: 'person-2', role: 'contributor', expectedVersion: 2,
    } }, stageProposal: async (input) => { requests.push(input as unknown as Record<string, unknown>); return { id: 'proposal-collaborator' } as never; },
  });
  const operation = requests[0]?.operation as Record<string, unknown>;
  const payload = operation?.payload as Record<string, unknown>;
  if (result?.status !== 'proposed' || operation.type !== 'recipes.collaborator.invite'
    || operation.targetId !== 'recipe-1' || payload.recipientPersonId !== 'person-2'
    || payload.role !== 'contributor' || payload.expectedVersion !== 2) throw new Error('Recipe collaborator proposal is not exact');
});

Deno.test('server food controls hand exact Recipe copy delivery to native recipient review', async () => {
  const actions: Record<string, unknown>[] = [];
  const result = await executeServerFoodTool({ ...common,
    call: { id: 'call-share-copy', toolId: 'recipes.share_copy.prepare', arguments: {
      recipeVersionId: 'version-1', recipientPersonId: 'person-2',
    } }, stageDeviceAction: async (input) => { actions.push(input as unknown as Record<string, unknown>); },
  });
  if (result?.status !== 'pending_client_action' || actions[0]?.actionType !== 'open_recipe_share_copy'
    || actions[0]?.targetId !== 'recipe-1'
    || (actions[0]?.payload as Record<string, unknown>).recipientPersonId !== 'person-2') {
    throw new Error('Recipe share copy was not handed to exact native review');
  }
});

Deno.test('server food controls stage reviewed Recipe create, update, and delete proposals', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageProposal = async (input: unknown) => {
    requests.push(input as Record<string, unknown>);
    return { id: `proposal-${requests.length}` } as never;
  };
  const create = await executeServerFoodTool({ ...common,
    call: { id: 'call-create', toolId: 'recipes.create', arguments: { recipe: {
      title: 'Sunday waffles', ingredients: ['2 cups flour'], instructions: ['Whisk in a stand mixer.'],
    } } }, stageProposal,
  });
  const update = await executeServerFoodTool({ ...common,
    call: { id: 'call-update', toolId: 'recipes.update', arguments: {
      recipeId: 'recipe-1', expectedVersion: 2, reviewedVersion: { notes: 'Use Meyer lemons.' },
    } }, stageProposal,
  });
  const remove = await executeServerFoodTool({ ...common,
    call: { id: 'call-delete', toolId: 'recipes.delete', arguments: { recipeId: 'recipe-1', expectedVersion: 2 } }, stageProposal,
  });
  if (create?.status !== 'proposed' || update?.status !== 'proposed' || remove?.status !== 'proposed') {
    throw new Error('Recipe mutation proposal missing');
  }
  const createOperation = requests[0].operation as Record<string, unknown>;
  const createPayload = createOperation.payload as Record<string, unknown>;
  const createdRecipe = createPayload.reviewedData as Record<string, unknown>;
  if (createOperation.type !== 'create_recipe' || createOperation.targetId !== null || createPayload.expectedVersion !== 0
    || createdRecipe.title !== 'Sunday waffles' || !Array.isArray(createdRecipe.equipmentRequirements)) {
    throw new Error('Recipe create proposal is not canonical');
  }
  const updateOperation = requests[1].operation as Record<string, unknown>;
  const updatePayload = updateOperation.payload as Record<string, unknown>;
  const updatedRecipe = updatePayload.reviewedData as Record<string, unknown>;
  if (updateOperation.type !== 'update_recipe' || updateOperation.targetId !== 'recipe-1' || updatePayload.expectedVersion !== 2
    || updatedRecipe.notes !== 'Use Meyer lemons.' || updatedRecipe.title !== 'Lemon pasta'
    || !Array.isArray(updatePayload.changedFields) || updatePayload.changedFields[0] !== 'notes') {
    throw new Error('Recipe update proposal did not preserve and patch the current version');
  }
  const deleteOperation = requests[2].operation as Record<string, unknown>;
  const deletePayload = deleteOperation.payload as Record<string, unknown>;
  if (deleteOperation.type !== 'delete_recipe' || deleteOperation.targetId !== 'recipe-1' || deletePayload.expectedVersion !== 2) {
    throw new Error('Recipe delete proposal is not version-bound');
  }
});

Deno.test('server food controls hand import acquisition to the device and stage exact-draft approval', async () => {
  const prepare = await executeServerFoodTool({ ...common,
    call: { id: 'import-prepare', toolId: 'recipes.import.prepare', arguments: {
      method: 'photo', sourceArtifactRefs: ['attachment-1'],
    } }, stageDeviceAction: async () => undefined,
  });
  if (prepare?.status !== 'pending_client_action' || prepare.provider !== 'device'
    || prepare.request.actionType !== 'open_recipe_import') throw new Error('Recipe import acquisition was not handed off');
  const requests: Record<string, unknown>[] = [];
  const approve = await executeServerFoodTool({ ...common,
    call: { id: 'import-approve', toolId: 'recipes.import.approve', arguments: {
      draftId: 'draft-1', expectedDraftVersion: 2, idempotencyKey: 'approval-request-1',
      reviewedVersion: { title: 'Grandma soup', ingredients: ['1 onion'], instructions: ['Simmer in a Dutch oven.'] },
    } }, stageProposal: async (input) => { requests.push(input as unknown as Record<string, unknown>); return { id: 'proposal-import' } as never; },
  });
  if (approve?.status !== 'proposed') throw new Error('Recipe import approval proposal missing');
  const operation = requests[0].operation as Record<string, unknown>;
  const payload = operation.payload as Record<string, unknown>;
  const reviewed = payload.reviewedData as Record<string, unknown>;
  const provenance = reviewed.provenance as Record<string, unknown>;
  if (operation.type !== 'recipes.import.approve' || operation.targetId !== 'draft-1' || payload.expectedVersion !== 2
    || payload.approvalIdempotencyKey !== 'approval-request-1' || provenance.method !== 'photo'
    || provenance.rightsBasis !== 'private_user_import') throw new Error('Recipe import proposal lost draft provenance');
});

Deno.test('server food controls refuse stale or unavailable Recipe import drafts', async () => {
  const stageProposal = async () => ({ id: 'proposal' } as never);
  const stale = await executeServerFoodTool({ ...common,
    call: { id: 'import-stale', toolId: 'recipes.import.approve', arguments: {
      draftId: 'draft-1', expectedDraftVersion: 1, idempotencyKey: 'approval-request-1',
      reviewedVersion: { title: 'Soup', ingredients: ['onion'], instructions: ['Cook.'] },
    } }, stageProposal,
  });
  const absent = await executeServerFoodTool({ ...common,
    call: { id: 'import-absent', toolId: 'recipes.import.approve', arguments: {
      draftId: 'draft-other', expectedDraftVersion: 1, idempotencyKey: 'approval-request-2',
      reviewedVersion: { title: 'Soup', ingredients: ['onion'], instructions: ['Cook.'] },
    } }, stageProposal,
  });
  if (stale?.status !== 'failed' || stale.code !== 'recipe_import_version_stale') throw new Error('stale Recipe import accepted');
  if (absent?.status !== 'refused') throw new Error('unavailable Recipe import exposed');
});

Deno.test('server food controls read, propose, and directly advance exact Cook Sessions', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageProposal = async (input: unknown) => { requests.push(input as Record<string, unknown>); return { id: `proposal-${requests.length}` } as never; };
  const read = await executeServerFoodTool({ ...common,
    call: { id: 'cook-read', toolId: 'cook_session.read', arguments: { sessionId: 'session-1' } },
  });
  const start = await executeServerFoodTool({ ...common,
    call: { id: 'cook-start', toolId: 'cook_session.start', arguments: { recipeVersionId: 'version-1', recipeScaleMultiplier: 2 } }, stageProposal,
  });
  const control = await executeServerFoodTool({ ...common,
    call: { id: 'cook-next', toolId: 'cook_session.control', arguments: {
      sessionId: 'session-1', expectedRevision: 2, command: { type: 'next' },
    } },
  });
  const complete = await executeServerFoodTool({ ...common,
    call: { id: 'cook-complete', toolId: 'cook_session.complete', arguments: {
      sessionId: 'session-1', expectedRevision: 2, outcome: 'completed',
    } }, stageProposal,
  });
  if (read?.status !== 'completed' || (read.output.session as Record<string, unknown>).revision !== 2) throw new Error('Cook Session read failed');
  if (start?.status !== 'proposed' || complete?.status !== 'proposed') throw new Error('Cook proposal missing');
  if (control?.status !== 'completed' || (control.output.session as Record<string, unknown>).revision !== 3) throw new Error('Cook control failed');
  const startOperation = requests[0].operation as Record<string, unknown>;
  const completeOperation = requests[1].operation as Record<string, unknown>;
  if (startOperation.type !== 'cook_session.start' || completeOperation.type !== 'cook_session.complete') throw new Error('wrong Cook proposal');
});

Deno.test('server food controls refuse stale Cook progress and hand native timers to the device', async () => {
  const stale = await executeServerFoodTool({ ...common,
    call: { id: 'cook-stale', toolId: 'cook_session.control', arguments: {
      sessionId: 'session-1', expectedRevision: 1, command: { type: 'next' },
    } },
  });
  const actions: Record<string, unknown>[] = [];
  const timer = await executeServerFoodTool({ ...common,
    call: { id: 'cook-timer', toolId: 'cook_session.control', arguments: {
      sessionId: 'session-1', expectedRevision: 2,
      command: { type: 'start_timer', cueId: 'cue-1', timerId: 'timer-1', durationSeconds: 300, label: 'Bake' },
    } }, stageDeviceAction: async (request) => { actions.push(request as unknown as Record<string, unknown>); },
  });
  if (stale?.status !== 'failed' || stale.code !== 'cook_session_revision_stale') throw new Error('stale Cook control accepted');
  if (timer?.status !== 'pending_client_action' || actions[0].actionType !== 'open_cook_session_timer') throw new Error('Cook timer was not handed off');
});

Deno.test('server food controls reject stale, invalid, and catalog Recipe mutations', async () => {
  const stageProposal = async () => ({ id: 'proposal' } as never);
  const stale = await executeServerFoodTool({ ...common,
    call: { id: 'stale', toolId: 'recipes.update', arguments: {
      recipeId: 'recipe-1', expectedVersion: 1, reviewedVersion: { notes: 'stale' },
    } }, stageProposal,
  });
  const invalid = await executeServerFoodTool({ ...common,
    call: { id: 'invalid', toolId: 'recipes.create', arguments: { recipe: { title: 'Incomplete', ingredients: [], instructions: [] } } }, stageProposal,
  });
  const catalogClient = { rpc: async () => ({ data: { ...snapshot, recipes: [{ ...snapshot.recipes[0],
    ownershipKind: 'catalog', provenance: { ...snapshot.recipes[0].provenance, method: 'catalog', rightsBasis: 'kwilt_authored' },
  }] }, error: null }) };
  const catalog = await executeServerFoodTool({ client: catalogClient, userId: 'user-1',
    call: { id: 'catalog', toolId: 'recipes.delete', arguments: { recipeId: 'recipe-1', expectedVersion: 2 } }, stageProposal,
  });
  if (stale?.status !== 'failed' || stale.code !== 'recipe_version_stale') throw new Error('stale Recipe update accepted');
  if (invalid?.status !== 'failed' || invalid.code !== 'invalid_recipe') throw new Error('invalid Recipe create accepted');
  if (catalog?.status !== 'failed' || catalog.code !== 'recipe_not_deletable') throw new Error('catalog Recipe delete accepted');
});

Deno.test('server food controls stage exact-state recipe preference proposals', async () => {
  const requests: Record<string, unknown>[] = [];
  const result = await executeServerFoodTool({ ...common,
    call: { id: 'call-2', toolId: 'recipes.favorite.update', arguments: { recipeId: 'recipe-1', expectedVersion: 1, favorite: false } },
    stageProposal: async (input) => { requests.push(input as unknown as Record<string, unknown>); return { id: 'proposal-1' } as never; },
  });
  if (result?.status !== 'proposed' || requests.length !== 1) throw new Error('recipe proposal missing');
  const operation = requests[0].operation as Record<string, unknown>;
  if (operation.type !== 'recipes.favorite.update' || operation.targetId !== 'recipe-1') throw new Error('wrong recipe proposal');
});

Deno.test('server food controls reject stale recipe and meal versions', async () => {
  const recipe = await executeServerFoodTool({ ...common,
    call: { id: 'call-3', toolId: 'recipes.visibility.update', arguments: { recipeId: 'recipe-1', expectedVersion: 1, visibility: 'hidden' } },
    stageProposal: async () => ({ id: 'proposal' } as never),
  });
  if (recipe?.status !== 'refused') throw new Error('stale recipe preference accepted');
  const meal = await executeServerFoodTool({ ...common,
    call: { id: 'call-4', toolId: 'meal_planning.preferences.update', arguments: { expectedVersion: 2, fields: { usualDinerCount: 5 } } },
    stageProposal: async () => ({ id: 'proposal' } as never),
  });
  if (meal?.status !== 'refused') throw new Error('stale meal preferences accepted');
});

Deno.test('server food controls refuse unsupported payloads and missing household authority', async () => {
  const invalid = await executeServerFoodTool({ ...common,
    call: { id: 'call-5', toolId: 'meal_planning.preferences.update', arguments: { expectedVersion: 3, fields: {} } },
    stageProposal: async () => ({ id: 'proposal' } as never),
  });
  if (invalid?.status !== 'failed') throw new Error('empty meal patch accepted');
  const noHousehold = { rpc: async () => ({ data: { ...snapshot, mealPreferences: null }, error: null }) };
  const denied = await executeServerFoodTool({ client: noHousehold, userId: 'user-1',
    call: { id: 'call-6', toolId: 'meal_planning.preferences.read', arguments: {} },
  });
  if (denied?.status !== 'refused') throw new Error('missing meal authority accepted');
});
