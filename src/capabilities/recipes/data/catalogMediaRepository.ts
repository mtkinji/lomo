import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { parseRecipeProjection, type RecipeProjection } from './recipeCache';

export type CatalogMediaRepository = { list(): Promise<RecipeProjection[]> };

const CATALOG_PAGE_SIZE = 500;

function assertHostedScalingContract(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid hosted Recipe scaling contract');
  const currentVersion = (value as Record<string, unknown>).currentVersion;
  if (!currentVersion || typeof currentVersion !== 'object' || Array.isArray(currentVersion)) throw new Error('Invalid hosted Recipe scaling contract');
  const version = currentVersion as Record<string, unknown>;
  if (!['verified', 'unavailable', 'review_required'].includes(String(version.scalingState)) || !Array.isArray(version.ingredients)) {
    throw new Error('Invalid hosted Recipe scaling contract');
  }
  for (const value of version.ingredients) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.prototype.hasOwnProperty.call(value, 'scaleRule')) {
      throw new Error('Ingredient scaling rule is missing from hosted Recipe');
    }
  }
}

function normalizeCatalogIdentity(projection: RecipeProjection): RecipeProjection {
  const rosterId = projection.catalog?.rosterId;
  if (!rosterId) throw new Error('Invalid hosted Recipe catalog projection');
  const recipeId = `kwilt-recipe-${rosterId.toLowerCase()}`;
  const versionId = `${recipeId}-v${projection.currentVersion.version}`;
  return parseRecipeProjection({
    ...projection,
    recipe: {
      ...projection.recipe,
      id: recipeId,
      currentVersionId: versionId,
    },
    currentVersion: {
      ...projection.currentVersion,
      id: versionId,
      recipeId,
      ingredients: projection.currentVersion.ingredients.map((ingredient) => ({
        ...ingredient,
        recipeVersionId: versionId,
      })),
      instructions: projection.currentVersion.instructions.map((instruction) => ({
        ...instruction,
        recipeVersionId: versionId,
      })),
    },
  });
}

function lastRosterId(rows: unknown): string | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[rows.length - 1];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const projection = (row as Record<string, unknown>).projection;
  if (!projection || typeof projection !== 'object' || Array.isArray(projection)) return null;
  const catalog = (projection as Record<string, unknown>).catalog;
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) return null;
  const rosterId = (catalog as Record<string, unknown>).rosterId;
  return typeof rosterId === 'string' && /^[A-Z]{2}[0-9]{3}$/.test(rosterId.toUpperCase())
    ? rosterId.toUpperCase()
    : null;
}

export function createCatalogMediaRepository(client: SupabaseClient = getSupabaseClient()): CatalogMediaRepository {
  return {
    async list() {
      const catalog: RecipeProjection[] = [];
      let cursor: string | null = null;
      while (true) {
        const { data, error } = await client.rpc('list_kwilt_recipe_catalog_v2', {
          p_after_roster_id: cursor,
          p_limit: CATALOG_PAGE_SIZE,
        });
        if (error) throw new Error(error.message || 'Hosted Recipe artwork unavailable');
        const rows = data ?? [];
        if (!Array.isArray(rows)) throw new Error('Invalid hosted Recipe catalog');
        for (const row of rows) {
          if (!row || typeof row !== 'object' || Array.isArray(row)) {
            throw new Error('Invalid hosted Recipe catalog row');
          }
          const rawProjection = (row as Record<string, unknown>).projection;
          assertHostedScalingContract(rawProjection);
          const projection = parseRecipeProjection(rawProjection);
          if (
            !projection.catalog ||
            projection.recipe.provenance.method !== 'catalog' ||
            projection.recipe.provenance.rightsBasis !== 'kwilt_authored'
          ) {
            throw new Error('Invalid hosted Recipe catalog projection');
          }
          catalog.push(normalizeCatalogIdentity(projection));
        }
        if (rows.length < CATALOG_PAGE_SIZE) return catalog;
        const nextCursor = lastRosterId(rows);
        if (!nextCursor || nextCursor === cursor) throw new Error('Invalid hosted Recipe catalog cursor');
        cursor = nextCursor;
      }
    },
  };
}
