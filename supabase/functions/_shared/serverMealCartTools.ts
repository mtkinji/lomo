import type { ServerAgentProposalRecord, ServerAgentProposalRequest, ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';
import { mealPlanRecipeCandidate } from './serverMealPlanValidation.ts';
export const SERVER_MEAL_CART_TOOL_IDS = new Set(['meal_planning.cart.ensure', 'meal_planning.cart.add', 'meal_planning.cart.mark_made', 'meal_planning.cart.remove', 'meal_planning.history.read']);
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function text(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function uuid(value: unknown): string | null { const id = text(value); return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null; }
function timing(value: unknown): Record<string, unknown> | null {
  const input = record(value); if (!input) return null;
  if (input.kind === 'flexible' && Object.keys(input).length === 1) return { kind: 'flexible' };
  const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(String(input.mealPeriod))) return null;
  if (input.kind === 'occasion' && date(input.date) && Object.keys(input).every(key => ['kind', 'date', 'mealPeriod'].includes(key))) return { kind: input.kind, date: input.date, mealPeriod: input.mealPeriod };
  if (input.kind === 'coverage' && Array.isArray(input.dates) && input.dates.length > 0 && input.dates.length <= 31 && input.dates.every(date) && new Set(input.dates).size === input.dates.length && text(input.label) && String(input.label).length <= 120 && Object.keys(input).every(key => ['kind', 'dates', 'mealPeriod', 'label'].includes(key))) return { kind: input.kind, dates: input.dates, mealPeriod: input.mealPeriod, label: input.label };
  return null;
}
export async function executeServerMealCartTool(input: {
  snapshot: Record<string, unknown>; call: ServerAgentToolCall;
  client: { rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
}): Promise<ServerAgentToolResult | null> {
  const { snapshot, call, client, stageProposal } = input;
  if (!SERVER_MEAL_CART_TOOL_IDS.has(call.toolId)) return null;
  const fail = (code: string, message: string, retryable = false): ServerAgentToolResult => ({ status: 'failed', code, message, retryable });
  if (call.toolId === 'meal_planning.history.read') {
    const planId = text(call.arguments.mealPlanId);
    if (!planId || !client.rpc) return fail('meal_plan_not_found', 'Choose one exact Meal Plan.');
    const { data, error } = await client.rpc('get_kwilt_meal_cart_history', { p_plan_id: planId });
    const history = record(data);
    return !error && history && history.mealPlanId === planId && Array.isArray(history.history)
      ? { status: 'completed', output: history, receipt: null }
      : { status: 'refused', reason: 'That Meal Plan history is not available to the current person.' };
  }
  if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
  if (!text(call.arguments.idempotencyKey)) return fail('meal_cart_request_invalid', 'Provide a stable idempotency key.');
  let targetId: string | null = null; let payload: Record<string, unknown>; let title: string;
  if (call.toolId === 'meal_planning.cart.ensure') {
    const householdId = call.arguments.householdId === null ? null : uuid(call.arguments.householdId);
    if (call.arguments.householdId !== null && !householdId) return fail('meal_cart_context_invalid', 'Choose a personal cart or exact Household.');
    payload = { householdId }; title = 'Ensure ongoing Meal cart';
  } else {
    const planId = text(call.arguments.mealPlanId); const expectedVersion = call.arguments.expectedVersion;
    const plan = (snapshot.mealPlans as unknown[]).map(record).find(row => row?.id === planId);
    if (!plan) return fail('meal_plan_not_found', 'That Meal Plan is no longer available.');
    if (!Number.isInteger(expectedVersion) || expectedVersion !== plan.version) return fail('meal_plan_version_stale', 'That Meal Plan changed. Read its current version before continuing.', true);
    if (record(plan.horizon)?.kind !== 'open') return fail('meal_cart_horizon_invalid', 'Use an ongoing open-horizon Meal cart.');
    const candidateId = uuid(call.arguments.candidateId);
    if (!candidateId) return fail('meal_candidate_invalid', 'Choose a stable candidate UUID.');
    if (call.toolId === 'meal_planning.cart.add') {
      const portions = call.arguments.plannedPortions; const selectedTiming = timing(call.arguments.timing);
      const multiplier = call.arguments.recipeScaleMultiplier ?? 1;
      if (![1, 2, 3].includes(multiplier as number)) return fail('recipe_scale_invalid', 'Choose a supported explicit recipe multiplier: 1, 2, or 3.');
      if (!Number.isInteger(portions) || Number(portions) < 1 || Number(portions) > 24 || !selectedTiming) return fail('meal_candidate_invalid', 'Choose 1 to 24 portions and valid meal timing.');
      const recipe = (snapshot.recipes as unknown[]).map(record).find(row => record(row?.version)?.id === call.arguments.recipeVersionId);
      const candidate = recipe && mealPlanRecipeCandidate(recipe, candidateId, Number(portions));
      if (!candidate) return fail('recipe_version_not_found', 'Choose one exact authorized Recipe version.');
      if (multiplier !== 1 && record(recipe?.version)?.scalingState !== 'verified') return fail('recipe_scaling_unverified', 'This Recipe needs verified scaling before choosing a larger batch.');
      const yieldQuantity = record(recipe?.version)?.yieldQuantity;
      if (typeof yieldQuantity === 'number' && Number.isFinite(yieldQuantity) && yieldQuantity > 0 && Number(portions) > yieldQuantity * Number(multiplier)) return fail('recipe_portions_exceed_batch', 'This batch is smaller than the requested portions. Choose an explicitly supported larger batch or fewer portions.');
      candidate.recipeSnapshot = { ...record(candidate.recipeSnapshot), recipeScaleMultiplier: multiplier };
      targetId = planId; payload = { expectedVersion, candidate, timing: selectedTiming }; title = `Add ${candidate.title} to Meal cart`;
    } else {
      const candidate = (Array.isArray(plan.candidates) ? plan.candidates : []).map(record).find(row => row?.id === candidateId);
      if (!candidate) return fail('meal_candidate_not_found', 'That meal is no longer in this cart. Read its history.');
      targetId = candidateId; payload = { expectedVersion }; title = call.toolId === 'meal_planning.cart.mark_made' ? 'Mark meal made' : 'Retire meal from cart';
    }
  }
  const proposal = await stageProposal({ capabilityId: 'meal_planning', title, body: 'Preserves family edits, manual groceries, source Recipes, and meal history. Concurrent edits require a fresh review.', operation: { type: call.toolId, targetType: call.toolId === 'meal_planning.cart.mark_made' || call.toolId === 'meal_planning.cart.remove' ? 'meal_candidate' : 'meal_plan', targetId, summary: title, payload } });
  return { status: 'proposed', proposal };
}
