import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';

export type RecipeCollaborationRole = 'viewer' | 'contributor' | 'maintainer';
export type RecipeCollaborationReceipt = {
  grantId: string; recipeId: string; recipientPersonId: string; role: RecipeCollaborationRole;
  status: 'active'; version: number; replayed: boolean;
};

export type RecipeCollaborationActionBoundary = {
  invite(input: {
    recipeId: string; recipientPersonId: string; role: RecipeCollaborationRole;
    expectedVersion: number; requestId: string;
  }): Promise<RecipeCollaborationReceipt>;
};

export function createRecipeCollaborationActionBoundary(
  client: SupabaseClient = getSupabaseClient(),
): RecipeCollaborationActionBoundary {
  return {
    async invite(input) {
      const { data, error } = await client.rpc('invite_kwilt_recipe_collaborator_conversational', {
        p_recipe_id: input.recipeId, p_recipient_person_id: input.recipientPersonId,
        p_role: input.role, p_expected_version: input.expectedVersion,
        p_idempotency_key: input.requestId,
      });
      if (error) throw new Error(error.message);
      return data as unknown as RecipeCollaborationReceipt;
    },
  };
}

export function createRecipeCollaborationActions(boundary: RecipeCollaborationActionBoundary) {
  return {
    async invite(input: {
      requestId: string; confirmed: boolean; recipeId: string; recipientPersonId: string;
      role: RecipeCollaborationRole; expectedVersion: number;
    }) {
      if (!input.confirmed) throw new Error('recipe_collaboration.confirmation_required');
      if (!input.recipeId || !input.recipientPersonId || input.recipeId === input.recipientPersonId
        || !['viewer', 'contributor', 'maintainer'].includes(input.role)
        || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
        throw new Error('recipe_collaboration.invalid_invite');
      }
      return boundary.invite(input);
    },
  };
}

export type RecipeCollaborationActions = ReturnType<typeof createRecipeCollaborationActions>;
