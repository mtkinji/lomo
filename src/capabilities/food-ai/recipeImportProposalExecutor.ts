import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { parseReviewedRecipeData } from '../recipes/domain/recipeValidation';
import type { RecipeMutationReceipt } from '../recipes/data/recipeRepository';

export function createRecipeImportProposalExecutor(client: SupabaseClient = getSupabaseClient()) {
  return {
    async approve(input: { draftId: string; expectedDraftVersion: number; idempotencyKey: string; reviewedData: unknown }): Promise<RecipeMutationReceipt> {
      const reviewedData = parseReviewedRecipeData(input.reviewedData);
      const { data, error } = await client.rpc('approve_kwilt_recipe_import_conversational', {
        p_draft_id: input.draftId,
        p_expected_draft_version: input.expectedDraftVersion,
        p_idempotency_key: input.idempotencyKey,
        p_reviewed_data: reviewedData,
      });
      if (error) throw new Error(error.message);
      return data as unknown as RecipeMutationReceipt;
    },
  };
}
