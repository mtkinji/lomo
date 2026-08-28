import type {
  ServerAgentProposalRecord,
  ServerAgentProposalRequest,
  ServerAgentToolCall,
  ServerAgentToolResult,
} from './agentRuntime.ts';
import type { ServerDeviceActionRequest } from './serverDeviceHandoffs.ts';
import { deriveSpecializedRecipeEquipment } from '../../../src/capabilities/recipes/domain/recipeEquipment.ts';
import { parseReviewedMealPlanOccasions } from '../../../src/capabilities/meal-planning/domain/mealPlanFinalization.ts';
import { prepareMealCandidates, selectMealPlanStarterCandidates, type MealCandidateQuery } from '../../../src/capabilities/meal-planning/domain/mealCandidatePreparation.ts';
import { executeServerGroceryTool, SERVER_GROCERY_TOOL_IDS } from './serverGroceryTools.ts';
import { mealPlanHorizon, mealPlanRecipeCandidate, validMealFields } from './serverMealPlanValidation.ts';

type QueryResult = { data: unknown; error: unknown };
type FoodClient = { rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<QueryResult> };
const TOOL_IDS = new Set([
  'recipes.search', 'recipes.read', 'recipes.create', 'recipes.import.prepare', 'recipes.import.approve',
  'recipes.update', 'recipes.delete', 'recipes.scale.preview', 'recipes.fork', 'recipes.share_copy.prepare', 'recipes.collaborator.invite',
  'recipes.publication.prepare', 'recipes.publication.publish',
  'cook_session.read', 'cook_session.start', 'cook_session.control', 'cook_session.complete',
  'recipes.favorite.update', 'recipes.visibility.update',
  'meal_planning.preferences.read', 'meal_planning.preferences.update',
  'meal_planning.plan.create', 'meal_planning.plan.update',
  'meal_planning.candidate.add', 'meal_planning.candidate.remove',
  'meal_planning.round.open', 'meal_planning.round.close',
  'meal_planning.response.submit', 'meal_planning.response.withdraw',
  'meal_planning.plan.finalize', 'meal_planning.plan.revise',
  'meal_planning.candidates.prepare',
  ...SERVER_GROCERY_TOOL_IDS,
  'store_opportunity.capture', 'food_scenario.prepare', 'food_scenario.accept',
  'savings.review', 'savings.accept', 'savings.coupon.open', 'receipt.extract', 'receipt.reconcile',
]);
const RECIPE_DRAFT_KEYS = new Set([
  'title', 'description', 'yieldQuantity', 'yieldUnit', 'prepMinutes', 'cookMinutes',
  'notes', 'ingredients', 'instructions',
]);
const RECIPE_PATCH_LABELS: Record<string, string> = {
  title: 'title', description: 'description', yieldQuantity: 'yield', yieldUnit: 'yield unit',
  prepMinutes: 'prep time', cookMinutes: 'cook time', notes: 'notes',
  ingredients: 'ingredients', instructions: 'instructions',
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function nullableText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > max) return undefined;
  return value.trim() || null;
}
function nullableNumber(value: unknown, integer = false): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) return undefined;
  return value;
}
function lines(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value) || value.length > maxItems) return undefined;
  const normalized = value.map((line) => typeof line === 'string' ? line.trim() : '');
  return normalized.every((line) => line.length > 0 && line.length <= maxLength) ? normalized : undefined;
}
function recipeDraft(value: unknown, complete: boolean): Record<string, unknown> | null {
  const input = record(value);
  if (!input || Object.keys(input).some((key) => !RECIPE_DRAFT_KEYS.has(key)) || (!complete && Object.keys(input).length === 0)) return null;
  const title = nullableText(input.title, 160);
  const description = nullableText(input.description, 4_000);
  const yieldQuantity = nullableNumber(input.yieldQuantity);
  const yieldUnit = nullableText(input.yieldUnit, 80);
  const prepMinutes = nullableNumber(input.prepMinutes, true);
  const cookMinutes = nullableNumber(input.cookMinutes, true);
  const notes = nullableText(input.notes, 20_000);
  const ingredients = input.ingredients === undefined ? undefined : lines(input.ingredients, 200, 1_000);
  const instructions = input.instructions === undefined ? undefined : lines(input.instructions, 200, 8_000);
  if ((input.title !== undefined && typeof title !== 'string')
    || (input.description !== undefined && description === undefined)
    || (input.yieldQuantity !== undefined && yieldQuantity === undefined)
    || (input.yieldUnit !== undefined && yieldUnit === undefined)
    || (input.prepMinutes !== undefined && prepMinutes === undefined)
    || (input.cookMinutes !== undefined && cookMinutes === undefined)
    || (input.notes !== undefined && notes === undefined)
    || (input.ingredients !== undefined && ingredients === undefined)
    || (input.instructions !== undefined && instructions === undefined)
    || (complete && (!title || !ingredients?.length || !instructions?.length))) return null;
  return Object.fromEntries(Object.entries({ title, description, yieldQuantity, yieldUnit, prepMinutes, cookMinutes, notes, ingredients, instructions })
    .filter(([, field]) => field !== undefined));
}
function ingredientRows(source: readonly string[], existing?: readonly unknown[]) {
  return source.map((originalText, index) => {
    const current = record(existing?.[index]);
    return {
      id: text(current?.id) ?? `chat-ingredient-${index + 1}`,
      groupLabel: current?.groupLabel ?? null, originalText,
      quantityMin: current?.quantityMin ?? null, quantityMax: current?.quantityMax ?? null,
      unit: current?.unit ?? null, ingredientConcept: current?.ingredientConcept ?? null,
      preparation: current?.preparation ?? null, optional: current?.optional === true,
      parseConfidence: current?.parseConfidence ?? null,
      scaleRule: record(current?.scaleRule) ?? { kind: 'review_required' },
    };
  });
}
function instructionRows(source: readonly string[], existing?: readonly unknown[]) {
  return source.map((stepText, index) => {
    const current = record(existing?.[index]);
    return { id: text(current?.id) ?? `chat-instruction-${index + 1}`, sectionLabel: current?.sectionLabel ?? null, text: stepText };
  });
}
function reviewedRecipeCreate(value: unknown, provenanceInput?: Record<string, unknown>): Record<string, unknown> | null {
  const draft = recipeDraft(value, true);
  const ingredients = draft?.ingredients as string[] | undefined;
  const instructions = draft?.instructions as string[] | undefined;
  if (!draft || !ingredients || !instructions) return null;
  return {
      title: draft.title, description: draft.description ?? null,
      yieldQuantity: draft.yieldQuantity ?? null, yieldUnit: draft.yieldUnit ?? null,
      scalingState: 'review_required', prepMinutes: draft.prepMinutes ?? null,
      cookMinutes: draft.cookMinutes ?? null, notes: draft.notes ?? null,
      ingredients: ingredientRows(ingredients), instructions: instructionRows(instructions),
      equipmentRequirements: deriveSpecializedRecipeEquipment(instructions),
      provenance: provenanceInput ?? { method: 'manual', sourceUrl: null, sourceTitle: null, sourceAuthor: null,
        sourceContentHash: null, rightsBasis: 'user_authored' },
      credits: [], lineage: [],
  };
}
function reviewedRecipeUpdate(recipe: Record<string, unknown>, value: unknown): { reviewedData: Record<string, unknown>; changedFields: string[] } | null {
  const patch = recipeDraft(value, false);
  const version = record(recipe.version); const provenance = record(recipe.provenance);
  if (!patch || !version || !provenance) return null;
  const currentIngredients = Array.isArray(version.ingredients) ? version.ingredients : [];
  const currentInstructions = Array.isArray(version.instructions) ? version.instructions : [];
  const ingredients = (patch.ingredients as string[] | undefined) ?? currentIngredients.map((line) => text(record(line)?.originalText) ?? '');
  const instructions = (patch.instructions as string[] | undefined) ?? currentInstructions.map((step) => text(record(step)?.stepText) ?? '');
  if (!ingredients.length || ingredients.some((line) => !line) || !instructions.length || instructions.some((line) => !line)) return null;
  const reviewedData = {
      title: patch.title ?? version.title,
      description: Object.prototype.hasOwnProperty.call(patch, 'description') ? patch.description : version.description ?? null,
      yieldQuantity: Object.prototype.hasOwnProperty.call(patch, 'yieldQuantity') ? patch.yieldQuantity : version.yieldQuantity ?? null,
      yieldUnit: Object.prototype.hasOwnProperty.call(patch, 'yieldUnit') ? patch.yieldUnit : version.yieldUnit ?? null,
      scalingState: version.scalingState ?? 'review_required',
      prepMinutes: Object.prototype.hasOwnProperty.call(patch, 'prepMinutes') ? patch.prepMinutes : version.prepMinutes ?? null,
      cookMinutes: Object.prototype.hasOwnProperty.call(patch, 'cookMinutes') ? patch.cookMinutes : version.cookMinutes ?? null,
      notes: Object.prototype.hasOwnProperty.call(patch, 'notes') ? patch.notes : version.notes ?? null,
      ingredients: ingredientRows(ingredients, patch.ingredients ? undefined : currentIngredients),
      instructions: instructionRows(instructions, patch.instructions ? undefined : currentInstructions),
      equipmentRequirements: patch.instructions
        ? deriveSpecializedRecipeEquipment(instructions)
        : Array.isArray(version.equipmentRequirements) ? version.equipmentRequirements : [],
      provenance, credits: Array.isArray(recipe.credits) ? recipe.credits : [], lineage: Array.isArray(recipe.lineage) ? recipe.lineage : [],
  };
  return { reviewedData, changedFields: Object.keys(patch).map((key) => RECIPE_PATCH_LABELS[key]).filter(Boolean) };
}
function reviewedRecipeFork(recipe: Record<string, unknown>): Record<string, unknown> | null {
  const version = record(recipe.version); const provenance = record(recipe.provenance);
  const recipeId = text(recipe.recipeId); const versionId = text(version?.id);
  if (!version || !provenance || !recipeId || !versionId) return null;
  const ingredients = Array.isArray(version.ingredients) ? version.ingredients : [];
  const instructions = Array.isArray(version.instructions) ? version.instructions : [];
  if (!text(version.title) || !ingredients.length || !instructions.length) return null;
  return {
    title: version.title, description: version.description ?? null,
    yieldQuantity: version.yieldQuantity ?? null, yieldUnit: version.yieldUnit ?? null,
    scalingState: version.scalingState ?? 'review_required', prepMinutes: version.prepMinutes ?? null,
    cookMinutes: version.cookMinutes ?? null, notes: version.notes ?? null,
    ingredients: ingredients.map((value, index) => {
      const ingredient = record(value) ?? {};
      return { ...ingredient, id: text(ingredient.id) ?? `fork-ingredient-${index + 1}` };
    }),
    instructions: instructions.map((value, index) => {
      const instruction = record(value) ?? {};
      return { id: text(instruction.id) ?? `fork-instruction-${index + 1}`,
        sectionLabel: instruction.sectionLabel ?? null, text: text(instruction.stepText) ?? '' };
    }),
    equipmentRequirements: Array.isArray(version.equipmentRequirements) ? version.equipmentRequirements : [],
    provenance: { method: 'copy', sourceUrl: provenance.sourceUrl ?? null,
      sourceTitle: version.title, sourceAuthor: provenance.sourceAuthor ?? null,
      sourceContentHash: version.contentHash ?? null, rightsBasis: 'private_user_import' },
    credits: Array.isArray(recipe.credits) ? recipe.credits : [],
    lineage: [{ id: `fork:${versionId}`, relationship: 'fork', sourceRecipeId: recipeId,
      sourceRecipeVersionId: versionId, sourcePublicationId: record((recipe.lineage as unknown[] | undefined)?.[0])?.sourcePublicationId ?? null }],
  };
}
function fieldsRecord(value: unknown): Record<string, unknown> | null {
  const direct = record(value);
  if (direct) return direct;
  if (!Array.isArray(value)) return null;
  const entries = value.flatMap((item) => {
    const field = record(item); const key = text(field?.key);
    return key && field && Object.prototype.hasOwnProperty.call(field, 'value')
      ? [[key, field.value] as [string, unknown]] : [];
  });
  return entries.length === value.length ? Object.fromEntries(entries) : null;
}
function validSnapshot(value: unknown): value is Record<string, unknown> {
  const input = record(value);
  return !!input && Array.isArray(input.recipeFavorites) && Array.isArray(input.hiddenRecipes)
    && Array.isArray(input.recipeImportDrafts) && Array.isArray(input.cookSessions)
    && Array.isArray(input.recipes) && Array.isArray(input.mealPlans) && Array.isArray(input.mealChoiceRounds)
    && Array.isArray(input.foodStock) && (input.foodCycle === null || !!record(input.foodCycle))
    && Array.isArray(input.groceryLists) && Array.isArray(input.retailerHandoffs)
    && !!text(input.actorPersonId) && !!text(input.observedAt)
    && (input.mealPreferences === null || !!record(input.mealPreferences));
}
function cookSession(value: unknown): Record<string, unknown> | null {
  const row = record(value); const lastDevice = record(row?.lastDevice ?? row?.last_device);
  if (!row || !lastDevice) return null;
  const session = {
    id: text(row.id), ownerPersonId: text(row.ownerPersonId ?? row.owner_person_id),
    recipeId: text(row.recipeId ?? row.recipe_id), recipeVersionId: text(row.recipeVersionId ?? row.recipe_version_id),
    recipeVersion: Number(row.recipeVersion ?? row.recipe_version),
    recipeScaleMultiplier: Number(row.recipeScaleMultiplier ?? row.servingScale ?? row.serving_scale),
    status: text(row.status), currentCueIndex: Number(row.currentCueIndex ?? row.current_cue_index),
    cueCount: Number(row.cueCount ?? row.cue_count), revision: Number(row.revision),
    timers: Array.isArray(row.timers) ? row.timers : [], lastDevice,
    startedAt: row.startedAt ?? row.started_at, pausedAt: row.pausedAt ?? row.paused_at ?? null,
    completedAt: row.completedAt ?? row.completed_at ?? null, updatedAt: row.updatedAt ?? row.updated_at,
  };
  return session.id && session.ownerPersonId && session.recipeId && session.recipeVersionId
    && Number.isInteger(session.recipeVersion) && [1, 2, 3].includes(session.recipeScaleMultiplier)
    && ['active', 'paused', 'completed', 'abandoned'].includes(session.status ?? '')
    && Number.isInteger(session.currentCueIndex) && Number.isInteger(session.cueCount) && Number.isInteger(session.revision)
    ? session as Record<string, unknown> : null;
}
function cookCommand(value: unknown): Record<string, unknown> | null {
  const input = record(value); const type = text(input?.type);
  if (!input || !type || Object.keys(input).some((key) => !['type', 'cueId', 'timerId', 'durationSeconds', 'label'].includes(key))) return null;
  if (['next', 'back', 'repeat', 'pause', 'resume'].includes(type)) return Object.keys(input).length === 1 ? { type } : null;
  const timerId = text(input.timerId);
  if (['pause_timer', 'resume_timer', 'cancel_timer'].includes(type)) return timerId ? { type, timerId } : null;
  const cueId = text(input.cueId); const label = text(input.label); const durationSeconds = Number(input.durationSeconds);
  return type === 'start_timer' && timerId && cueId && label && label.length <= 160
    && Number.isInteger(durationSeconds) && durationSeconds >= 1 && durationSeconds <= 86_400
    ? { type, timerId, cueId, label, durationSeconds } : null;
}
function transitionCookSession(session: Record<string, unknown>, command: string, now: string): Record<string, unknown> | null {
  if (!['active', 'paused'].includes(String(session.status))) return null;
  const next: Record<string, unknown> = { ...session, revision: Number(session.revision) + 1, updatedAt: now };
  if (command === 'next') next.currentCueIndex = Math.min(Number(session.cueCount) - 1, Number(session.currentCueIndex) + 1);
  else if (command === 'back') next.currentCueIndex = Math.max(0, Number(session.currentCueIndex) - 1);
  else if (command === 'pause') { next.status = 'paused'; next.pausedAt = now; }
  else if (command === 'resume') { next.status = 'active'; next.pausedAt = null; }
  else if (command === 'completed' || command === 'abandoned') {
    next.status = command; next.completedAt = now; next.pausedAt = null;
  } else return null;
  return next;
}
function legacyCookSession(session: Record<string, unknown>): Record<string, unknown> {
  const { recipeScaleMultiplier, ...rest } = session;
  return { ...rest, servingScale: recipeScaleMultiplier };
}

