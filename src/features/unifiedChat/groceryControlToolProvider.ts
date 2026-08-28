import type { AgentToolCall, AgentToolDefinition, AgentToolExecutionResult } from '@kwilt/agent-runtime';
import { effectiveFoodStockState, type FoodStockObservation } from '../../capabilities/groceries/domain/foodStockContracts';
import type { FoodCycleConstraint } from '../../capabilities/groceries/data/foodCycleRepository';
import { createFoodStockActions, type FoodStockActions, type FoodStockObservationInput } from '../../capabilities/groceries/actions/foodStockActions';
import type { GroceryProposalOperation } from './groceryProposal';
import type { GroceryProjection, GroceryRetailerHandoff } from '../../capabilities/groceries/data/groceryRepository';
import { createGroceryListActions, type GroceryItemPatch, type GroceryListActions } from '../../capabilities/groceries/actions/groceryListActions';

export type StagedGroceryControlProposal = { capabilityId: 'groceries'; title: string; body: string; operation: GroceryProposalOperation };
export type StagedGroceryClientAction = {
  capabilityId: 'groceries'; actionType: 'open_grocery_product_match' | 'open_grocery_handoff';
  targetType: 'grocery_item' | 'grocery_list'; targetId: string; title: string;
  consequenceSummary: string; payload: Record<string, unknown>;
};

