import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { parseFoodStockObservation, type FoodStockObservation } from '../domain/foodStockContracts';

type ObservationInput = Omit<FoodStockObservation, 'id' | 'ownerPersonId' | 'correctedAt'>;
export function createFoodStockRepository(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(): Promise<FoodStockObservation[]> {
      const { data, error } = await client.from('kwilt_food_stock_observations').select('*').order('observed_at', { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => parseFoodStockObservation({ id: row.id, ownerPersonId: row.owner_person_id, concept: row.concept, state: row.state, quantityMin: row.quantity_min === null ? null : Number(row.quantity_min), quantityMax: row.quantity_max === null ? null : Number(row.quantity_max), unit: row.unit, source: row.source, confidence: Number(row.confidence), observedAt: row.observed_at, expiresAt: row.expires_at, supersedesObservationId: row.supersedes_observation_id, correctedAt: row.corrected_at }));
    },
    async observe(observation: ObservationInput): Promise<unknown> {
      const { data, error } = await client.rpc('observe_kwilt_food_stock', { p_observation: observation }); if (error) throw new Error(error.message); return data;
    },
  };
}
export type FoodStockRepository = ReturnType<typeof createFoodStockRepository>;
