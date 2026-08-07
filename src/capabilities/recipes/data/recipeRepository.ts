import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { parseRecipe, parseRecipeVersion } from '../domain/recipeContracts';
import { parseReviewedRecipeData, type ReviewedRecipeData } from '../domain/recipeValidation';
import type { RecipeProjection } from './recipeCache';

export type SaveRecipeInput = {
  recipeId: string | null;
  expectedVersion: number;
  idempotencyKey: string;
  reviewedData: unknown;
};

export type RecipeMutationReceipt = {
  recipeId: string;
  recipeVersionId?: string;
  version: number;
  idempotencyKey?: string;
  replayed?: boolean;
  deleted?: boolean;
};

export class RecipeRepositoryError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'RecipeRepositoryError';
  }
}

type RepositoryBoundary = { loadRows?: () => Promise<unknown[]> };

function mapError(error: { message?: string; code?: string } | null): RecipeRepositoryError {
  const message = error?.message ?? 'recipe_repository_failed';
  const stableCode = message.includes('stale_recipe_version') ? 'stale_recipe_version' : (error?.code ?? 'recipe_repository_failed');
  return new RecipeRepositoryError(stableCode, message);
}

function mapRow(row: any): RecipeProjection {
  if (row?.recipe && row?.currentVersion) {
    const recipe = parseRecipe(row.recipe);
    const currentVersion = parseRecipeVersion(row.currentVersion);
    if (recipe.currentVersionId !== currentVersion.id) throw new Error('Invalid Recipe projection relationship');
    return { recipe, currentVersion };
  }
  if (!row?.current_version) throw new Error('Invalid Recipe projection');
  const versionRow = Array.isArray(row.current_version) ? row.current_version[0] : row.current_version;
  const provenanceRow = Array.isArray(versionRow.provenance) ? versionRow.provenance[0] : versionRow.provenance;
  const recipe = parseRecipe({
    id: row.id,
    ownerPersonId: row.owner_person_id,
    currentVersionId: row.current_version_id,
    lifecycle: row.lifecycle,
    provenance: {
      id: provenanceRow?.id,
      method: provenanceRow?.method,
      sourceUrl: provenanceRow?.source_url ?? null,
      sourceTitle: provenanceRow?.source_title ?? null,
      sourceAuthor: provenanceRow?.source_author ?? null,
      sourceContentHash: provenanceRow?.source_content_hash ?? null,
      rightsBasis: provenanceRow?.rights_basis,
      importedAt: provenanceRow?.imported_at ?? null,
    },
    credits: (versionRow.credits ?? []).map((credit: any) => ({
      id: credit.id, role: credit.role, personId: credit.person_id ?? null,
      publicProfileId: credit.public_profile_id ?? null, displayLabel: credit.display_label ?? null,
      position: credit.position, publicVisible: credit.public_visible,
    })).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    lineage: (versionRow.lineage ?? []).map((lineage: any) => ({
      id: lineage.id, relationship: lineage.relationship, sourceRecipeId: lineage.source_recipe_id ?? null,
      sourceRecipeVersionId: lineage.source_recipe_version_id, sourcePublicationId: lineage.source_publication_id ?? null,
    })),
    accessGrants: (row.access_grants ?? []).map((grant: any) => ({
      id: grant.id, granteePersonId: grant.grantee_person_id, role: grant.role, status: grant.status,
      grantedByPersonId: grant.granted_by_person_id, expiresAt: grant.expires_at ?? null,
      createdAt: grant.created_at, revokedAt: grant.revoked_at ?? null,
    })),
    mediaAssets: (row.media_assets ?? []).map((media: any) => ({
      id: media.id, ownerPersonId: media.owner_person_id, storageRef: media.storage_ref,
      mediaType: media.media_type, rightsBasis: media.rights_basis, attribution: media.attribution ?? null,
      altText: media.alt_text ?? null, publicAllowed: media.public_allowed, lifecycle: media.lifecycle,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  const currentVersion = parseRecipeVersion({
    id: versionRow.id,
    recipeId: versionRow.recipe_id,
    version: versionRow.version,
    title: versionRow.title,
    description: versionRow.description ?? null,
    yieldQuantity: versionRow.yield_quantity === null ? null : Number(versionRow.yield_quantity),
    yieldUnit: versionRow.yield_unit ?? null,
    prepMinutes: versionRow.prep_minutes ?? null,
    cookMinutes: versionRow.cook_minutes ?? null,
    notes: versionRow.notes ?? null,
    ingredients: (versionRow.ingredients ?? []).map((line: any) => ({
      id: line.id, recipeVersionId: line.recipe_version_id, position: line.position,
      groupLabel: line.group_label ?? null, originalText: line.original_text,
      quantityMin: line.quantity_min === null ? null : Number(line.quantity_min),
      quantityMax: line.quantity_max === null ? null : Number(line.quantity_max), unit: line.unit ?? null,
      ingredientConcept: line.ingredient_concept ?? null, preparation: line.preparation ?? null,
      optional: line.optional, parseConfidence: line.parse_confidence === null ? null : Number(line.parse_confidence),
    })).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    instructions: (versionRow.instructions ?? []).map((step: any) => ({
      id: step.id, recipeVersionId: step.recipe_version_id, position: step.position,
      sectionLabel: step.section_label ?? null, text: step.step_text,
    })).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    createdByPersonId: versionRow.created_by_person_id,
    createdAt: versionRow.created_at,
    contentHash: versionRow.content_hash,
  });
  return { recipe, currentVersion };
}

export function createRecipeRepository(client: SupabaseClient = getSupabaseClient(), boundary: RepositoryBoundary = {}) {
  return {
    async list(): Promise<RecipeProjection[]> {
      try {
        let rows: unknown[];
        if (boundary.loadRows) rows = await boundary.loadRows();
        else {
          const query = client.from('kwilt_recipes').select(`
            *,
            current_version:kwilt_recipe_versions!kwilt_recipes_current_version_fk(
              *,
              ingredients:kwilt_recipe_ingredients(*),
              instructions:kwilt_recipe_instructions(*),
              provenance:kwilt_recipe_provenance(*),
              credits:kwilt_recipe_credits(*),
              lineage:kwilt_recipe_lineage!kwilt_recipe_lineage_recipe_version_id_fkey(*)
            ),
            access_grants:kwilt_recipe_access_grants(*),
            media_assets:kwilt_recipe_media_assets(*)
          `).order('updated_at', { ascending: false });
          const { data, error } = await query;
          if (error) throw mapError(error);
          rows = data ?? [];
        }
        return rows.map(mapRow);
      } catch (error) {
        if (error instanceof RecipeRepositoryError) throw error;
        throw new RecipeRepositoryError('invalid_recipe_projection', `Invalid Recipe projection: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    async save(input: SaveRecipeInput): Promise<RecipeMutationReceipt> {
      const reviewedData: ReviewedRecipeData = parseReviewedRecipeData(input.reviewedData);
      const { data, error } = await client.rpc('save_kwilt_recipe', {
        p_recipe_id: input.recipeId,
        p_expected_version: input.expectedVersion,
        p_idempotency_key: input.idempotencyKey,
        p_reviewed_data: reviewedData,
      });
      if (error) throw mapError(error);
      return data as unknown as RecipeMutationReceipt;
    },
    async delete(recipeId: string, expectedVersion: number): Promise<RecipeMutationReceipt> {
      const { data, error } = await client.rpc('delete_kwilt_recipe', { p_recipe_id: recipeId, p_expected_version: expectedVersion });
      if (error) throw mapError(error);
      return data as unknown as RecipeMutationReceipt;
    },
  };
}

export type RecipeRepository = ReturnType<typeof createRecipeRepository>;