export function createGroceryControlToolProvider({ stock, cycle, lists, handoffs, mealPlans, stockActions, groceryActions, stageProposal, now = () => new Date().toISOString() }: {
  stock: { list(): Promise<FoodStockObservation[]> };
  cycle: { current(cycleRef?: string): Promise<FoodCycleConstraint | null> };
  lists?: { list(): Promise<GroceryProjection[]> };
  handoffs?: { resolve(handoffId: string): Promise<GroceryRetailerHandoff | null> };
  mealPlans?: { list(): Promise<Array<{ id: string; version: number; state: string }>> };
  stockActions?: Pick<FoodStockActions, 'observe' | 'deplete'>;
  groceryActions?: Pick<GroceryListActions, 'compile' | 'addItem' | 'updateItem' | 'setItemState'>;
  stageProposal?: (proposal: StagedGroceryControlProposal) => void;
  now?: () => string;
}) {
  const actions: StagedGroceryClientAction[] = [];
  return { async execute(call: AgentToolCall, tool: AgentToolDefinition): Promise<AgentToolExecutionResult | null> {
    if (call.toolId !== tool.id) return { status: 'failed', code: 'tool_mismatch', message: 'The discovered tool does not match this call.', retryable: false };
    if (call.toolId === 'food_budget.read') {
      const constraint = await cycle.current('next-shop');
      return { status: 'completed', receipt: null, output: constraint ? {
        id: constraint.id, cycleRef: constraint.cycleRef, tripTargetCents: constraint.targetCents,
        moneyEnvelope: constraint.moneyEnvelope, updatedAt: constraint.updatedAt,
        limitation: 'This is a food-cycle target and bounded Money envelope, not a claim that cash is safe to spend.',
      } : { cycleRef: 'next-shop', tripTargetCents: null, moneyEnvelope: null,
        limitation: 'No active food-cycle target is set. Kwilt does not infer cash safety.' },
      };
    }
    if (call.toolId === 'food_stock.read') {
      const requested = call.arguments.concepts;
      if (requested !== undefined && (!Array.isArray(requested) || requested.length > 100
        || requested.some((concept) => typeof concept !== 'string' || !concept.trim()))) {
        return { status: 'failed', code: 'food_stock_concepts_invalid', message: 'Choose up to 100 stock concepts.', retryable: false };
      }
      const concepts = requested === undefined ? null
        : new Set((requested as string[]).map((concept) => concept.trim().toLocaleLowerCase()));
      const latest = new Map<string, FoodStockObservation>();
      for (const observation of await stock.list()) {
        const key = observation.concept.trim().toLocaleLowerCase();
        if (observation.correctedAt || (concepts && !concepts.has(key)) || latest.has(key)) continue;
        latest.set(key, observation);
      }
      return { status: 'completed', receipt: null, output: { observations: [...latest.values()].map((observation) => ({
        ...observation, effectiveState: effectiveFoodStockState(observation, now()),
      })) } };
    }
    if (call.toolId === 'food_stock.observe') {
      const observation = call.arguments.observation as FoodStockObservationInput;
      const expectedObservationId = call.arguments.expectedObservationId;
      const idempotencyKey = typeof call.arguments.idempotencyKey === 'string' ? call.arguments.idempotencyKey.trim() : '';
      if (expectedObservationId !== null && (typeof expectedObservationId !== 'string' || !expectedObservationId.trim())) {
        return { status: 'failed', code: 'food_stock_expected_invalid', message: 'Choose the exact stock observation being replaced, or null if none exists.', retryable: false };
      }
      try {
        const validator = stockActions ?? createFoodStockActions({ apply: async () => ({ observationId: 'validation-only', operationId: 'food_stock.observe', replayed: false }) });
        await validator.observe({ requestId: idempotencyKey, confirmed: true, expectedObservationId: expectedObservationId as string | null, observation });
      } catch (error) {
        return { status: 'failed', code: 'food_stock_observation_invalid', message: error instanceof Error ? error.message : 'Review the stock observation.', retryable: false };
      }
      const proposal: StagedGroceryControlProposal = { capabilityId: 'groceries', title: `Update ${observation.concept.trim()} stock`,
        body: `Records reviewed ${observation.state} stock evidence without inferring food safety.`,
        operation: { type: 'food_stock.observe', targetId: expectedObservationId as string | null,
          expectedObservationId: expectedObservationId as string | null, payload: { observation } } };
      stageProposal?.(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'food_stock.deplete') {
      const concept = typeof call.arguments.concept === 'string' ? call.arguments.concept.trim() : '';
      const observedAt = typeof call.arguments.observedAt === 'string' ? call.arguments.observedAt : '';
      const expectedObservationId = call.arguments.expectedObservationId;
      const idempotencyKey = typeof call.arguments.idempotencyKey === 'string' ? call.arguments.idempotencyKey.trim() : '';
      if (expectedObservationId !== null && (typeof expectedObservationId !== 'string' || !expectedObservationId.trim())) {
        return { status: 'failed', code: 'food_stock_expected_invalid', message: 'Choose the exact stock observation being depleted, or null if none exists.', retryable: false };
      }
      try {
        const validator = stockActions ?? createFoodStockActions({ apply: async () => ({ observationId: 'validation-only', operationId: 'food_stock.deplete', replayed: false }) });
        await validator.deplete({ requestId: idempotencyKey, confirmed: true, concept,
          expectedObservationId: expectedObservationId as string | null, observedAt });
      } catch (error) {
        return { status: 'failed', code: 'food_stock_depletion_invalid', message: error instanceof Error ? error.message : 'Review the depletion evidence.', retryable: false };
      }
      const proposal: StagedGroceryControlProposal = { capabilityId: 'groceries', title: `Mark ${concept} depleted`,
        body: 'Records reviewed depletion evidence without inferring when or why it was consumed.',
        operation: { type: 'food_stock.deplete', targetId: expectedObservationId as string | null,
          expectedObservationId: expectedObservationId as string | null, payload: { concept, observedAt } } };
      stageProposal?.(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'groceries.list.review') {
      const groceryListId = typeof call.arguments.groceryListId === 'string' ? call.arguments.groceryListId.trim() : '';
      const list = (await lists?.list() ?? []).find((candidate) => candidate.id === groceryListId);
      return list
        ? { status: 'completed', receipt: null, output: { groceryList: list } }
        : { status: 'failed', code: 'grocery_list_not_found', message: 'That Grocery list is not available.', retryable: false };
    }
    if (call.toolId === 'groceries.compile') {
      const mealPlanId = typeof call.arguments.mealPlanId === 'string' ? call.arguments.mealPlanId.trim() : '';
      const mealPlanVersion = Number(call.arguments.mealPlanVersion);
      const requestId = typeof call.arguments.idempotencyKey === 'string' ? call.arguments.idempotencyKey.trim() : '';
      if (!mealPlanId || !Number.isInteger(mealPlanVersion) || mealPlanVersion < 1 || !requestId) {
        return { status: 'failed', code: 'grocery_compile_invalid', message: 'Choose an exact finalized Meal Plan version and a stable request key.', retryable: false };
      }
      const plan = (await mealPlans?.list() ?? []).find((candidate) => candidate.id === mealPlanId);
      if (!plan || plan.version !== mealPlanVersion || plan.state !== 'finalized') {
        return { status: 'failed', code: 'grocery_compile_stale', message: 'Choose the exact current finalized Meal Plan before compiling groceries.', retryable: Boolean(plan) };
      }
      const proposal: StagedGroceryControlProposal = { capabilityId: 'groceries', title: 'Compile Grocery list',
        body: 'Compiles the exact finalized Meal Plan into a provenance-preserving Grocery list for review.',
        operation: { type: 'groceries.compile', targetId: mealPlanId, expectedVersion: mealPlanVersion,
          payload: { mealPlanVersion } } };
      stageProposal?.(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'groceries.item.add' || call.toolId === 'groceries.item.update' || call.toolId === 'groceries.item.set_state') {
      const projections = await lists?.list() ?? [];
      const expectedVersion = Number(call.arguments.expectedVersion);
      const requestId = typeof call.arguments.idempotencyKey === 'string' ? call.arguments.idempotencyKey.trim() : '';
      const list = call.toolId === 'groceries.item.add'
        ? projections.find((candidate) => candidate.id === call.arguments.groceryListId)
        : projections.find((candidate) => candidate.items.some((item) => item.id === call.arguments.groceryItemId));
      if (!list) return { status: 'failed', code: 'grocery_list_not_found', message: 'That Grocery item or list is not available.', retryable: false };
      if (!Number.isInteger(expectedVersion) || expectedVersion !== list.revision) {
        return { status: 'failed', code: 'grocery_version_stale', message: 'That Grocery list changed. Review its current version before continuing.', retryable: true };
      }
      const validator = groceryActions ?? createGroceryListActions({
        compile: async () => ({ groceryListId: list.id, revision: list.revision, status: 'review_needed', replayed: false }),
        addItem: async () => ({}), updateItem: async () => ({}), setItemState: async () => ({}), markReviewed: async () => ({}),
      } as never);
      let operation: GroceryProposalOperation; let title: string; let body: string;
      try {
        if (call.toolId === 'groceries.item.add') {
          const itemTitle = typeof call.arguments.title === 'string' ? call.arguments.title.trim() : '';
          const sourceKind = call.arguments.sourceKind as 'manual' | 'household_request';
          await validator.addItem({ requestId, confirmed: true, groceryListId: list.id, expectedVersion, title: itemTitle, sourceKind });
          title = `Add ${itemTitle}`; body = `Adds one reviewed ${sourceKind === 'household_request' ? 'household request' : 'manual item'} with distinct provenance.`;
          operation = { type: call.toolId, targetId: list.id, expectedVersion, payload: { title: itemTitle, sourceKind } };
        } else if (call.toolId === 'groceries.item.update') {
          const itemId = String(call.arguments.groceryItemId); const patch = call.arguments.patch as GroceryItemPatch;
          const reason = call.arguments.reason === null ? null : typeof call.arguments.reason === 'string' ? call.arguments.reason : null;
          await validator.updateItem({ requestId, confirmed: true, groceryItemId: itemId, expectedVersion, patch, reason });
          title = 'Correct Grocery item'; body = 'Preserves the original source evidence and records this reviewed correction.';
          operation = { type: call.toolId, targetId: itemId, expectedVersion, payload: { patch, reason } };
        } else {
          const itemId = String(call.arguments.groceryItemId);
          const state = call.arguments.state as 'needed' | 'already_have' | 'purchased' | 'removed';
          await validator.setItemState({ requestId, confirmed: true, groceryItemId: itemId, expectedVersion, state });
          title = `Mark Grocery item ${state.replace('_', ' ')}`; body = 'Changes only the reviewed Grocery item state.';
          operation = { type: call.toolId, targetId: itemId, expectedVersion, payload: { state } };
        }
      } catch (error) {
        return { status: 'failed', code: 'grocery_item_invalid', message: error instanceof Error ? error.message : 'Review the Grocery item change.', retryable: false };
      }
      const proposal: StagedGroceryControlProposal = { capabilityId: 'groceries', title, body, operation };
      stageProposal?.(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'groceries.product_match.prepare' || call.toolId === 'groceries.product_match.confirm') {
      const groceryItemId = typeof call.arguments.groceryItemId === 'string' ? call.arguments.groceryItemId.trim() : '';
      const projections = await lists?.list() ?? [];
      const list = projections.find((candidate) => candidate.items.some((item) => item.id === groceryItemId));
      if (!list) return { status: 'failed', code: 'grocery_item_not_found', message: 'That Grocery item is no longer available.', retryable: false };
      const provider = typeof call.arguments.provider === 'string' ? call.arguments.provider.trim() : '';
      if (provider !== 'kroger') {
        return { status: 'unavailable', reason: 'Product matching is currently available through the native Kroger-family retailer review.', retryable: false };
      }
      const locationId = typeof call.arguments.locationId === 'string' ? call.arguments.locationId.trim() : '';
      const retailerProductId = typeof call.arguments.retailerProductId === 'string' ? call.arguments.retailerProductId.trim() : '';
      const evidenceObservedAt = typeof call.arguments.evidenceObservedAt === 'string' ? call.arguments.evidenceObservedAt : '';
      if (call.toolId === 'groceries.product_match.prepare' && !locationId) {
        return { status: 'needs_input', prompt: 'Which confirmed retailer location should Kwilt use?', fields: ['locationId'] };
      }
      if (call.toolId === 'groceries.product_match.confirm'
        && (!retailerProductId || !Number.isFinite(Date.parse(evidenceObservedAt)))) {
        return { status: 'failed', code: 'retailer_product_evidence_invalid', message: 'Choose one exact current retailer product from native review.', retryable: false };
      }
      const request: StagedGroceryClientAction = {
        capabilityId: 'groceries', actionType: 'open_grocery_product_match', targetType: 'grocery_item', targetId: groceryItemId,
        title: call.toolId === 'groceries.product_match.prepare' ? `Review retailer matches for ${groceryItemId}` : 'Confirm retailer product match',
        consequenceSummary: call.toolId === 'groceries.product_match.prepare'
          ? 'Kwilt will open current retailer candidates. No product is selected and nothing is added to a cart.'
          : 'Kwilt will open the exact native substitution review. The mapping is not confirmed until you approve it there.',
        payload: { groceryListId: list.id, provider,
          ...(locationId ? { locationId } : {}), ...(retailerProductId ? { retailerProductId, evidenceObservedAt } : {}) },
      };
      actions.push(request);
      return { status: 'pending_client_action', provider: 'device', request: request as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'groceries.handoff.prepare') {
      const groceryListId = typeof call.arguments.groceryListId === 'string' ? call.arguments.groceryListId.trim() : '';
      const provider = typeof call.arguments.provider === 'string' ? call.arguments.provider.trim() : '';
      const idempotencyKey = typeof call.arguments.idempotencyKey === 'string' ? call.arguments.idempotencyKey.trim() : '';
      const list = (await lists?.list() ?? []).find((candidate) => candidate.id === groceryListId);
      if (!list) return { status: 'failed', code: 'grocery_list_not_found', message: 'That Grocery list is no longer available.', retryable: false };
      if (list.status !== 'ready' || !['instacart', 'kroger', 'amazon', 'walmart'].includes(provider) || !idempotencyKey) {
        return { status: 'failed', code: 'grocery_handoff_not_ready', message: 'Review the current Grocery list and choose a supported retailer before preparing handoff.', retryable: true };
      }
      const request: StagedGroceryClientAction = {
        capabilityId: 'groceries', actionType: 'open_grocery_handoff', targetType: 'grocery_list', targetId: list.id,
        title: 'Review retailer handoff',
        consequenceSummary: 'Kwilt will open the reviewed Grocery handoff. The retailer still owns product choices, substitutions, slot, payment, and checkout.',
        payload: { provider, expectedVersion: list.revision, idempotencyKey },
      };
      actions.push(request);
      return { status: 'pending_client_action', provider: 'device', request: request as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'groceries.handoff.open') {
      const retailerHandoffId = typeof call.arguments.retailerHandoffId === 'string' ? call.arguments.retailerHandoffId.trim() : '';
      const handoff = retailerHandoffId ? await handoffs?.resolve(retailerHandoffId) ?? null : null;
      if (!handoff || handoff.state !== 'provider_link_created'
        || !Number.isFinite(Date.parse(handoff.expiresAt)) || Date.parse(handoff.expiresAt) <= Date.parse(now())) {
        return { status: 'failed', code: 'grocery_handoff_not_found', message: 'That current retailer handoff is not available to open.', retryable: false };
      }
      const request: StagedGroceryClientAction = {
        capabilityId: 'groceries', actionType: 'open_grocery_handoff', targetType: 'grocery_list', targetId: handoff.groceryListId,
        title: 'Open retailer product review',
        consequenceSummary: 'Kwilt will open the exact reviewed handoff. The retailer still owns substitutions, slot, payment, checkout, fulfillment, and support.',
        payload: { retailerHandoffId: handoff.id, provider: handoff.provider, expiresAt: handoff.expiresAt },
      };
      actions.push(request);
      return { status: 'pending_client_action', provider: 'device', request: request as unknown as Record<string, unknown> };
    }
    return null;
  }, actions: (): readonly StagedGroceryClientAction[] => [...actions] };
}
