import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { parseFoodStockObservation, type FoodStockObservation, type FoodStockState } from '../domain/foodStockContracts';

export type FoodStockObservationInput = Pick<FoodStockObservation,
  'concept' | 'state' | 'quantityMin' | 'quantityMax' | 'unit' | 'source' | 'confidence' | 'observedAt' | 'expiresAt'>;
export type FoodStockActionOperation = 'food_stock.observe' | 'food_stock.deplete';
export type FoodStockActionReceipt = { observationId: string; operationId: FoodStockActionOperation; replayed: boolean };
export type FoodStockActionBoundary = { apply(input: {
  operationId: FoodStockActionOperation; expectedObservationId: string | null; requestId: string;
  payload: Record<string, unknown>;
}): Promise<FoodStockActionReceipt> };

export function createFoodStockActionBoundary(client: SupabaseClient = getSupabaseClient()): FoodStockActionBoundary {
  return { async apply(input) {
    const { data, error } = await client.rpc('apply_kwilt_food_stock_conversational', {
      p_operation_id: input.operationId, p_expected_observation_id: input.expectedObservationId,
      p_idempotency_key: input.requestId, p_payload: input.payload,
    });
    if (error) throw new Error(error.message);
    return data as unknown as FoodStockActionReceipt;
  } };
}

function validateObservation(input: FoodStockObservationInput): FoodStockObservationInput {
  const parsed = parseFoodStockObservation({ id: 'pending', ownerPersonId: 'pending', ...input,
    supersedesObservationId: null, correctedAt: null });
  return { concept: parsed.concept.trim(), state: parsed.state, quantityMin: parsed.quantityMin,
    quantityMax: parsed.quantityMax, unit: parsed.unit?.trim() || null, source: parsed.source,
    confidence: parsed.confidence, observedAt: parsed.observedAt, expiresAt: parsed.expiresAt };
}

export function createFoodStockActions(boundary: FoodStockActionBoundary) {
  const validateRequest = (requestId: string, confirmed: boolean) => {
    if (!confirmed) throw new Error('food_stock.confirmation_required');
    if (!requestId.trim()) throw new Error('food_stock.request_invalid');
  };
  const validateExpected = (value: string | null) => {
    if (value !== null && !value.trim()) throw new Error('food_stock.expected_observation_invalid');
  };
  return {
    async observe(input: { requestId: string; confirmed: boolean; expectedObservationId: string | null; observation: FoodStockObservationInput }) {
      validateRequest(input.requestId, input.confirmed); validateExpected(input.expectedObservationId);
      const observation = validateObservation(input.observation);
      return await boundary.apply({ operationId: 'food_stock.observe', expectedObservationId: input.expectedObservationId,
        requestId: input.requestId, payload: { observation } });
    },
    async deplete(input: { requestId: string; confirmed: boolean; concept: string; expectedObservationId: string | null; observedAt: string }) {
      validateRequest(input.requestId, input.confirmed); validateExpected(input.expectedObservationId);
      const observation = validateObservation({ concept: input.concept, state: 'depleted' as FoodStockState,
        quantityMin: 0, quantityMax: 0, unit: null, source: 'voice', confidence: 1,
        observedAt: input.observedAt, expiresAt: null });
      return await boundary.apply({ operationId: 'food_stock.deplete', expectedObservationId: input.expectedObservationId,
        requestId: input.requestId, payload: observation });
    },
  };
}

export type FoodStockActions = ReturnType<typeof createFoodStockActions>;
