import type { AgentToolDefinition, AgentToolProvider } from './types.ts';

export const FOOD_OPERATION_IDS = [
  'recipes.search',
  'recipes.read',
  'recipes.create',
  'recipes.import.prepare',
  'recipes.import.approve',
  'recipes.update',
  'recipes.scale.preview',
  'recipes.fork',
  'recipes.share_copy.prepare',
  'recipes.collaborator.invite',
  'recipes.publication.prepare',
  'recipes.publication.publish',
  'recipes.publication.attest_rights',
  'recipes.delete',
  'meal_planning.plan.create',
  'meal_planning.plan.update',
  'meal_planning.candidate.add',
  'meal_planning.candidate.remove',
  'meal_planning.round.open',
  'meal_planning.round.close',
  'meal_planning.response.submit',
  'meal_planning.response.withdraw',
  'meal_planning.plan.finalize',
  'meal_planning.plan.revise',
  'meal_planning.candidates.prepare',
  'food_budget.read',
  'food_stock.read',
  'food_stock.observe',
  'food_stock.deplete',
  'groceries.compile',
  'groceries.item.add',
  'groceries.item.update',
  'groceries.item.set_state',
  'groceries.list.review',
  'groceries.product_match.prepare',
  'groceries.product_match.confirm',
  'groceries.handoff.prepare',
  'groceries.handoff.open',
  'groceries.checkout',
  'groceries.payment',
  'store_opportunity.capture',
  'food_scenario.prepare',
  'food_scenario.accept',
  'savings.review',
  'savings.accept',
  'savings.coupon.apply_unsupported',
  'savings.coupon.open',
  'receipt.extract',
  'receipt.reconcile',
  'cook_session.read',
  'cook_session.start',
  'cook_session.control',
  'cook_session.complete',
] as const;

export type FoodOperationId = typeof FOOD_OPERATION_IDS[number];
export type FoodOperationOwner = 'recipes' | 'meal_planning' | 'groceries' | 'savings';
export type FoodOperationAuthority =
  | 'direct'
  | 'reviewed'
  | 'explicit_consequential'
  | 'native_handoff'
  | 'excluded';

export type FoodOperationContract = {
  id: FoodOperationId;
  owner: FoodOperationOwner;
  purpose: string;
  authority: FoodOperationAuthority;
  effect: 'read' | 'write';
  consequence: 'low' | 'consequential';
  reversible: boolean;
  confirmation: 'none' | 'explicit' | 'native';
  providers: readonly AgentToolProvider[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  sourceRefs: readonly string[];
  boundaryReason: string;
};

const STRING_ID = { type: 'string', minLength: 1, maxLength: 160 } as const;
const VERSION = { type: 'integer', minimum: 1 } as const;
const EMPTY = { type: 'object', properties: {}, additionalProperties: false } as const;
// These operations remain pending_provider. Keep their placeholder payload closed until the
// capability-owned handler lands with the exact reviewed domain schema.
const PENDING_STRUCTURED_INPUT = EMPTY;
const RESULT = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['completed', 'proposed', 'pending_client_action', 'unavailable'] },
    resourceId: { type: ['string', 'null'] },
    effectiveVersion: { type: ['integer', 'null'], minimum: 1 },
    receiptId: { type: ['string', 'null'] },
  },
  required: ['status'],
  additionalProperties: false,
} as const;

const RECIPE_CHAT_FIELDS = {
  title: { type: 'string', minLength: 1, maxLength: 160 },
  description: { type: ['string', 'null'], maxLength: 4_000 },
  yieldQuantity: { type: ['number', 'null'], minimum: 0 },
  yieldUnit: { type: ['string', 'null'], maxLength: 80 },
  prepMinutes: { type: ['integer', 'null'], minimum: 0, maximum: 100_000 },
  cookMinutes: { type: ['integer', 'null'], minimum: 0, maximum: 100_000 },
  notes: { type: ['string', 'null'], maxLength: 20_000 },
  ingredients: {
    type: 'array', minItems: 1, maxItems: 200,
    items: { type: 'string', minLength: 1, maxLength: 1_000 },
  },
  instructions: {
    type: 'array', minItems: 1, maxItems: 200,
    items: { type: 'string', minLength: 1, maxLength: 8_000 },
  },
} as const;

