import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { parseRecipeCookSession, type RecipeCookSession } from '../domain/recipeCookContracts';
import type { RecipeCookLearning } from '../domain/recipeCookLearning';
import { createRecipeCookCache, recipeCookCache } from './recipeCookCache';

type Cache = ReturnType<typeof createRecipeCookCache>;
export type RecipeCookRecordProjection = {
  id: string;
  sessionId: string;
  recipeId: string;
  recipeVersionId: string;
  servingScale: number;
  wouldMakeAgain: boolean | null;
  privateNote: string | null;
  completedAt: string;
};

function mapCookRecord(row: Record<string, unknown>): RecipeCookRecordProjection {
  return {
    id: String(row.id), sessionId: String(row.session_id), recipeId: String(row.recipe_id), recipeVersionId: String(row.recipe_version_id),
    servingScale: Number(row.serving_scale), wouldMakeAgain: typeof row.would_make_again === 'boolean' ? row.would_make_again : null,
    privateNote: typeof row.private_note === 'string' ? row.private_note : null, completedAt: String(row.completed_at),
  };
}
export function createRecipeCookRepository(client: SupabaseClient = getSupabaseClient(), cache: Cache = recipeCookCache) {
  return {
    readActive(userId: string) { return cache.read(userId); },
    async save(userId: string, value: RecipeCookSession): Promise<{ session: RecipeCookSession; remote: 'synced' | 'pending' }> {
      const session = parseRecipeCookSession(value); await cache.write(userId, session);
      try {
        const { error } = await client.rpc('sync_kwilt_recipe_cook_session', { p_session: session, p_expected_revision: Math.max(0, session.revision - 1) });
        if (error) throw error; return { session, remote: 'synced' };
      } catch { return { session, remote: 'pending' }; }
    },
    clear(userId: string) { return cache.clear(userId); },
    async saveLearning(learning: RecipeCookLearning): Promise<void> {
      const { error } = await client.rpc('save_kwilt_recipe_cook_learning', {
        p_session_id: learning.record.sessionId,
        p_would_make_again: learning.record.wouldMakeAgain,
        p_private_note: learning.record.privateNote,
        p_recipe_edit_proposal: learning.recipeEditProposal,
      });
      if (error) throw new Error(error.message);
    },
    async listRecent(limit = 6): Promise<RecipeCookRecordProjection[]> {
      const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)));
      const { data, error } = await client.from('kwilt_recipe_cook_records').select('id,session_id,recipe_id,recipe_version_id,serving_scale,would_make_again,private_note,completed_at').order('completed_at', { ascending: false }).limit(safeLimit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => mapCookRecord(row));
    },
    async latestForRecipe(recipeId: string): Promise<RecipeCookRecordProjection | null> {
      const { data, error } = await client.from('kwilt_recipe_cook_records').select('id,session_id,recipe_id,recipe_version_id,serving_scale,would_make_again,private_note,completed_at').eq('recipe_id', recipeId).order('completed_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapCookRecord(data) : null;
    },
  };
}
export type RecipeCookRepository = ReturnType<typeof createRecipeCookRepository>;
