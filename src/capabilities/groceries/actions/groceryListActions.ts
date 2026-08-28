import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { createGroceryRepository } from '../data/groceryRepository';

export type GroceryItemPatch = { concept?: string; quantityMin?: number | null; quantityMax?: number | null;
  unit?: string | null; note?: string | null };
export type GroceryListActionBoundary = {
  compile(planId: string, expectedVersion: number, requestId: string): Promise<Record<string, unknown>>;
  addItem(listId: string, expectedVersion: number, title: string, sourceKind: 'manual'|'household_request', requestId: string): Promise<Record<string, unknown>>;
  updateItem(itemId: string, expectedVersion: number, patch: GroceryItemPatch, reason: string | null, requestId: string): Promise<Record<string, unknown>>;
  setItemState(itemId: string, expectedVersion: number, state: 'needed'|'already_have'|'purchased'|'skipped', requestId: string): Promise<Record<string, unknown>>;
  markReviewed(listId: string, expectedVersion: number, requestId: string): Promise<Record<string, unknown>>;
};

export function createGroceryListActionBoundary(client: SupabaseClient = getSupabaseClient()): GroceryListActionBoundary {
  const repository = createGroceryRepository(client);
  const apply = async (operationId: string, targetId: string, expectedVersion: number,
    requestId: string, payload: Record<string, unknown>) => {
    const { data, error } = await client.rpc('apply_kwilt_grocery_list_conversational', {
      p_operation_id: operationId, p_target_id: targetId, p_expected_revision: expectedVersion,
      p_idempotency_key: requestId, p_payload: payload,
    });
    if (error) throw new Error(error.message);
    return data as Record<string, unknown>;
  };
  return {
    compile: (planId, expectedVersion) => repository.compile(planId, expectedVersion),
    addItem: (listId, expectedVersion, title, sourceKind, requestId) => apply('groceries.item.add', listId, expectedVersion, requestId, { title, sourceKind }),
    updateItem: (itemId, expectedVersion, patch, reason, requestId) => apply('groceries.item.update', itemId, expectedVersion, requestId, { patch, reason }),
    setItemState: (itemId, expectedVersion, state, requestId) => apply('groceries.item.set_state', itemId, expectedVersion, requestId, { state }),
    markReviewed: (listId, expectedVersion) => repository.markReviewed(listId, expectedVersion),
  };
}

function validatePatch(value: GroceryItemPatch): GroceryItemPatch {
  const keys = Object.keys(value);
  if (keys.length < 1 || keys.some((key) => !['concept','quantityMin','quantityMax','unit','note'].includes(key))) {
    throw new Error('grocery.patch_invalid');
  }
  if (value.concept !== undefined && !value.concept.trim()) throw new Error('grocery.patch_invalid');
  if (value.quantityMin !== undefined && value.quantityMin !== null && (!Number.isFinite(value.quantityMin) || value.quantityMin < 0)) throw new Error('grocery.quantity_invalid');
  if (value.quantityMax !== undefined && value.quantityMax !== null && (!Number.isFinite(value.quantityMax) || value.quantityMax < 0)) throw new Error('grocery.quantity_invalid');
  if (value.quantityMin != null && value.quantityMax != null && value.quantityMax < value.quantityMin) throw new Error('grocery.quantity_invalid');
  if (value.unit !== undefined && value.unit !== null && value.unit.length > 80) throw new Error('grocery.patch_invalid');
  if (value.note !== undefined && value.note !== null && value.note.length > 2_000) throw new Error('grocery.patch_invalid');
  return { ...value, ...(value.concept !== undefined ? { concept: value.concept.trim() } : {}) };
}

export function createGroceryListActions(boundary: GroceryListActionBoundary) {
  const requireInput = (input: { requestId: string; confirmed: boolean; expectedVersion?: number }) => {
    if (!input.confirmed) throw new Error('grocery.confirmation_required');
    if (!input.requestId.trim()) throw new Error('grocery.request_invalid');
    if (input.expectedVersion !== undefined && (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1)) throw new Error('grocery.version_invalid');
  };
  return {
    async compile(input: { requestId: string; confirmed: boolean; mealPlanId: string; mealPlanVersion: number }) {
      requireInput({ ...input, expectedVersion: input.mealPlanVersion });
      if (!input.mealPlanId.trim()) throw new Error('grocery.request_invalid');
      return await boundary.compile(input.mealPlanId, input.mealPlanVersion, input.requestId);
    },
    async addItem(input: { requestId: string; confirmed: boolean; groceryListId: string; expectedVersion: number;
      title: string; sourceKind: 'manual' | 'household_request' }) {
      requireInput(input);
      if (!input.groceryListId.trim() || !input.title.trim() || input.title.length > 320
        || !['manual','household_request'].includes(input.sourceKind)) throw new Error('grocery.item_invalid');
      return await boundary.addItem(input.groceryListId, input.expectedVersion, input.title.trim(), input.sourceKind, input.requestId);
    },
    async updateItem(input: { requestId: string; confirmed: boolean; groceryItemId: string; expectedVersion: number;
      patch: GroceryItemPatch; reason: string | null }) {
      requireInput(input);
      if (!input.groceryItemId.trim() || (input.reason !== null && input.reason.length > 1_000)) throw new Error('grocery.item_invalid');
      return await boundary.updateItem(input.groceryItemId, input.expectedVersion, validatePatch(input.patch), input.reason?.trim() || null, input.requestId);
    },
    async setItemState(input: { requestId: string; confirmed: boolean; groceryItemId: string; expectedVersion: number;
      state: 'needed' | 'already_have' | 'purchased' | 'removed' }) {
      requireInput(input);
      if (!input.groceryItemId.trim()) throw new Error('grocery.item_invalid');
      const persistedState = input.state === 'removed' ? 'skipped' : input.state;
      const result = await boundary.setItemState(input.groceryItemId, input.expectedVersion, persistedState, input.requestId);
      return { ...result, state: input.state };
    },
    async review(input: { requestId: string; confirmed: boolean; groceryListId: string; expectedVersion: number }) {
      requireInput(input);
      if (!input.groceryListId.trim()) throw new Error('grocery.item_invalid');
      return await boundary.markReviewed(input.groceryListId, input.expectedVersion, input.requestId);
    },
  };
}
export type GroceryListActions = ReturnType<typeof createGroceryListActions>;