const RECIPE_CHAT_DRAFT = {
  type: 'object', properties: RECIPE_CHAT_FIELDS,
  required: ['title', 'ingredients', 'instructions'], additionalProperties: false,
} as const;

const RECIPE_CHAT_PATCH = {
  type: 'object', properties: RECIPE_CHAT_FIELDS,
  minProperties: 1, additionalProperties: false,
} as const;

function objectSchema(
  properties: Record<string, unknown>,
  required: readonly string[] = [],
): Record<string, unknown> {
  return { type: 'object', properties, required, additionalProperties: false };
}

function targetSchema(key: string, extras: Record<string, unknown> = {}, requiredExtras: readonly string[] = []): Record<string, unknown> {
  return objectSchema({ [key]: STRING_ID, ...extras }, [key, ...requiredExtras]);
}

function makeContract(input: Omit<FoodOperationContract, 'consequence' | 'confirmation' | 'boundaryReason'> & {
  boundaryReason?: string;
}): FoodOperationContract {
  const consequence = input.authority === 'explicit_consequential' || input.authority === 'native_handoff' || input.authority === 'excluded'
    ? 'consequential'
    : 'low';
  const confirmation = input.authority === 'direct'
    ? 'none'
    : input.authority === 'native_handoff' || input.authority === 'excluded'
      ? 'native'
      : 'explicit';
  return {
    ...input,
    consequence,
    confirmation,
    boundaryReason: input.boundaryReason ?? 'The capability executor, review, receipt, and exact return path are not implemented yet.',
  };
}

