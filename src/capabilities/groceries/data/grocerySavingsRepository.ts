import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import type { SavingsOption } from '../domain/savingsContracts';

export function createGrocerySavingsRepository(client: SupabaseClient = getSupabaseClient()) {
  return {
    async prepare(groceryListId: string, expectedRevision: number): Promise<{ options: SavingsOption[]; status: 'ready' | 'no_verified_evidence'; evidenceCoveragePercent: number }> {
      const { data, error } = await client.functions.invoke('grocery-savings', { body: { groceryListId, expectedRevision } });
      if (error) throw new Error(error.message);
      return data as { options: SavingsOption[]; status: 'ready' | 'no_verified_evidence'; evidenceCoveragePercent: number };
    },
  };
}