export async function executeServerFoodTool({ client, userId, call, stageProposal, stageDeviceAction }: {
  client: FoodClient;
  userId: string;
  call: ServerAgentToolCall;
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
  stageDeviceAction?: (request: ServerDeviceActionRequest) => Promise<void>;
}): Promise<ServerAgentToolResult | null> {
  if (!TOOL_IDS.has(call.toolId)) return null;
  if (!client.rpc) return { status: 'unavailable', reason: 'server_food_provider_unavailable', retryable: false };
  const { data, error } = await client.rpc('get_kwilt_agent_food_control_snapshot', { p_user_id: userId });
  if (error || !validSnapshot(data)) return { status: 'refused', reason: 'The current account does not have an authorized food context.' };
  const snapshot = data;
  const mealPreferences = record(snapshot.mealPreferences);
  if (call.toolId === 'recipes.publication.prepare' || call.toolId === 'recipes.publication.publish') {
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const versionId = call.toolId === 'recipes.publication.prepare'
      ? text(call.arguments.recipeVersionId) : text(call.arguments.confirmedVersionId);
    const recipe = (snapshot.recipes as unknown[]).map(record)
      .find((candidate) => text(record(candidate?.version)?.id) === versionId);
    const version = record(recipe?.version);
    const recipeId = text(recipe?.recipeId);
    const scopes = call.toolId === 'recipes.publication.prepare'
      ? call.arguments.distributionScopes : call.arguments.confirmedScopes;
    if (!recipe || !version || !recipeId || !versionId || !Array.isArray(scopes) || scopes.length < 1
      || scopes.length > 4 || scopes.some((scope) => !text(scope))) {
      return { status: 'failed', code: 'recipe_publication_review_invalid',
        message: 'Choose an exact available Recipe version and one to four publication destinations.', retryable: Boolean(versionId) };
    }
    const request: ServerDeviceActionRequest = {
      capabilityId: 'recipes', actionType: 'open_recipe_publication_review', targetType: 'recipe', targetId: recipeId,
      title: call.toolId === 'recipes.publication.prepare'
        ? `Review publication for ${text(version.title) ?? 'Recipe'}`
        : `Confirm publication for ${text(version.title) ?? 'Recipe'}`,
      consequenceSummary: 'Kwilt will open the exact Recipe version for native identity, rights, media, destination, and final publication review. Nothing is published by ChatGPT.',
      payload: { operationId: call.toolId, recipeVersionId: versionId, arguments: call.arguments },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (call.toolId === 'food_scenario.accept') {
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const scenarioId = text(call.arguments.scenarioId); const expectedVersion = Number(call.arguments.expectedVersion);
    if (!scenarioId || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return { status: 'failed', code: 'food_scenario_target_invalid', message: 'Choose one exact current Food Scenario.', retryable: false };
    }
    const request: ServerDeviceActionRequest = {
      capabilityId: 'groceries', actionType: 'open_food_scenario_review', targetType: 'food_scenario', targetId: scenarioId,
      title: 'Review Food Scenario',
      consequenceSummary: 'Kwilt will open the version-bound native scenario and partial-recovery details. Nothing changes until native review applies it.',
      payload: { operationId: call.toolId, expectedVersion },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (call.toolId === 'savings.review') {
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const listId = text(call.arguments.groceryListId);
    const list = (snapshot.groceryLists as unknown[]).map(record).find((candidate) => text(candidate?.id) === listId);
    if (!listId || !list) return { status: 'failed', code: 'grocery_list_not_found', message: 'Choose one exact Grocery list.', retryable: false };
    const request: ServerDeviceActionRequest = {
      capabilityId: 'savings', actionType: 'open_grocery_savings', targetType: 'grocery_list', targetId: listId,
      title: 'Review current Grocery savings',
      consequenceSummary: 'Kwilt will refresh current price and offer evidence in native review. Estimated savings are not realized savings, and no coupon is activated by ChatGPT.',
      payload: { operationId: call.toolId, arguments: call.arguments },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (call.toolId === 'receipt.extract' || call.toolId === 'receipt.reconcile') {
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const sourceArtifactRefs = Array.isArray(call.arguments.sourceArtifactRefs)
      ? call.arguments.sourceArtifactRefs.flatMap((value) => text(value) ? [text(value)!] : []) : [];
    const receiptDraftId = text(call.arguments.receiptDraftId);
    if (call.toolId === 'receipt.extract' && (sourceArtifactRefs.length < 1 || sourceArtifactRefs.length > 20)) {
      return { status: 'needs_input', prompt: 'Choose the receipt photo or file to review.', fields: ['sourceArtifactRefs'] };
    }
    if (call.toolId === 'receipt.reconcile' && !receiptDraftId) {
      return { status: 'failed', code: 'receipt_draft_invalid', message: 'Choose one exact reviewed receipt draft.', retryable: false };
    }
    const request: ServerDeviceActionRequest = {
      capabilityId: 'groceries', actionType: 'open_grocery_receipt_review', targetType: 'grocery_receipt',
      targetId: receiptDraftId,
      title: call.toolId === 'receipt.extract' ? 'Review receipt extraction' : 'Review receipt reconciliation',
      consequenceSummary: 'Kwilt will open native receipt evidence review. Extraction is only a draft; realized savings require reviewed line matches and are not claimed by ChatGPT.',
      payload: { operationId: call.toolId, ...call.arguments, sourceArtifactRefs },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (call.toolId === 'store_opportunity.capture' || call.toolId === 'food_scenario.prepare'
    || call.toolId === 'savings.accept' || call.toolId === 'savings.coupon.open') {
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const targetId = call.toolId === 'savings.accept' ? text(call.arguments.savingsPlanId)
      : call.toolId === 'savings.coupon.open' ? text(call.arguments.offerId) : null;
    if ((call.toolId === 'savings.accept' || call.toolId === 'savings.coupon.open') && !targetId) {
      return { status: 'failed', code: 'food_review_target_invalid', message: 'Choose one exact reviewed Food target.', retryable: false };
    }
    const request: ServerDeviceActionRequest = {
      capabilityId: call.toolId.startsWith('savings.') ? 'savings' : 'groceries',
      actionType: 'open_grocery_food_review', targetType: targetId ? 'food_review' : null, targetId,
      title: call.toolId === 'store_opportunity.capture' ? 'Review Store Opportunity'
        : call.toolId === 'food_scenario.prepare' ? 'Review Food Scenario inputs'
          : call.toolId === 'savings.accept' ? 'Review Savings Plan' : 'Open retailer coupon review',
      consequenceSummary: call.toolId === 'savings.coupon.open'
        ? 'Kwilt will open native Grocery review. The retailer owns eligibility and activation; ChatGPT does not claim the coupon was applied.'
        : 'Kwilt will open native Food review with the supplied evidence. No plan, Grocery list, purchase, or savings state changes in ChatGPT.',
      payload: { operationId: call.toolId, arguments: call.arguments },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  const groceryResult = await executeServerGroceryTool({ snapshot, call, stageProposal, stageDeviceAction });
  if (groceryResult) return groceryResult;
  if (call.toolId === 'recipes.search') {
    const query = text(call.arguments.query)?.toLocaleLowerCase();
    const limit = call.arguments.limit === undefined ? 20 : Number(call.arguments.limit);
    if (!query || !Number.isInteger(limit) || limit < 1 || limit > 50) {
      return { status: 'failed', code: 'invalid_recipe_search', message: 'Enter a Recipe search and a limit from 1 to 50.', retryable: false };
    }
    const recipes = (snapshot.recipes as unknown[]).flatMap((value) => {
      const recipe = record(value); const version = record(recipe?.version);
      const ingredients = Array.isArray(version?.ingredients) ? version.ingredients.map((item) => text(record(item)?.originalText) ?? '') : [];
      if (!recipe || !version || ![text(version.title), text(version.description), ...ingredients]
        .some((candidate) => candidate?.toLocaleLowerCase().includes(query))) return [];
      return [{ recipeId: recipe.recipeId, recipeVersionId: version.id, version: version.version,
        title: version.title, description: version.description ?? null, updatedAt: recipe.updatedAt }];
    }).slice(0, limit);
    return { status: 'completed', output: { recipes }, receipt: null };
  }
  if (call.toolId === 'recipes.read') {
    const recipeId = text(call.arguments.recipeId); const recipeVersionId = call.arguments.recipeVersionId == null ? null : text(call.arguments.recipeVersionId);
    const recipe = (snapshot.recipes as unknown[]).map(record).find((candidate) => candidate?.recipeId === recipeId
      && (!recipeVersionId || record(candidate.version)?.id === recipeVersionId));
    return recipe
      ? { status: 'completed', output: recipe, receipt: null }
      : { status: 'refused', reason: 'That Recipe is not available to the current person.' };
  }
  if (call.toolId === 'recipes.scale.preview') {
    const versionId = text(call.arguments.recipeVersionId); const targetYield = Number(call.arguments.targetYield);
    const recipe = (snapshot.recipes as unknown[]).map(record).find((candidate) => record(candidate?.version)?.id === versionId);
    const version = record(recipe?.version); const fromYield = Number(version?.yieldQuantity);
    if (!version || !Number.isFinite(fromYield) || fromYield <= 0 || !Number.isFinite(targetYield) || targetYield <= 0) {
      return { status: 'failed', code: 'recipe_scale_unavailable', message: 'This Recipe needs a known yield and a positive target yield.', retryable: false };
    }
    const factor = targetYield / fromYield;
    const ingredients = Array.isArray(version.ingredients) ? version.ingredients.map((value) => {
      const ingredient = record(value) ?? {};
      const scale = (quantity: unknown) => quantity === null || quantity === undefined ? null : Math.round(Number(quantity) * factor * 1_000_000_000) / 1_000_000_000;
      return { id: ingredient.id, originalText: ingredient.originalText, quantity: scale(ingredient.quantityMin),
        quantityMax: scale(ingredient.quantityMax), unit: ingredient.unit ?? null, optional: ingredient.optional === true };
    }) : [];
    return { status: 'completed', output: { recipeVersionId: versionId, fromYield, targetYield, ingredients }, receipt: null };
  }
  if (call.toolId === 'recipes.fork') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const versionId = text(call.arguments.sourceRecipeVersionId);
    const idempotencyKey = text(call.arguments.idempotencyKey);
    const recipe = (snapshot.recipes as unknown[]).map(record)
      .find((candidate) => record(candidate?.version)?.id === versionId);
    const reviewedData = recipe ? reviewedRecipeFork(recipe) : null;
    if (!recipe || !reviewedData || !idempotencyKey) {
      return { status: 'failed', code: 'recipe_fork_unavailable', message: 'Choose one exact available Recipe version and a stable request key.', retryable: false };
    }
    const version = record(recipe.version)!;
    const title = `Save a copy of ${String(version.title)}`;
    const proposal = await stageProposal({ capabilityId: 'recipes', title,
      body: 'Creates an independently owned private Recipe while preserving the exact source version and attribution lineage.',
      operation: { type: 'recipes.fork', targetType: 'recipe_version', targetId: versionId, summary: title,
        payload: { expectedVersion: version.version, sourceRecipeId: recipe.recipeId, reviewedData } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'recipes.share_copy.prepare') {
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const recipeVersionId = text(call.arguments.recipeVersionId); const recipientPersonId = text(call.arguments.recipientPersonId);
    const recipe = (snapshot.recipes as unknown[]).map(record).find((candidate) => record(candidate?.version)?.id === recipeVersionId);
    const version = record(recipe?.version);
    if (!recipe || !version || !recipientPersonId || recipientPersonId === snapshot.actorPersonId) {
      return { status: 'failed', code: 'recipe_share_copy_invalid', message: 'Choose one exact available Recipe version and one other person.', retryable: false };
    }
    const request: ServerDeviceActionRequest = { capabilityId: 'recipes', actionType: 'open_recipe_share_copy',
      targetType: 'recipe', targetId: text(recipe.recipeId), title: `Review a copy of ${String(version.title)}`,
      consequenceSummary: 'Kwilt will open the exact Recipe and native share review. No copy is delivered until you confirm the recipient there.',
      payload: { recipeVersionId, recipientPersonId } };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (call.toolId === 'recipes.collaborator.invite') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const recipeId = text(call.arguments.recipeId); const recipientPersonId = text(call.arguments.recipientPersonId);
    const role = text(call.arguments.role); const expectedVersion = call.arguments.expectedVersion;
    const recipe = (snapshot.recipes as unknown[]).map(record).find((candidate) => candidate?.recipeId === recipeId);
    const version = record(recipe?.version);
    if (!recipe || !version || recipe.ownershipKind !== 'personal' || !recipientPersonId
      || recipientPersonId === snapshot.actorPersonId || !['viewer', 'contributor', 'maintainer'].includes(role ?? '')
      || !Number.isInteger(expectedVersion) || expectedVersion !== version.version) {
      return { status: 'failed', code: 'recipe_collaboration_stale',
        message: 'Choose the current owned Recipe, its exact version, one other person, and a supported role.', retryable: true };
    }
    const title = `Share ${String(version.title)}`;
    const proposal = await stageProposal({ capabilityId: 'recipes', title,
      body: `Gives the selected person ${String(role)} access to this private Recipe after explicit approval. No other household content is shared.`,
      operation: { type: 'recipes.collaborator.invite', targetType: 'recipe', targetId: recipeId, summary: title,
        payload: { expectedVersion, recipientPersonId, role } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'recipes.import.prepare') {
    const method = text(call.arguments.method);
    const rawRefs = call.arguments.sourceArtifactRefs;
    const refs = Array.isArray(rawRefs)
      ? rawRefs.map(text).filter((value): value is string => !!value)
      : [];
    if (!method || !['url', 'photo', 'scan', 'text', 'voice', 'email'].includes(method)
      || refs.length < 1 || refs.length > 20 || !Array.isArray(rawRefs) || refs.length !== rawRefs.length) {
      return { status: 'failed', code: 'invalid_recipe_import_source', message: 'Choose one supported Recipe source with up to 20 secure artifacts.', retryable: false };
    }
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const request: ServerDeviceActionRequest = {
      capabilityId: 'recipes',
      actionType: 'open_recipe_import', targetType: 'recipe_import_source', targetId: null,
      title: 'Review Recipe import', consequenceSummary: 'Kwilt will open the private import review without saving a Recipe yet.',
      payload: { method, sourceArtifactRefs: refs },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (call.toolId === 'recipes.import.approve') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const draftId = text(call.arguments.draftId);
    const draft = (snapshot.recipeImportDrafts as unknown[]).map(record).find((candidate) => candidate?.id === draftId);
    if (!draft || draft.state !== 'needs_review') return { status: 'refused', reason: 'That Recipe import draft is not available for review.' };
    const expectedVersion = call.arguments.expectedDraftVersion;
    if (!Number.isInteger(expectedVersion) || expectedVersion !== draft.version) {
      return { status: 'failed', code: 'recipe_import_version_stale', message: 'That Recipe import draft changed. Read the current draft before approving it.', retryable: true };
    }
    const approvalIdempotencyKey = text(call.arguments.idempotencyKey);
    if (!approvalIdempotencyKey) return { status: 'failed', code: 'invalid_recipe_import_approval', message: 'The import approval needs a stable request key.', retryable: false };
    const extracted = record(draft.extractedData) ?? {};
    const method = text(draft.sourceMethod);
    const reviewedData = method ? reviewedRecipeCreate(call.arguments.reviewedVersion, {
      method, sourceUrl: extracted.sourceUrl ?? null, sourceTitle: extracted.sourceTitle ?? null,
      sourceAuthor: extracted.sourceAuthor ?? null, sourceContentHash: null, rightsBasis: 'private_user_import',
    }) : null;
    if (!reviewedData) return { status: 'failed', code: 'invalid_recipe_import_approval', message: 'Review a title, at least one ingredient, and at least one instruction.', retryable: false };
    const title = `Save imported ${String(reviewedData.title)}`;
    const proposal = await stageProposal({ capabilityId: 'recipes', title,
      body: 'Creates one private Recipe from this exact reviewed draft while preserving its source provenance.',
      operation: { type: 'recipes.import.approve', targetType: 'recipe_import_draft', targetId: draftId, summary: title,
        payload: { expectedVersion, approvalIdempotencyKey, reviewedData } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'cook_session.read') {
    const sessionId = text(call.arguments.sessionId);
    const session = (snapshot.cookSessions as unknown[]).map(cookSession).find((candidate) => candidate?.id === sessionId);
    if (!session) return { status: 'refused', reason: 'That Cook Session is not available to the current person.' };
    const recipe = (snapshot.recipes as unknown[]).map(record).find((candidate) => record(candidate?.version)?.id === session.recipeVersionId);
    const instructions = Array.isArray(record(recipe?.version)?.instructions) ? record(recipe?.version)!.instructions as unknown[] : [];
    const currentInstruction = record(instructions[Number(session.currentCueIndex)]);
    return { status: 'completed', output: { session, currentCue: currentInstruction ? {
      instructionId: currentInstruction.id, text: currentInstruction.stepText,
      sectionLabel: currentInstruction.sectionLabel ?? null,
    } : null }, receipt: null };
  }
  if (call.toolId === 'cook_session.start') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const versionId = text(call.arguments.recipeVersionId); const multiplier = Number(call.arguments.recipeScaleMultiplier);
    const recipe = (snapshot.recipes as unknown[]).map(record).find((candidate) => record(candidate?.version)?.id === versionId);
    const version = record(recipe?.version);
    if (!recipe || !version || ![1, 2, 3].includes(multiplier)) {
      return { status: 'failed', code: 'invalid_cook_session_start', message: 'Choose an exact Recipe version and a 1×, 2×, or 3× size.', retryable: false };
    }
    const title = `Start cooking ${String(version.title)}`;
    const proposal = await stageProposal({ capabilityId: 'recipes', title,
      body: `Starts at the first of ${Math.max(1, Array.isArray(version.instructions) ? version.instructions.length : 0)} reviewed steps using the ${multiplier}× Recipe size.`,
      operation: { type: 'cook_session.start', targetType: 'recipe_version', targetId: versionId, summary: title,
        payload: { expectedVersion: version.version, recipeScaleMultiplier: multiplier } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'cook_session.control' || call.toolId === 'cook_session.complete') {
    const sessionId = text(call.arguments.sessionId); const expectedRevision = call.arguments.expectedRevision;
    const session = (snapshot.cookSessions as unknown[]).map(cookSession).find((candidate) => candidate?.id === sessionId);
    if (!session) return { status: 'refused', reason: 'That Cook Session is not available to the current person.' };
    if (!Number.isInteger(expectedRevision) || expectedRevision !== session.revision) {
      return { status: 'failed', code: 'cook_session_revision_stale', message: 'Cooking progress changed. Read the current Cook Session before continuing.', retryable: true };
    }
    if (call.toolId === 'cook_session.complete') {
      if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
      const outcome = call.arguments.outcome;
      if (outcome !== 'completed' && outcome !== 'abandoned') return { status: 'failed', code: 'invalid_cook_session_completion', message: 'Choose completed or abandoned.', retryable: false };
      const title = `${outcome === 'completed' ? 'Complete' : 'Abandon'} Cook Session`;
      const proposal = await stageProposal({ capabilityId: 'recipes', title,
        body: outcome === 'completed' ? 'Marks this exact cooking session complete; optional learning remains a separate private review.' : 'Ends this exact Cook Session without claiming the Recipe was completed.',
        operation: { type: 'cook_session.complete', targetType: 'cook_session', targetId: sessionId, summary: title,
          payload: { expectedVersion: expectedRevision, outcome } },
      });
      return { status: 'proposed', proposal };
    }
    const command = cookCommand(call.arguments.command);
    if (!command) return { status: 'failed', code: 'invalid_cook_session_control', message: 'Choose one supported Cook command.', retryable: false };
    if (['start_timer', 'pause_timer', 'resume_timer', 'cancel_timer'].includes(String(command.type))) {
      if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
      const request: ServerDeviceActionRequest = { capabilityId: 'recipes', actionType: 'open_cook_session_timer',
        targetType: 'cook_session', targetId: sessionId, title: 'Review Cook timer',
        consequenceSummary: 'Kwilt will open Cook Mode so native timer and notification state remain visible.',
        payload: { expectedRevision, command, recipeId: session.recipeId, recipeScaleMultiplier: session.recipeScaleMultiplier } };
      await stageDeviceAction(request);
      return { status: 'pending_client_action', provider: 'device', request };
    }
    if (command.type === 'repeat') return { status: 'completed', output: { session, replayedCue: true }, receipt: null };
    const next = transitionCookSession(session, String(command.type), new Date().toISOString());
    if (!next || !client.rpc) return { status: 'failed', code: 'cook_session_control_failed', message: 'That Cook command could not be applied.', retryable: false };
    const { data: applied, error: applyError } = await client.rpc('apply_kwilt_cook_session_conversational', {
      p_idempotency_key: call.id, p_expected_revision: expectedRevision, p_session: legacyCookSession(next),
    });
    const appliedSession = cookSession(record(applied)?.session) ?? next;
    return applyError
      ? { status: 'failed', code: 'cook_session_control_failed', message: 'That Cook command could not be applied.', retryable: true }
      : { status: 'completed', output: { session: appliedSession, replayed: record(applied)?.replayed === true }, receipt: null };
  }
  if (call.toolId === 'recipes.create') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const reviewedData = reviewedRecipeCreate(call.arguments.recipe);
    if (!reviewedData) {
      return { status: 'failed', code: 'invalid_recipe', message: 'Add a title, at least one ingredient, and at least one instruction before saving this Recipe.', retryable: false };
    }
    const title = `Create ${String(reviewedData.title)}`;
    const proposal = await stageProposal({ capabilityId: 'recipes', title,
      body: `${(reviewedData.ingredients as unknown[]).length} ingredients · ${(reviewedData.instructions as unknown[]).length} steps · private Recipe`,
      operation: { type: 'create_recipe', targetType: 'recipe', targetId: null, summary: title,
        payload: { expectedVersion: 0, reviewedData } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'recipes.update' || call.toolId === 'recipes.delete') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const recipeId = text(call.arguments.recipeId);
    const recipe = (snapshot.recipes as unknown[]).map(record).find((candidate) => candidate?.recipeId === recipeId);
    const version = record(recipe?.version); const provenance = record(recipe?.provenance);
    if (!recipe || !version || recipe.lifecycle !== 'active') {
      return { status: 'failed', code: 'recipe_not_found', message: 'That private Recipe is no longer available.', retryable: false };
    }
    if (provenance?.rightsBasis === 'kwilt_authored' || provenance?.method === 'catalog') {
      const deleting = call.toolId === 'recipes.delete';
      return { status: 'failed', code: deleting ? 'recipe_not_deletable' : 'recipe_not_editable',
        message: deleting
          ? 'Kwilt catalog Recipes can be hidden, but they cannot be deleted as private Recipes.'
          : 'Kwilt catalog Recipes cannot be changed in place. Save an independent copy first.', retryable: false };
    }
    const expectedVersion = call.arguments.expectedVersion;
    if (!Number.isInteger(expectedVersion) || expectedVersion !== version.version) {
      return { status: 'failed', code: 'recipe_version_stale',
        message: `${text(version.title) ?? 'That Recipe'} changed. Review the current Recipe before ${call.toolId === 'recipes.delete' ? 'deleting' : 'updating'} it.`, retryable: true };
    }
    if (call.toolId === 'recipes.delete') {
      const title = `Delete ${String(version.title)}`;
      const proposal = await stageProposal({ capabilityId: 'recipes', title,
        body: 'This removes this private Recipe from your library after explicit approval.',
        operation: { type: 'delete_recipe', targetType: 'recipe', targetId: recipeId, summary: title,
          payload: { expectedVersion } },
      });
      return { status: 'proposed', proposal };
    }
    const reviewed = reviewedRecipeUpdate(recipe, call.arguments.reviewedVersion);
    if (!reviewed) {
      return { status: 'failed', code: 'invalid_recipe_patch', message: 'Choose a supported Recipe field and keep at least one ingredient and instruction.', retryable: false };
    }
    const title = `Update ${String(version.title)}`;
    const proposal = await stageProposal({ capabilityId: 'recipes', title,
      body: 'Creates a reviewed new version and preserves the current Recipe history.',
      operation: { type: 'update_recipe', targetType: 'recipe', targetId: recipeId, summary: title,
        payload: { expectedVersion, reviewedData: reviewed.reviewedData, changedFields: reviewed.changedFields } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'meal_planning.plan.create') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const householdId = call.arguments.householdId === null
      ? null
      : text(call.arguments.householdId) ?? undefined;
    const horizon = mealPlanHorizon(call.arguments.horizon);
    const idempotencyKey = text(call.arguments.idempotencyKey);
    if (householdId === undefined || !horizon || !idempotencyKey) {
      return { status: 'failed', code: 'meal_plan_create_invalid', message: 'Choose a personal or household Meal Plan, a valid horizon, and a stable request key.', retryable: false };
    }
    const proposal = await stageProposal({ capabilityId: 'meal_planning', title: 'Create Meal Plan',
      body: householdId ? 'Creates one reviewed household Meal Plan.' : 'Creates one reviewed personal Meal Plan.',
      operation: { type: call.toolId, targetType: 'meal_plan', targetId: null,
        summary: 'Create Meal Plan', payload: { expectedVersion: 0, householdId, horizon } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'meal_planning.plan.update'
    || call.toolId === 'meal_planning.candidate.add'
    || call.toolId === 'meal_planning.candidate.remove') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const planId = text(call.arguments.mealPlanId); const expectedVersion = Number(call.arguments.expectedVersion);
    const plan = (snapshot.mealPlans as unknown[]).map(record).find((candidate) => text(candidate?.id) === planId);
    if (!plan) return { status: 'failed', code: 'meal_plan_not_found', message: 'That Meal Plan is no longer available.', retryable: false };
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1 || expectedVersion !== plan.version) {
      return { status: 'failed', code: 'meal_plan_version_stale', message: 'That Meal Plan changed. Read its current version before continuing.', retryable: true };
    }
    if (plan.state !== 'draft') return { status: 'failed', code: 'meal_plan_not_draft', message: 'Only a draft Meal Plan can be changed this way.', retryable: false };
    let title: string; let body: string; let payload: Record<string, unknown>;
    if (call.toolId === 'meal_planning.plan.update') {
      const horizon = mealPlanHorizon(call.arguments.horizon);
      if (!horizon) return { status: 'failed', code: 'meal_plan_horizon_invalid', message: 'Choose a valid Meal Plan horizon.', retryable: false };
      title = 'Update Meal Plan horizon'; body = 'Changes the planning horizon on this exact draft version.';
      payload = { expectedVersion, horizon };
    } else if (call.toolId === 'meal_planning.candidate.add') {
      const candidateInput = record(call.arguments.candidate);
      const candidateId = text(candidateInput?.candidateId); const requestedTitle = text(candidateInput?.title);
      const recipeVersionId = candidateInput?.recipeVersionId === null ? null : text(candidateInput?.recipeVersionId);
      const plannedPortions = Number(candidateInput?.plannedPortions);
      if (!candidateId || !requestedTitle || recipeVersionId === undefined
        || !Number.isInteger(plannedPortions) || plannedPortions < 1 || plannedPortions > 24) {
        return { status: 'failed', code: 'meal_candidate_invalid', message: 'Choose one named meal and 1 to 24 portions.', retryable: false };
      }
      const existingCandidates = Array.isArray(plan.candidates) ? plan.candidates.map(record) : [];
      if (existingCandidates.some((candidate) => text(candidate?.id) === candidateId)) {
        return { status: 'failed', code: 'meal_candidate_exists', message: 'That Meal candidate is already in this Plan.', retryable: false };
      }
      let candidate: Record<string, unknown>;
      if (recipeVersionId) {
        const recipe = (snapshot.recipes as unknown[]).map(record)
          .find((value) => text(record(value?.version)?.id) === recipeVersionId);
        const currentTitle = text(record(recipe?.version)?.title);
        if (!recipe) return { status: 'failed', code: 'recipe_version_not_found', message: 'That exact Recipe version is no longer available.', retryable: false };
        if (requestedTitle !== currentTitle) return { status: 'failed', code: 'meal_candidate_title_mismatch', message: 'Use the current Recipe title for this exact Recipe version.', retryable: false };
        if (existingCandidates.some((existing) => text(record(existing?.recipeSnapshot)?.recipeVersionId) === recipeVersionId)) {
          return { status: 'failed', code: 'meal_candidate_recipe_exists', message: 'That exact Recipe version is already in this Meal Plan.', retryable: false };
        }
        const projected = mealPlanRecipeCandidate(recipe, candidateId, plannedPortions);
        if (!projected) return { status: 'failed', code: 'meal_candidate_recipe_invalid', message: 'That Recipe does not have enough authority to add to Plan.', retryable: false };
        candidate = projected;
      } else {
        candidate = { id: candidateId, kind: 'meal_note', title: requestedTitle, recipeSnapshot: null };
      }
      title = `Add ${candidate.title}`;
      body = recipeVersionId ? 'Adds an immutable snapshot of this exact Recipe version to the draft Meal Plan.'
        : 'Adds this meal idea without claiming Recipe authority.';
      payload = { expectedVersion, candidate };
    } else {
      const candidateId = text(call.arguments.candidateId);
      const existing = (Array.isArray(plan.candidates) ? plan.candidates : []).map(record)
        .find((candidate) => text(candidate?.id) === candidateId);
      if (!existing) return { status: 'failed', code: 'meal_candidate_not_found', message: 'That Meal candidate is no longer in this Plan.', retryable: false };
      title = `Remove ${String(existing.title)}`;
      body = 'Removes this candidate from the draft Meal Plan without changing its source Recipe.';
      payload = { expectedVersion, candidateId };
    }
    const proposal = await stageProposal({ capabilityId: 'meal_planning', title, body,
      operation: { type: call.toolId, targetType: 'meal_plan', targetId: planId, summary: title, payload },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'meal_planning.round.open') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const planId = text(call.arguments.mealPlanId); const expectedVersion = Number(call.arguments.expectedVersion);
    const plan = (snapshot.mealPlans as unknown[]).map(record).find((candidate) => text(candidate?.id) === planId);
    const participants = Array.isArray(call.arguments.participantPersonIds)
      ? call.arguments.participantPersonIds.map(text).filter((id): id is string => !!id) : [];
    const members = Array.isArray(mealPreferences?.members) ? mealPreferences.members.map(record) : [];
    const memberPersonIds = new Set(members.map((member) => text(member?.personId)).filter((id): id is string => !!id));
    if (!plan) return { status: 'failed', code: 'meal_plan_not_found', message: 'That Meal Plan is no longer available.', retryable: false };
    if (plan.version !== expectedVersion) return { status: 'failed', code: 'meal_plan_version_stale', message: 'That Meal Plan changed. Read it again before opening choices.', retryable: true };
    if (!text(plan.householdId) || !['draft', 'ready_to_finalize'].includes(String(plan.state))
      || record(plan.activeRound) || !Array.isArray(plan.candidates) || plan.candidates.length === 0) {
      return { status: 'failed', code: 'meal_choice_round_unavailable', message: 'Choose a shared editable Meal Plan with candidates and no open choice round.', retryable: false };
    }
    if (participants.length < 1 || participants.length > 20 || new Set(participants).size !== participants.length
      || participants.some((id) => !memberPersonIds.has(id))) {
      return { status: 'failed', code: 'meal_choice_participants_invalid', message: 'Choose 1 to 20 distinct current Household people.', retryable: false };
    }
    const proposal = await stageProposal({ capabilityId: 'meal_planning', title: 'Open family meal choices',
      body: `Invites ${participants.length} selected Household member${participants.length === 1 ? '' : 's'} to choose from this exact Meal Plan version.`,
      operation: { type: call.toolId, targetType: 'meal_plan', targetId: planId,
        summary: 'Open family meal choices', payload: { expectedVersion, participantPersonIds: participants } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'meal_planning.round.close') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const roundId = text(call.arguments.choiceRoundId); const expectedVersion = Number(call.arguments.expectedVersion);
    const plan = (snapshot.mealPlans as unknown[]).map(record)
      .find((candidate) => text(record(candidate?.activeRound)?.id) === roundId);
    const round = record(plan?.activeRound);
    if (!round) return { status: 'failed', code: 'meal_choice_round_not_found', message: 'That open Meal choice round is no longer available.', retryable: false };
    if (round.version !== expectedVersion) return { status: 'failed', code: 'meal_choice_round_version_stale', message: 'That choice round changed. Read it again before closing.', retryable: true };
    const proposal = await stageProposal({ capabilityId: 'meal_planning', title: 'Close family meal choices',
      body: 'Closes this exact choice-round version and preserves its authorized aggregate for final review.',
      operation: { type: call.toolId, targetType: 'meal_choice_round', targetId: roundId,
        summary: 'Close family meal choices', payload: { expectedVersion } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'meal_planning.response.submit' || call.toolId === 'meal_planning.response.withdraw') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const roundId = text(call.arguments.choiceRoundId); const expectedVersion = Number(call.arguments.expectedVersion);
    const round = (snapshot.mealChoiceRounds as unknown[]).map(record)
      .find((candidate) => text(candidate?.roundId) === roundId);
    if (!round) return { status: 'failed', code: 'meal_choice_round_not_found', message: 'That Meal choice round is not available to the current person.', retryable: false };
    if (round.version !== expectedVersion || round.state !== 'open') return { status: 'failed', code: 'meal_choice_round_version_stale', message: 'That choice round changed. Read it again before responding.', retryable: true };
    let title: string; let payload: Record<string, unknown>;
    if (call.toolId === 'meal_planning.response.submit') {
      const availableCandidateIds = Array.isArray(round.candidates)
        ? round.candidates.map(record).map((candidate) => text(candidate?.id)).filter((id): id is string => !!id) : [];
      const candidateIds = Array.isArray(call.arguments.candidateIds)
        ? call.arguments.candidateIds.map(text).filter((id): id is string => !!id) : [];
      const pass = call.arguments.pass;
      const suggestion = call.arguments.suggestion === null ? null : text(call.arguments.suggestion);
      if (typeof pass !== 'boolean' || (call.arguments.suggestion !== null && suggestion === null)
        || candidateIds.length > 3 || new Set(candidateIds).size !== candidateIds.length
        || (pass && candidateIds.length > 0) || candidateIds.some((id) => !availableCandidateIds.includes(id))) {
        return { status: 'failed', code: 'meal_choice_response_invalid', message: 'Choose up to three available meals, or pass.', retryable: false };
      }
      title = pass ? 'Pass on this meal round' : 'Submit meal choices';
      payload = { expectedVersion, candidateIds, pass, suggestion, availableCandidateIds };
    } else {
      const myResponse = record(round.myResponse);
      if (!myResponse || myResponse.state !== 'submitted') return { status: 'failed', code: 'meal_choice_response_not_found', message: 'There is no submitted response to withdraw.', retryable: false };
      title = 'Withdraw meal choices'; payload = { expectedVersion };
    }
    const proposal = await stageProposal({ capabilityId: 'meal_planning', title,
      body: 'Changes only the current participant’s own response for this exact open round.',
      operation: { type: call.toolId, targetType: 'meal_choice_response', targetId: roundId, summary: title, payload },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'meal_planning.plan.revise') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const planId = text(call.arguments.mealPlanId); const expectedVersion = Number(call.arguments.expectedVersion);
    const plan = (snapshot.mealPlans as unknown[]).map(record).find((candidate) => text(candidate?.id) === planId);
    if (!plan) return { status: 'failed', code: 'meal_plan_not_found', message: 'That Meal Plan is no longer available.', retryable: false };
    if (plan.version !== expectedVersion) return { status: 'failed', code: 'meal_plan_version_stale', message: 'That Meal Plan changed. Read it again before revising.', retryable: true };
    if (plan.state !== 'finalized') return { status: 'failed', code: 'meal_plan_not_revisable', message: 'Only a finalized Meal Plan can be reopened for revision.', retryable: false };
    const proposal = await stageProposal({ capabilityId: 'meal_planning', title: 'Revise finalized Meal Plan',
      body: 'Reopens this exact finalized version and marks derived Grocery lists stale for explicit refresh.',
      operation: { type: call.toolId, targetType: 'meal_plan', targetId: planId,
        summary: 'Revise finalized Meal Plan', payload: { expectedVersion } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'meal_planning.plan.finalize') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const planId = text(call.arguments.mealPlanId); const expectedVersion = Number(call.arguments.expectedVersion);
    const idempotencyKey = text(call.arguments.idempotencyKey);
    const organizerNote = call.arguments.organizerNote === null ? null : nullableText(call.arguments.organizerNote, 2_000);
    const plan = (snapshot.mealPlans as unknown[]).map(record).find((candidate) => text(candidate?.id) === planId);
    if (!plan) return { status: 'failed', code: 'meal_plan_not_found', message: 'That Meal Plan is no longer available.', retryable: false };
    if (plan.version !== expectedVersion) return { status: 'failed', code: 'meal_plan_version_stale', message: 'That Meal Plan changed. Read it again before finalizing.', retryable: true };
    if (!['draft', 'ready_to_finalize'].includes(String(plan.state))) return { status: 'failed', code: 'meal_plan_not_finalizable', message: 'Only a reviewed draft or closed-choice Meal Plan can be finalized.', retryable: false };
    const eligiblePersonIds = plan.householdId
      ? Array.isArray(mealPreferences?.members)
        ? mealPreferences.members.map(record).map((member) => text(member?.personId)).filter((id): id is string => !!id) : []
      : [text(plan.organizerPersonId) ?? text(snapshot.actorPersonId)].filter((id): id is string => !!id);
    const candidateIds = Array.isArray(plan.candidates)
      ? plan.candidates.map(record).map((candidate) => text(candidate?.id)).filter((id): id is string => !!id) : [];
    const occasions = parseReviewedMealPlanOccasions(call.arguments.occasions, { candidateIds, eligiblePersonIds });
    if (!idempotencyKey || organizerNote === undefined || !occasions) {
      return { status: 'failed', code: 'meal_plan_finalization_invalid', message: 'Review at least one valid meal occasion with current candidates and eligible diners.', retryable: false };
    }
    const proposal = await stageProposal({ capabilityId: 'meal_planning', title: 'Finalize Meal Plan',
      body: `Finalizes this exact version with ${occasions.length} reviewed meal occasion${occasions.length === 1 ? '' : 's'}.`,
      operation: { type: call.toolId, targetType: 'meal_plan', targetId: planId,
        summary: 'Finalize Meal Plan', payload: { expectedVersion, occasions, organizerNote } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'meal_planning.candidates.prepare') {
    const horizon = mealPlanHorizon(call.arguments.horizon);
    const constraints = record(call.arguments.constraints) ?? {};
    const query = (constraints.query ?? 'best_use') as MealCandidateQuery;
    const maxResults = constraints.maxResults === undefined ? 3 : Number(constraints.maxResults);
    if (!horizon || !['make_now', 'almost_there', 'use_soon', 'stay_near_target', 'best_use'].includes(query)
      || !Number.isInteger(maxResults) || maxResults < 1 || maxResults > 3) {
      return { status: 'failed', code: 'meal_candidate_constraints_invalid', message: 'Choose a valid horizon, supported candidate goal, and 1 to 3 results.', retryable: false };
    }
    const recipes = (snapshot.recipes as unknown[]).flatMap((value) => {
      const recipe = record(value); const version = record(recipe?.version);
      const id = text(recipe?.recipeId); const versionId = text(version?.id); const title = text(version?.title);
      if (!recipe || !version || !id || !versionId || !title) return [];
      return [{ id, versionId, title,
        requiredConcepts: Array.isArray(version.ingredients) ? version.ingredients.flatMap((item) => {
          const ingredient = record(item);
          return ingredient?.optional === true ? [] : text(ingredient?.ingredientConcept) ? [text(ingredient?.ingredientConcept)!] : [];
        }) : [],
        estimatedGapCostCents: { min: 0, max: 0 }, lastCookedAt: null, useSoonConcepts: [],
      }];
    });
    const prepared = prepareMealCandidates({ query, recipes, stock: [], tripTargetCents: null,
      evidence: [{ capabilityId: 'recipes', authorized: true, fresh: true },
        { capabilityId: 'groceries', authorized: true, fresh: false }] });
    const candidates = selectMealPlanStarterCandidates(prepared, horizon as never).slice(0, maxResults);
    return { status: 'completed', receipt: null, output: { candidates,
      evidenceNotice: 'Recipe evidence is current. Stock and food-budget evidence were not available in this snapshot, so Kwilt does not claim these meals are on hand or near budget.' } };
  }
  if (call.toolId === 'meal_planning.preferences.read') {
    return mealPreferences
      ? { status: 'completed', output: mealPreferences, receipt: null }
      : { status: 'refused', reason: 'Only a Household caregiver can read shared meal preferences.' };
  }
  if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
  const expectedVersion = call.arguments.expectedVersion;
  if (!Number.isInteger(expectedVersion) || Number(expectedVersion) < 0) {
    return { status: 'failed', code: 'invalid_food_version', message: 'Read the current food setting before changing it.', retryable: false };
  }
  if (call.toolId === 'recipes.favorite.update' || call.toolId === 'recipes.visibility.update') {
    const recipeId = text(call.arguments.recipeId);
    if (!recipeId) return { status: 'failed', code: 'invalid_recipe_target', message: 'Choose one exact Recipe.', retryable: false };
    const refs = call.toolId === 'recipes.favorite.update' ? snapshot.recipeFavorites as unknown[] : snapshot.hiddenRecipes as unknown[];
    const beforeVersion = refs.includes(recipeId) ? 1 : 0;
    if (beforeVersion !== expectedVersion) return { status: 'refused', reason: 'That Recipe preference changed. Read it again before review.' };
    const favorite = call.arguments.favorite;
    const visibility = call.arguments.visibility;
    if (call.toolId === 'recipes.favorite.update' && typeof favorite !== 'boolean') {
      return { status: 'failed', code: 'invalid_recipe_preference', message: 'Choose whether this Recipe should be a favorite.', retryable: false };
    }
    if (call.toolId === 'recipes.visibility.update' && visibility !== 'visible' && visibility !== 'hidden') {
      return { status: 'failed', code: 'invalid_recipe_preference', message: 'Choose whether this Recipe should be visible or hidden.', retryable: false };
    }
    const title = call.toolId === 'recipes.favorite.update'
      ? `${favorite ? 'Favorite' : 'Unfavorite'} recipe`
      : `${visibility === 'hidden' ? 'Hide' : 'Restore'} recipe`;
    const proposal = await stageProposal({ capabilityId: 'recipes', title,
      body: 'Changes only this personal Recipe preference after review.', operation: {
        type: call.toolId, targetType: 'recipe_preference', targetId: recipeId,
        summary: title, payload: { expectedVersion, ...(call.toolId === 'recipes.favorite.update' ? { favorite } : { visibility }) },
      } });
    return { status: 'proposed', proposal };
  }
  if (!mealPreferences) return { status: 'refused', reason: 'Only a Household caregiver can change shared meal preferences.' };
  if (mealPreferences.version !== expectedVersion) return { status: 'refused', reason: 'Household meal preferences changed. Read them again before review.' };
  const fields = fieldsRecord(call.arguments.fields);
  if (!validMealFields(fields)) return { status: 'failed', code: 'invalid_meal_preferences', message: 'Choose at least one supported household meal preference.', retryable: false };
  const proposal = await stageProposal({ capabilityId: 'meal_planning', title: 'Update household meal preferences',
    body: 'Applies the reviewed diners, setup state, and food needs together under Household authority.', operation: {
      type: 'meal_planning.preferences.update', targetType: 'household_meal_preferences', targetId: text(mealPreferences.householdId),
      summary: 'Update household meal preferences', payload: { expectedVersion, patch: fields },
    } });
  return { status: 'proposed', proposal };
}
