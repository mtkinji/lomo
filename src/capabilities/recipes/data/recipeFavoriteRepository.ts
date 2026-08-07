import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../../services/backend/supabaseClient';

function parseRecipeRef(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid recipe favorite');
  return value;
}

export function createRecipeFavoriteRepository(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(): Promise<string[]> {
      const { data, error } = await client
        .from('kwilt_recipe_favorites')
        .select('recipe_ref')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: { recipe_ref?: unknown }) => parseRecipeRef(row.recipe_ref));
    },
    async set(recipeRef: string, favorite: boolean): Promise<void> {
      const validatedRef = parseRecipeRef(recipeRef);
      const { error } = await client.rpc('set_kwilt_recipe_favorite', {
        p_recipe_ref: validatedRef,
        p_favorite: favorite,
      });
      if (error) throw new Error(error.message);
    },
  };
}

export type RecipeFavoriteRepository = ReturnType<typeof createRecipeFavoriteRepository>;
