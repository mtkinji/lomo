import type {
  ServerAgentProposalRecord,
  ServerAgentProposalRequest,
  ServerAgentToolCall,
  ServerAgentToolResult,
} from './agentRuntime.ts';
import type { ServerDeviceActionRequest } from './serverDeviceHandoffs.ts';
import {
  effectiveFoodStockState,
  parseFoodStockObservation,
  type FoodStockObservation,
} from '../../../src/capabilities/groceries/domain/foodStockContracts.ts';

export const SERVER_GROCERY_TOOL_IDS = new Set([
  'food_budget.read', 'food_stock.read', 'food_stock.observe', 'food_stock.deplete',
  'groceries.compile', 'groceries.item.add', 'groceries.item.update',
  'groceries.item.set_state', 'groceries.list.review',
  'groceries.product_match.prepare', 'groceries.product_match.confirm', 'groceries.handoff.prepare', 'groceries.handoff.open',
]);

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

export async function executeServerGroceryTool({ snapshot, call, stageProposal, stageDeviceAction }: {
  snapshot: Record<string, unknown>;
  call: ServerAgentToolCall;
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
  stageDeviceAction?: (request: ServerDeviceActionRequest) => Promise<void>;
}): Promise<ServerAgentToolResult | null> {
  if (!SERVER_GROCERY_TOOL_IDS.has(call.toolId)) return null;
  if (call.toolId === 'food_budget.read') {
    const constraint = record(snapshot.foodCycle);
    return { status: 'completed', receipt: null, output: constraint ? {
      id: constraint.id, cycleRef: constraint.cycleRef, tripTargetCents: constraint.tripTargetCents,
      moneyEnvelope: constraint.moneyEnvelope ?? null, updatedAt: constraint.updatedAt,
      limitation: 'This is a food-cycle target and bounded Money envelope, not a claim that cash is safe to spend.',
    } : { cycleRef: 'next-shop', tripTargetCents: null, moneyEnvelope: null,
      limitation: 'No active food-cycle target is set. Kwilt does not infer cash safety.' } };
  }
  if (call.toolId === 'food_stock.read') {
    const requested = call.arguments.concepts;
    if (requested !== undefined && (!Array.isArray(requested) || requested.length > 100
      || requested.some((concept) => !text(concept)))) {
      return { status: 'failed', code: 'food_stock_concepts_invalid', message: 'Choose up to 100 stock concepts.', retryable: false };
    }
    const concepts = requested === undefined ? null
      : new Set((requested as unknown[]).map((concept) => text(concept)!.toLocaleLowerCase()));
    const latest = new Map<string, FoodStockObservation>();
    for (const value of snapshot.foodStock as unknown[]) {
      const input = record(value);
      if (!input) continue;
      try {
        const observation = parseFoodStockObservation(input as FoodStockObservation);
        const key = observation.concept.trim().toLocaleLowerCase();
        if (observation.correctedAt || (concepts && !concepts.has(key)) || latest.has(key)) continue;
        latest.set(key, observation);
      } catch { continue; }
    }
    return { status: 'completed', receipt: null, output: { observations: [...latest.values()].map((observation) => ({
      ...observation, effectiveState: effectiveFoodStockState(observation, String(snapshot.observedAt)),
    })) } };
  }
  if (call.toolId === 'food_stock.observe' || call.toolId === 'food_stock.deplete') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const expected = call.arguments.expectedObservationId === null ? null : text(call.arguments.expectedObservationId) ?? undefined;
    const idempotencyKey = text(call.arguments.idempotencyKey);
    const raw = call.toolId === 'food_stock.observe' ? record(call.arguments.observation) : {
      concept: text(call.arguments.concept), state: 'depleted', quantityMin: 0, quantityMax: 0, unit: null,
      source: 'voice', confidence: 1, observedAt: text(call.arguments.observedAt), expiresAt: null,
    };
    if (expected === undefined || !idempotencyKey || !raw) {
      return { status: 'failed', code: 'food_stock_input_invalid', message: 'Choose exact current stock evidence and a stable request key.', retryable: false };
    }
    let observation: FoodStockObservation;
    try {
      observation = parseFoodStockObservation({ id: 'pending', ownerPersonId: String(snapshot.actorPersonId), ...raw,
        supersedesObservationId: null, correctedAt: null } as FoodStockObservation);
    } catch (error) {
      return { status: 'failed', code: 'food_stock_observation_invalid', message: error instanceof Error ? error.message : 'Review the stock observation.', retryable: false };
    }
    const conceptKey = observation.concept.trim().toLocaleLowerCase();
    const current = (snapshot.foodStock as unknown[]).map(record).find((candidate) => !candidate?.correctedAt
      && text(candidate?.concept)?.toLocaleLowerCase() === conceptKey) ?? null;
    if ((current ? text(current.id) : null) !== expected) {
      return { status: 'failed', code: 'food_stock_observation_stale', message: 'That stock evidence changed. Read current stock before continuing.', retryable: true };
    }
    const title = call.toolId === 'food_stock.observe'
      ? `Update ${observation.concept.trim()} stock` : `Mark ${observation.concept.trim()} depleted`;
    const proposal = await stageProposal({ capabilityId: 'groceries', title,
      body: call.toolId === 'food_stock.observe'
        ? `Records reviewed ${observation.state} stock evidence without inferring food safety.`
        : 'Records reviewed depletion evidence without inferring when or why it was consumed.',
      operation: { type: call.toolId, targetType: 'food_stock_observation', targetId: expected,
        summary: title, payload: call.toolId === 'food_stock.observe'
          ? { expectedObservationId: expected, observation: raw }
          : { expectedObservationId: expected, concept: observation.concept, observedAt: observation.observedAt } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'groceries.list.review') {
    const listId = text(call.arguments.groceryListId);
    const groceryList = (snapshot.groceryLists as unknown[]).map(record).find((candidate) => text(candidate?.id) === listId);
    return groceryList ? { status: 'completed', output: { groceryList }, receipt: null }
      : { status: 'failed', code: 'grocery_list_not_found', message: 'That Grocery list is not available.', retryable: false };
  }
  if (call.toolId === 'groceries.compile') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const planId = text(call.arguments.mealPlanId); const version = Number(call.arguments.mealPlanVersion);
    const requestId = text(call.arguments.idempotencyKey);
    const plan = (snapshot.mealPlans as unknown[]).map(record).find((candidate) => text(candidate?.id) === planId);
    if (!plan || !Number.isInteger(version) || version < 1 || plan.version !== version || plan.state !== 'finalized' || !requestId) {
      return { status: 'failed', code: 'grocery_compile_invalid', message: 'Choose the exact current finalized Meal Plan and a stable request key.', retryable: Boolean(plan && plan.version !== version) };
    }
    const proposal = await stageProposal({ capabilityId: 'groceries', title: 'Compile Grocery list',
      body: 'Compiles the exact finalized Meal Plan into a provenance-preserving Grocery list for mobile review.',
      operation: { type: call.toolId, targetType: 'grocery_list', targetId: planId,
        summary: 'Compile Grocery list', payload: { expectedVersion: version, mealPlanVersion: version } },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'groceries.item.add' || call.toolId === 'groceries.item.update' || call.toolId === 'groceries.item.set_state') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_food_proposal_persistence_unavailable', retryable: false };
    const listRows = (snapshot.groceryLists as unknown[]).map(record);
    const itemId = text(call.arguments.groceryItemId);
    const list = call.toolId === 'groceries.item.add'
      ? listRows.find((candidate) => text(candidate?.id) === text(call.arguments.groceryListId))
      : listRows.find((candidate) => Array.isArray(candidate?.items)
        && (candidate.items as unknown[]).map(record).some((item) => text(item?.id) === itemId));
    const expectedVersion = Number(call.arguments.expectedVersion); const requestId = text(call.arguments.idempotencyKey);
    if (!list) return { status: 'failed', code: 'grocery_list_not_found', message: 'That Grocery item or list is not available.', retryable: false };
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1 || list.revision !== expectedVersion) {
      return { status: 'failed', code: 'grocery_version_stale', message: 'That Grocery list changed. Review its current version before continuing.', retryable: true };
    }
    if (!requestId) return { status: 'failed', code: 'grocery_request_invalid', message: 'Use a stable request key.', retryable: false };
    let title: string; let body: string; let payload: Record<string, unknown>; let targetId: string;
    if (call.toolId === 'groceries.item.add') {
      const itemTitle = text(call.arguments.title); const sourceKind = text(call.arguments.sourceKind);
      if (!itemTitle || !['manual', 'household_request'].includes(sourceKind ?? '')) return { status: 'failed', code: 'grocery_item_invalid', message: 'Choose an item title and provenance.', retryable: false };
      title = `Add ${itemTitle}`; body = 'Adds one reviewed item with distinct manual or household-request provenance.';
      payload = { expectedVersion, title: itemTitle, sourceKind }; targetId = String(list.id);
    } else if (call.toolId === 'groceries.item.update') {
      const patch = record(call.arguments.patch); const reason = call.arguments.reason === null ? null : nullableText(call.arguments.reason, 1_000);
      const allowed = ['concept', 'quantityMin', 'quantityMax', 'unit', 'note'];
      if (!patch || Object.keys(patch).length < 1 || Object.keys(patch).some((key) => !allowed.includes(key)) || reason === undefined) {
        return { status: 'failed', code: 'grocery_item_invalid', message: 'Choose a bounded Grocery item correction.', retryable: false };
      }
      title = 'Correct Grocery item'; body = 'Preserves original source evidence and records this reviewed correction.';
      payload = { expectedVersion, patch, reason }; targetId = itemId!;
    } else {
      const state = text(call.arguments.state);
      if (!state || !['needed', 'already_have', 'purchased', 'removed'].includes(state)) return { status: 'failed', code: 'grocery_item_invalid', message: 'Choose a supported Grocery item state.', retryable: false };
      title = `Mark Grocery item ${state.replace('_', ' ')}`; body = 'Changes only the reviewed Grocery item state.';
      payload = { expectedVersion, state }; targetId = itemId!;
    }
    const proposal = await stageProposal({ capabilityId: 'groceries', title, body,
      operation: { type: call.toolId, targetType: call.toolId === 'groceries.item.add' ? 'grocery_list' : 'grocery_item',
        targetId, summary: title, payload },
    });
    return { status: 'proposed', proposal };
  }
  if (call.toolId === 'groceries.product_match.prepare' || call.toolId === 'groceries.product_match.confirm') {
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const groceryItemId = text(call.arguments.groceryItemId);
    const list = (snapshot.groceryLists as unknown[]).map(record).find((candidate) => Array.isArray(candidate?.items)
      && (candidate.items as unknown[]).map(record).some((item) => text(item?.id) === groceryItemId));
    if (!list || !groceryItemId) return { status: 'failed', code: 'grocery_item_not_found', message: 'That Grocery item is no longer available.', retryable: false };
    const provider = text(call.arguments.provider);
    if (provider !== 'kroger') return { status: 'unavailable', reason: 'Product matching is currently available through native Kroger-family retailer review.', retryable: false };
    const locationId = text(call.arguments.locationId); const retailerProductId = text(call.arguments.retailerProductId);
    const evidenceObservedAt = text(call.arguments.evidenceObservedAt);
    if (call.toolId === 'groceries.product_match.prepare' && !locationId) {
      return { status: 'needs_input', prompt: 'Which confirmed retailer location should Kwilt use?', fields: ['locationId'] };
    }
    if (call.toolId === 'groceries.product_match.confirm'
      && (!retailerProductId || !evidenceObservedAt || !Number.isFinite(Date.parse(evidenceObservedAt)))) {
      return { status: 'failed', code: 'retailer_product_evidence_invalid', message: 'Choose one exact current retailer product from native review.', retryable: false };
    }
    const request: ServerDeviceActionRequest = {
      capabilityId: 'groceries', actionType: 'open_grocery_product_match', targetType: 'grocery_item', targetId: groceryItemId,
      title: call.toolId === 'groceries.product_match.prepare' ? 'Review retailer product matches' : 'Confirm retailer product match',
      consequenceSummary: 'Kwilt will show the retailer matches. Nothing is ordered, and checkout has not happened.',
      payload: { groceryListId: list.id, provider, ...(locationId ? { locationId } : {}),
        ...(retailerProductId ? { retailerProductId, evidenceObservedAt } : {}) },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (call.toolId === 'groceries.handoff.prepare') {
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const groceryListId = text(call.arguments.groceryListId); const provider = text(call.arguments.provider);
    const idempotencyKey = text(call.arguments.idempotencyKey);
    const list = (snapshot.groceryLists as unknown[]).map(record).find((candidate) => text(candidate?.id) === groceryListId);
    if (!list) return { status: 'failed', code: 'grocery_list_not_found', message: 'That Grocery list is no longer available.', retryable: false };
    if (list.status !== 'ready' || !provider || !['instacart', 'kroger', 'amazon', 'walmart'].includes(provider) || !idempotencyKey) {
      return { status: 'failed', code: 'grocery_handoff_not_ready', message: 'Review the current Grocery list and choose a supported retailer before preparing handoff.', retryable: true };
    }
    const request: ServerDeviceActionRequest = {
      capabilityId: 'groceries', actionType: 'open_grocery_handoff', targetType: 'grocery_list', targetId: groceryListId,
      title: 'Review retailer handoff',
      consequenceSummary: 'Kwilt will open the retailer with this Grocery list. You still choose products, substitutions, delivery time, payment, and checkout.',
      payload: { provider, expectedVersion: list.revision, idempotencyKey },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (call.toolId === 'groceries.handoff.open') {
    if (!stageDeviceAction) return { status: 'unavailable', reason: 'server_food_device_handoff_unavailable', retryable: false };
    const retailerHandoffId = text(call.arguments.retailerHandoffId);
    const handoff = (snapshot.retailerHandoffs as unknown[]).map(record)
      .find((candidate) => text(candidate?.id) === retailerHandoffId);
    const groceryListId = text(handoff?.groceryListId); const provider = text(handoff?.provider);
    const expiresAt = text(handoff?.expiresAt); const observedAt = text(snapshot.observedAt);
    if (!handoff || !groceryListId || !provider || handoff.state !== 'provider_link_created'
      || !expiresAt || !observedAt || Date.parse(expiresAt) <= Date.parse(observedAt)) {
      return { status: 'failed', code: 'grocery_handoff_not_found', message: 'That current retailer handoff is not available to open.', retryable: false };
    }
    const request: ServerDeviceActionRequest = {
      capabilityId: 'groceries', actionType: 'open_grocery_handoff', targetType: 'grocery_list', targetId: groceryListId,
      title: 'Open retailer product review',
      consequenceSummary: 'Kwilt will open the retailer review. You still handle substitutions, delivery time, payment, checkout, and order support there.',
      payload: { retailerHandoffId, provider, expiresAt },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  return null;
}