export const FOOD_OPERATION_CONTRACTS: readonly FoodOperationContract[] = [
  makeContract({ id: 'recipes.search', owner: 'recipes', purpose: 'Search authorized private and published Recipe projections without expanding access.', authority: 'direct', effect: 'read', reversible: true, providers: ['device', 'server'], inputSchema: objectSchema({ query: { type: 'string', minLength: 1, maxLength: 500 }, limit: { type: 'integer', minimum: 1, maximum: 50 } }, ['query']), outputSchema: RESULT, sourceRefs: ['capability:recipes'] }),
  makeContract({ id: 'recipes.read', owner: 'recipes', purpose: 'Read one authorized Recipe and exact immutable version without exposing unrelated private content.', authority: 'direct', effect: 'read', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('recipeId', { recipeVersionId: { type: ['string', 'null'] } }), outputSchema: RESULT, sourceRefs: ['capability:recipes'] }),
  makeContract({ id: 'recipes.create', owner: 'recipes', purpose: 'Create one reviewed private Recipe identity and immutable first version.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: objectSchema({ recipe: RECIPE_CHAT_DRAFT }, ['recipe']), outputSchema: RESULT, sourceRefs: ['domain:recipeContracts'] }),
  makeContract({ id: 'recipes.import.prepare', owner: 'recipes', purpose: 'Prepare an evidence-backed temporary Recipe import draft from user-supplied artifacts.', authority: 'direct', effect: 'write', reversible: true, providers: ['device', 'server', 'connector'], inputSchema: objectSchema({ method: { type: 'string', enum: ['url', 'photo', 'scan', 'text', 'voice', 'email'] }, sourceArtifactRefs: { type: 'array', minItems: 1, maxItems: 20, items: STRING_ID } }, ['method', 'sourceArtifactRefs']), outputSchema: RESULT, sourceRefs: ['domain:recipeImportContracts'] }),
  makeContract({ id: 'recipes.import.approve', owner: 'recipes', purpose: 'Approve one reviewed Recipe import draft idempotently into canonical private content.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('draftId', { expectedDraftVersion: VERSION, idempotencyKey: STRING_ID, reviewedRecipe: PENDING_STRUCTURED_INPUT, reviewedVersion: PENDING_STRUCTURED_INPUT }, ['expectedDraftVersion', 'idempotencyKey', 'reviewedRecipe', 'reviewedVersion']), outputSchema: RESULT, sourceRefs: ['domain:recipeImportContracts'] }),
  makeContract({ id: 'recipes.update', owner: 'recipes', purpose: 'Create a reviewed immutable Recipe version using optimistic version authority.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('recipeId', { expectedVersion: VERSION, reviewedVersion: RECIPE_CHAT_PATCH }, ['expectedVersion', 'reviewedVersion']), outputSchema: RESULT, sourceRefs: ['domain:recipeContracts'] }),
  makeContract({ id: 'recipes.scale.preview', owner: 'recipes', purpose: 'Preview deterministic serving scaling without mutating original ingredient text.', authority: 'direct', effect: 'read', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('recipeVersionId', { targetYield: { type: 'number', exclusiveMinimum: 0 } }, ['targetYield']), outputSchema: RESULT, sourceRefs: ['domain:recipeContracts'] }),
  makeContract({ id: 'recipes.fork', owner: 'recipes', purpose: 'Prepare an independently owned reviewed Recipe fork with immutable lineage and credits.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('sourceRecipeVersionId', { idempotencyKey: STRING_ID }, ['idempotencyKey']), outputSchema: RESULT, sourceRefs: ['domain:recipePublicationContracts'] }),
  makeContract({ id: 'recipes.share_copy.prepare', owner: 'recipes', purpose: 'Prepare one attributed independent Recipe copy offer for a specifically selected person.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server', 'channel'], inputSchema: targetSchema('recipeVersionId', { recipientPersonId: STRING_ID }, ['recipientPersonId']), outputSchema: RESULT, sourceRefs: ['capability:recipes'] }),
  makeContract({ id: 'recipes.collaborator.invite', owner: 'recipes', purpose: 'Invite one selected person to one private Recipe with an explicit bounded collaboration role.', authority: 'explicit_consequential', effect: 'write', reversible: true, providers: ['device', 'server', 'channel'], inputSchema: targetSchema('recipeId', { recipientPersonId: STRING_ID, role: { type: 'string', enum: ['viewer', 'contributor', 'maintainer'] } }, ['recipientPersonId', 'role']), outputSchema: RESULT, sourceRefs: ['domain:recipePublicationContracts'] }),
  makeContract({ id: 'recipes.publication.prepare', owner: 'recipes', purpose: 'Prepare public metadata and an exact version preview without attesting rights or publishing.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('recipeVersionId', { publicProfileId: STRING_ID, distributionScopes: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string' } } }, ['publicProfileId', 'distributionScopes']), outputSchema: RESULT, sourceRefs: ['domain:recipePublicationContracts'] }),
  makeContract({ id: 'recipes.publication.publish', owner: 'recipes', purpose: 'Publish one exact reviewed Recipe version under an opted-in public creator identity.', authority: 'explicit_consequential', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('publicationId', { confirmedVersionId: STRING_ID, confirmedScopes: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string' } }, expectedVersion: VERSION }, ['confirmedVersionId', 'confirmedScopes', 'expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:recipePublicationContracts'] }),
  makeContract({ id: 'recipes.publication.attest_rights', owner: 'recipes', purpose: 'Represent content and media rights attestation that only the authorized person may make.', authority: 'excluded', effect: 'write', reversible: false, providers: ['device'], inputSchema: targetSchema('publicationId'), outputSchema: RESULT, sourceRefs: ['domain:recipePublicationContracts'], boundaryReason: 'AI cannot infer or attest content or media rights; the person must complete the native rights review.' }),
  makeContract({ id: 'recipes.delete', owner: 'recipes', purpose: 'Soft-delete one private Recipe after reviewing dependent versions, plans, copies, and publications.', authority: 'explicit_consequential', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('recipeId', { expectedVersion: VERSION }, ['expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:recipeContracts'] }),

  makeContract({ id: 'meal_planning.plan.create', owner: 'meal_planning', purpose: 'Create one reviewed flexible-horizon Meal Plan for the current organizer.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: objectSchema({ horizon: PENDING_STRUCTURED_INPUT, idempotencyKey: STRING_ID }, ['horizon', 'idempotencyKey']), outputSchema: RESULT, sourceRefs: ['capability:meal-planning', 'domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.plan.update', owner: 'meal_planning', purpose: 'Update one draft Meal Plan through optimistic reviewed version authority.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('mealPlanId', { expectedVersion: VERSION, patch: PENDING_STRUCTURED_INPUT }, ['expectedVersion', 'patch']), outputSchema: RESULT, sourceRefs: ['domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.candidate.add', owner: 'meal_planning', purpose: 'Add one reviewed Recipe snapshot or meal note candidate to a draft Meal Plan.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('mealPlanId', { expectedVersion: VERSION, candidate: PENDING_STRUCTURED_INPUT }, ['expectedVersion', 'candidate']), outputSchema: RESULT, sourceRefs: ['domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.candidate.remove', owner: 'meal_planning', purpose: 'Remove one reviewed candidate from a draft Meal Plan without altering its source Recipe.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('mealPlanId', { candidateId: STRING_ID, expectedVersion: VERSION }, ['candidateId', 'expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.round.open', owner: 'meal_planning', purpose: 'Open one bounded family choice round for explicitly selected eligible participants.', authority: 'explicit_consequential', effect: 'write', reversible: true, providers: ['device', 'server', 'channel'], inputSchema: targetSchema('mealPlanId', { participantPersonIds: { type: 'array', minItems: 1, maxItems: 20, items: STRING_ID }, expectedVersion: VERSION }, ['participantPersonIds', 'expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.round.close', owner: 'meal_planning', purpose: 'Close one family choice round and preserve its authorized aggregate without exposing private notes.', authority: 'explicit_consequential', effect: 'write', reversible: true, providers: ['device', 'server', 'channel'], inputSchema: targetSchema('choiceRoundId', { expectedVersion: VERSION }, ['expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.response.submit', owner: 'meal_planning', purpose: 'Submit the current participant own bounded choice response to one open round.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server', 'channel'], inputSchema: targetSchema('choiceRoundId', { candidateIds: { type: 'array', maxItems: 3, items: STRING_ID }, pass: { type: 'boolean' }, suggestion: { type: ['string', 'null'], maxLength: 320 }, expectedVersion: VERSION }, ['candidateIds', 'pass', 'expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.response.withdraw', owner: 'meal_planning', purpose: 'Withdraw the current participant own response while the choice round remains open.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server', 'channel'], inputSchema: targetSchema('choiceRoundId', { expectedVersion: VERSION }, ['expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.plan.finalize', owner: 'meal_planning', purpose: 'Finalize one reviewed Meal Plan version under organizer authority.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('mealPlanId', { expectedVersion: VERSION, selectedEntries: { type: 'array', minItems: 1, maxItems: 60, items: PENDING_STRUCTURED_INPUT } }, ['expectedVersion', 'selectedEntries']), outputSchema: RESULT, sourceRefs: ['domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.plan.revise', owner: 'meal_planning', purpose: 'Reopen one finalized Meal Plan as a new version and mark derived Grocery lists stale.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('mealPlanId', { expectedVersion: VERSION }, ['expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:mealPlanContracts'] }),
  makeContract({ id: 'meal_planning.candidates.prepare', owner: 'meal_planning', purpose: 'Prepare up to three budget, stock, gap, cadence, and household-aware Meal candidates without mutating a plan.', authority: 'direct', effect: 'read', reversible: true, providers: ['device','server'], inputSchema: objectSchema({ horizon: PENDING_STRUCTURED_INPUT, constraints: PENDING_STRUCTURED_INPUT },['horizon']), outputSchema: RESULT, sourceRefs:['domain:mealCandidatePreparation'] }),
  makeContract({ id: 'food_budget.read', owner: 'savings', purpose: 'Read an authorized Money-derived food category projection and Groceries trip target without claiming cash safety.', authority: 'direct', effect: 'read', reversible: true, providers:['device'], inputSchema: EMPTY, outputSchema: RESULT, sourceRefs:['domain:foodBudgetProjection'] }),
  makeContract({ id: 'food_stock.read', owner: 'groceries', purpose: 'Read owner-only current stock observations with freshness, confidence, and confirmed versus likely state intact.', authority: 'direct', effect:'read', reversible:true, providers:['device','server'], inputSchema:objectSchema({concepts:{type:'array',maxItems:100,items:STRING_ID}}), outputSchema:RESULT, sourceRefs:['domain:foodStockContracts'] }),
  makeContract({ id: 'food_stock.observe', owner: 'groceries', purpose: 'Prepare or record one reviewed owner-only stock observation without promoting receipt evidence to confirmed stock.', authority:'reviewed', effect:'write', reversible:true, providers:['device','server'], inputSchema:objectSchema({observation:PENDING_STRUCTURED_INPUT,expectedObservationId:{type:['string','null']}},['observation']), outputSchema:RESULT, sourceRefs:['domain:foodStockContracts'] }),
  makeContract({ id: 'food_stock.deplete', owner: 'groceries', purpose: 'Record reviewed depletion evidence for one stock concept without inferring consumption or food safety from age.', authority:'reviewed', effect:'write', reversible:true, providers:['device','server'], inputSchema:objectSchema({concept:STRING_ID,supersedesObservationId:{type:['string','null']}},['concept']), outputSchema:RESULT, sourceRefs:['domain:foodStockContracts'] }),

  makeContract({ id: 'groceries.compile', owner: 'groceries', purpose: 'Compile one finalized Meal Plan into a provenance-preserving deterministic Grocery list draft.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('mealPlanId', { mealPlanVersion: VERSION, idempotencyKey: STRING_ID }, ['mealPlanVersion', 'idempotencyKey']), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'] }),
  makeContract({ id:'groceries.item.add',owner:'groceries',purpose:'Add one reviewed manual staple or household request with distinct provenance to the current Grocery list.',authority:'reviewed',effect:'write',reversible:true,providers:['device','server'],inputSchema:targetSchema('groceryListId',{expectedVersion:VERSION,title:STRING_ID,sourceKind:{type:'string',enum:['manual','household_request']}},['expectedVersion','title','sourceKind']),outputSchema:RESULT,sourceRefs:['domain:groceryContracts'] }),
  makeContract({ id: 'groceries.item.update', owner: 'groceries', purpose: 'Correct one Grocery item quantity, unit, concept, or display text while preserving source evidence.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('groceryItemId', { expectedVersion: VERSION, patch: PENDING_STRUCTURED_INPUT }, ['expectedVersion', 'patch']), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'] }),
  makeContract({ id: 'groceries.item.set_state', owner: 'groceries', purpose: 'Set one Grocery item to needed, already-have, purchased, or removed after review.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('groceryItemId', { state: { type: 'string', enum: ['needed', 'already_have', 'purchased', 'removed'] }, expectedVersion: VERSION }, ['state', 'expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'] }),
  makeContract({ id: 'groceries.list.review', owner: 'groceries', purpose: 'Read one Grocery list with ingredient provenance, uncertainty, and current evidence states.', authority: 'direct', effect: 'read', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('groceryListId'), outputSchema: RESULT, sourceRefs: ['capability:groceries'] }),
  makeContract({ id: 'groceries.product_match.prepare', owner: 'groceries', purpose: 'Prepare retailer product match candidates with freshness and tradeoff evidence.', authority: 'direct', effect: 'read', reversible: true, providers: ['device', 'server', 'connector'], inputSchema: targetSchema('groceryItemId', { provider: STRING_ID, locationId: STRING_ID }, ['provider', 'locationId']), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'] }),
  makeContract({ id: 'groceries.product_match.confirm', owner: 'groceries', purpose: 'Confirm one retailer product mapping after explicit product and substitution review.', authority: 'explicit_consequential', effect: 'write', reversible: true, providers: ['device', 'server', 'connector'], inputSchema: targetSchema('groceryItemId', { provider: STRING_ID, retailerProductId: STRING_ID, evidenceObservedAt: { type: 'string', format: 'date-time' } }, ['provider', 'retailerProductId', 'evidenceObservedAt']), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'] }),
  makeContract({ id: 'groceries.handoff.prepare', owner: 'groceries', purpose: 'Prepare an idempotent reviewed retailer handoff from confirmed Grocery list content.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server', 'connector'], inputSchema: targetSchema('groceryListId', { provider: STRING_ID, idempotencyKey: STRING_ID }, ['provider', 'idempotencyKey']), outputSchema: RESULT, sourceRefs: ['capability:groceries'] }),
  makeContract({ id: 'groceries.handoff.open', owner: 'groceries', purpose: 'Open the provider-owned product review and checkout destination without claiming an order.', authority: 'native_handoff', effect: 'write', reversible: true, providers: ['device', 'connector'], inputSchema: targetSchema('retailerHandoffId'), outputSchema: RESULT, sourceRefs: ['capability:groceries'], boundaryReason: 'The retailer owns account state, substitutions, delivery slot, payment, checkout, fulfillment, and order support.' }),
  makeContract({ id: 'groceries.checkout', owner: 'groceries', purpose: 'Represent retailer checkout that Kwilt cannot complete or claim without provider order authority.', authority: 'excluded', effect: 'write', reversible: false, providers: ['connector'], inputSchema: targetSchema('retailerHandoffId'), outputSchema: RESULT, sourceRefs: ['capability:groceries'], boundaryReason: 'Checkout remains retailer-owned; Kwilt can only open a reviewed handoff.' }),
  makeContract({ id: 'groceries.payment', owner: 'groceries', purpose: 'Represent grocery payment that Kwilt does not autonomously execute.', authority: 'excluded', effect: 'write', reversible: false, providers: ['connector'], inputSchema: targetSchema('retailerHandoffId'), outputSchema: RESULT, sourceRefs: ['capability:groceries'], boundaryReason: 'Payment remains retailer-owned and requires the retailer native confirmation.' }),
  makeContract({ id:'store_opportunity.capture',owner:'groceries',purpose:'Capture user-supplied sale evidence as an immutable Store Opportunity without changing meals, stock, or groceries.',authority:'reviewed',effect:'write',reversible:true,providers:['device','server'],inputSchema:objectSchema({opportunity:PENDING_STRUCTURED_INPUT},['opportunity']),outputSchema:RESULT,sourceRefs:['domain:foodScenarioContracts'] }),
  makeContract({ id:'food_scenario.prepare',owner:'groceries',purpose:'Prepare at most three version-bound household scenarios from current plan, grocery, stock, budget, price, waste, and burden evidence.',authority:'direct',effect:'read',reversible:true,providers:['device','server'],inputSchema:objectSchema({baseline:PENDING_STRUCTURED_INPUT,opportunityIds:{type:'array',maxItems:20,items:STRING_ID}},['baseline']),outputSchema:RESULT,sourceRefs:['domain:foodScenarioContracts'] }),
  makeContract({ id:'food_scenario.accept',owner:'groceries',purpose:'Accept one reviewed consequential scenario as version-checked capability-owned operations with explicit partial recovery.',authority:'explicit_consequential',effect:'write',reversible:true,providers:['device','server'],inputSchema:targetSchema('scenarioId',{expectedVersion:VERSION},['expectedVersion']),outputSchema:RESULT,sourceRefs:['domain:foodScenarioContracts'] }),

  makeContract({ id: 'savings.review', owner: 'savings', purpose: 'Review current price and offer evidence with deterministic basket economics and freshness.', authority: 'direct', effect: 'read', reversible: true, providers: ['device', 'server', 'connector'], inputSchema: targetSchema('groceryListId', { provider: STRING_ID, locationId: STRING_ID }, ['provider', 'locationId']), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'] }),
  makeContract({ id: 'savings.accept', owner: 'savings', purpose: 'Accept one immutable evidence-backed Savings Plan after reviewing substitutions and tradeoffs.', authority: 'explicit_consequential', effect: 'write', reversible: true, providers: ['device', 'server', 'connector'], inputSchema: targetSchema('savingsPlanId', { expectedVersion: VERSION }, ['expectedVersion']), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'] }),
  makeContract({ id: 'savings.coupon.apply_unsupported', owner: 'savings', purpose: 'Represent coupon application when no provider supplies activation authority and acknowledgement.', authority: 'excluded', effect: 'write', reversible: false, providers: ['connector'], inputSchema: targetSchema('offerId'), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'], boundaryReason: 'Kwilt may show evidence or an official handoff but cannot say applied without provider activation acknowledgement.' }),
  makeContract({ id:'savings.coupon.open',owner:'savings',purpose:'Open an official coupon or retailer activation destination while preserving eligible versus activated evidence.',authority:'native_handoff',effect:'write',reversible:true,providers:['device','connector'],inputSchema:targetSchema('offerId'),outputSchema:RESULT,sourceRefs:['domain:savingsContracts'],boundaryReason:'The retailer owns membership, eligibility, activation, and acknowledgement; Kwilt can only open the reviewed destination.' }),
  makeContract({ id: 'receipt.extract', owner: 'groceries', purpose: 'Extract a temporary source-grounded receipt draft without claiming reconciliation or realized savings.', authority: 'direct', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: objectSchema({ sourceArtifactRefs: { type: 'array', minItems: 1, maxItems: 20, items: STRING_ID } }, ['sourceArtifactRefs']), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'] }),
  makeContract({ id: 'receipt.reconcile', owner: 'groceries', purpose: 'Reconcile reviewed receipt lines to Grocery evidence before computing itemized realized outcomes.', authority: 'reviewed', effect: 'write', reversible: true, providers: ['device', 'server'], inputSchema: targetSchema('receiptDraftId', { expectedVersion: VERSION, reviewedMatches: { type: 'array', maxItems: 500, items: PENDING_STRUCTURED_INPUT } }, ['expectedVersion', 'reviewedMatches']), outputSchema: RESULT, sourceRefs: ['domain:groceryContracts'] }),
  makeContract({ id:'cook_session.read',owner:'recipes',purpose:'Read the owner current exact-version Cook Session and one current cue without exposing unrelated Recipe content.',authority:'direct',effect:'read',reversible:true,providers:['device','server'],inputSchema:targetSchema('sessionId'),outputSchema:RESULT,sourceRefs:['domain:recipeCookContracts'] }),
  makeContract({ id:'cook_session.start',owner:'recipes',purpose:'Start one reviewed exact-version Cook Session after readiness and recipe size are confirmed.',authority:'reviewed',effect:'write',reversible:true,providers:['device','server'],inputSchema:targetSchema('recipeVersionId',{recipeScaleMultiplier:{type:'integer',enum:[1,2,3]}},['recipeScaleMultiplier']),outputSchema:RESULT,sourceRefs:['domain:recipeCookContracts'] }),
  makeContract({ id:'cook_session.control',owner:'recipes',purpose:'Apply deterministic next, back, repeat, pause, resume, or timer control to the current Cook Session.',authority:'direct',effect:'write',reversible:true,providers:['device','server'],inputSchema:targetSchema('sessionId',{expectedRevision:VERSION,command:PENDING_STRUCTURED_INPUT},['expectedRevision','command']),outputSchema:RESULT,sourceRefs:['domain:recipeCookContracts'] }),
  makeContract({ id:'cook_session.complete',owner:'recipes',purpose:'Complete or abandon the current Cook Session and prepare optional private learning for explicit review.',authority:'reviewed',effect:'write',reversible:true,providers:['device','server'],inputSchema:targetSchema('sessionId',{expectedRevision:VERSION,outcome:{type:'string',enum:['completed','abandoned']}},['expectedRevision','outcome']),outputSchema:RESULT,sourceRefs:['domain:recipeCookContracts'] }),
];

const contractIds = new Set(FOOD_OPERATION_CONTRACTS.map((contract) => contract.id));
if (contractIds.size !== FOOD_OPERATION_IDS.length || FOOD_OPERATION_IDS.some((id) => !contractIds.has(id))) {
  throw new Error('Food operation contract catalog does not match FOOD_OPERATION_IDS.');
}

export const FOOD_TOOL_CONTRACTS: readonly AgentToolDefinition[] = FOOD_OPERATION_CONTRACTS
  .filter((contract) => contract.authority !== 'excluded')
  .map((contract) => ({
    id: contract.id,
    version: 1,
    capabilityId: contract.owner,
    purpose: contract.purpose,
    providers: contract.providers,
    effect: contract.effect,
    consequence: contract.consequence,
    reversible: contract.reversible,
    confirmation: contract.confirmation === 'none' ? 'none' : 'explicit',
    canDeferToClient: contract.authority === 'native_handoff',
    inputSchema: contract.inputSchema,
    outputSchema: contract.outputSchema,
  }));
