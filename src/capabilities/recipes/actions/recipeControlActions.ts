import type { HiddenRecipeRepository } from '../data/hiddenRecipeRepository';
import type { RecipeFavoriteRepository } from '../data/recipeFavoriteRepository';

type Receipt = {
  status: 'completed';
  operationId: 'recipes.favorite.update' | 'recipes.visibility.update';
  resourceId: string;
  effectiveVersion: 0 | 1;
  beforeVersion: 0 | 1;
};

export class RecipePreferenceStaleError extends Error {
  constructor() { super('recipe_preference.stale_state'); }
}

function requireConfirmed(confirmed: boolean): void {
  if (!confirmed) throw new Error('recipe_preference.confirmation_required');
}

function coalesced<TInput extends { requestId: string }, TResult>(
  pending: Map<string, Promise<TResult>>,
  input: TInput,
  execute: () => Promise<TResult>,
): Promise<TResult> {
  const existing = pending.get(input.requestId);
  if (existing) return existing;
  const promise = execute().finally(() => pending.delete(input.requestId));
  pending.set(input.requestId, promise);
  return promise;
}

export function createRecipeControlActions(repositories: {
  favorite: RecipeFavoriteRepository;
  hidden: HiddenRecipeRepository;
}) {
  const pending = new Map<string, Promise<Receipt>>();
  return {
    async readPreferenceState(recipeId: string) {
      const [favorites, hidden] = await Promise.all([repositories.favorite.list(), repositories.hidden.list()]);
      return {
        recipeId,
        favorite: favorites.includes(recipeId),
        visibility: hidden.includes(recipeId) ? 'hidden' as const : 'visible' as const,
      };
    },
    setFavorite(input: { requestId: string; confirmed: boolean; recipeId: string; expectedVersion: number; favorite: boolean }): Promise<Receipt> {
      return coalesced(pending, input, async () => {
        requireConfirmed(input.confirmed);
        const current = await repositories.favorite.list();
        const beforeVersion = current.includes(input.recipeId) ? 1 : 0;
        if (input.expectedVersion !== beforeVersion) throw new RecipePreferenceStaleError();
        await repositories.favorite.set(input.recipeId, input.favorite);
        return { status: 'completed', operationId: 'recipes.favorite.update', resourceId: input.recipeId,
          beforeVersion, effectiveVersion: input.favorite ? 1 : 0 };
      });
    },
    setVisibility(input: { requestId: string; confirmed: boolean; recipeId: string; expectedVersion: number; visibility: 'visible' | 'hidden' }): Promise<Receipt> {
      return coalesced(pending, input, async () => {
        requireConfirmed(input.confirmed);
        const current = await repositories.hidden.list();
        const beforeVersion = current.includes(input.recipeId) ? 1 : 0;
        if (input.expectedVersion !== beforeVersion) throw new RecipePreferenceStaleError();
        const hidden = input.visibility === 'hidden';
        await repositories.hidden.set(input.recipeId, hidden);
        return { status: 'completed', operationId: 'recipes.visibility.update', resourceId: input.recipeId,
          beforeVersion, effectiveVersion: hidden ? 1 : 0 };
      });
    },
  };
}

export type RecipeControlActions = ReturnType<typeof createRecipeControlActions>;
