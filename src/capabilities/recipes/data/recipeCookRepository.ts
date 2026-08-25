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
  outcomeRating: number | null;
  privateNote: string | null;
  substitutions: Array<{
    id: string;
    ingredientLineId: string;
    ingredientText: string;
    usedInstead: string;
    resultRating: number | null;
    note: string | null;
  }>;
  completedAt: string;
};

const COOK_RECORD_SELECT = [
  'id',
  'session_id',
  'recipe_id',
  'recipe_version_id',
  'serving_scale',
  'would_make_again',
  'outcome_rating',
  'private_note',
  'completed_at',
  'kwilt_recipe_cook_substitutions(id,source_ingredient_line_id,ingredient_text,used_instead,result_rating,note)',
].join(',');

function rating(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null;
}

function mapCookRecord(row: Record<string, unknown>): RecipeCookRecordProjection {
  const nestedSubstitutions = row.substitutions ?? row.kwilt_recipe_cook_substitutions;
  const substitutions = Array.isArray(nestedSubstitutions)
    ? nestedSubstitutions
    : [];
  return {
    id: String(row.id), sessionId: String(row.sessionId ?? row.session_id), recipeId: String(row.recipeId ?? row.recipe_id), recipeVersionId: String(row.recipeVersionId ?? row.recipe_version_id),
    servingScale: Number(row.servingScale ?? row.serving_scale), wouldMakeAgain: typeof (row.wouldMakeAgain ?? row.would_make_again) === 'boolean' ? (row.wouldMakeAgain ?? row.would_make_again) as boolean : null,
    outcomeRating: rating(row.outcomeRating ?? row.outcome_rating), privateNote: typeof (row.privateNote ?? row.private_note) === 'string' ? (row.privateNote ?? row.private_note) as string : null,
    substitutions: substitutions.map((value) => {
      const substitution = value as Record<string, unknown>;
      return {
        id: String(substitution.id),
        ingredientLineId: String(substitution.ingredientLineId ?? substitution.source_ingredient_line_id),
        ingredientText: String(substitution.ingredientText ?? substitution.ingredient_text),
        usedInstead: String(substitution.usedInstead ?? substitution.used_instead),
        resultRating: rating(substitution.resultRating ?? substitution.result_rating),
        note: typeof substitution.note === 'string' ? substitution.note : null,
      };
    }),
    completedAt: String(row.completedAt ?? row.completed_at),
  };
}
export function createRecipeCookRepository(client: SupabaseClient = getSupabaseClient(), cache: Cache = recipeCookCache) {
  return {
    readActive(userId: string) { return cache.read(userId); },
    async save(userId: string, value: RecipeCookSession): Promise<{ session: RecipeCookSession; remote: 'synced' | 'pending' }> {
      const session = parseRecipeCookSession(value); await cache.write(userId, session);
      try {
        const legacyRpcSession: Record<string, unknown> = { ...session, servingScale: session.recipeScaleMultiplier };
        delete legacyRpcSession.recipeScaleMultiplier;
        const { error } = await client.rpc('sync_kwilt_recipe_cook_session', { p_session: legacyRpcSession, p_expected_revision: Math.max(0, session.revision - 1) });
        if (error) throw error; return { session, remote: 'synced' };
      } catch { return { session, remote: 'pending' }; }
    },
    clear(userId: string) { return cache.clear(userId); },
    async saveLearning(learning: RecipeCookLearning): Promise<void> {
      const { error } = await client.rpc('save_kwilt_recipe_cook_journal', {
        p_session_id: learning.record.sessionId,
        p_would_make_again: learning.record.wouldMakeAgain,
        p_outcome_rating: learning.record.outcomeRating,
        p_private_note: learning.record.privateNote,
        p_recipe_edit_proposal: learning.recipeEditProposal,
        p_substitutions: learning.record.substitutions.map((substitution) => ({
          ingredientLineId: substitution.ingredientLineId,
          usedInstead: substitution.usedInstead,
          resultRating: substitution.resultRating,
          note: substitution.note,
        })),
      });
      if (error) throw new Error(error.message);
    },
    async listRecent(limit = 6): Promise<RecipeCookRecordProjection[]> {
      const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)));
      const { data, error } = await client.from('kwilt_recipe_cook_records').select(COOK_RECORD_SELECT).order('completed_at', { ascending: false }).limit(safeLimit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => mapCookRecord(row as unknown as Record<string, unknown>));
    },
    async historyForRecipe(recipeId: string, limit = 6): Promise<{ cookCount: number; records: RecipeCookRecordProjection[] }> {
      const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)));
      const { data, error } = await client.rpc('list_kwilt_recipe_cook_journal', { p_recipe_ref: recipeId, p_limit: safeLimit });
      if (error) throw new Error(error.message);
      const envelope = data as unknown as { cookCount?: unknown; records?: unknown } | null;
      const records = Array.isArray(envelope?.records) ? envelope.records : [];
      return {
        cookCount: Math.max(0, Number(envelope?.cookCount ?? 0)),
        records: records.map((row) => mapCookRecord(row as Record<string, unknown>)),
      };
    },
    async latestForRecipe(recipeId: string): Promise<RecipeCookRecordProjection | null> {
      const history = await this.historyForRecipe(recipeId, 1);
      return history.records[0] ?? null;
    },
  };
}
export type RecipeCookRepository = ReturnType<typeof createRecipeCookRepository>;
