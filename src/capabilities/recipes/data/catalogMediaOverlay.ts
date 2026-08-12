import type { RecipeMediaAsset } from '../domain/recipeContracts';
import type { RecipeProjection } from './recipeCache';

export type HostedCatalogMedia = { rosterId: string; media: RecipeMediaAsset };

let mediaByRecipeId = new Map<string, RecipeMediaAsset>();

function parseMedia(value: unknown): RecipeMediaAsset | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const media = value as Record<string, unknown>;
  if (
    typeof media.id !== 'string' || typeof media.ownerPersonId !== 'string' ||
    typeof media.storageRef !== 'string' || !/^https:\/\//.test(media.storageRef) ||
    typeof media.mediaType !== 'string' || !media.mediaType.startsWith('image/') ||
    media.rightsBasis !== 'kwilt_authored' || media.publicAllowed !== true || media.lifecycle !== 'active'
  ) return null;
  return {
    id: media.id,
    ownerPersonId: media.ownerPersonId,
    storageRef: media.storageRef,
    mediaType: media.mediaType,
    rightsBasis: 'kwilt_authored',
    attribution: typeof media.attribution === 'string' ? media.attribution : null,
    altText: typeof media.altText === 'string' ? media.altText : null,
    publicAllowed: true,
    lifecycle: 'active',
  };
}
export function parseHostedCatalogMediaRows(rows: unknown): HostedCatalogMedia[] {
  if (!Array.isArray(rows)) throw new Error('Invalid hosted Recipe catalog');
  const parsed: HostedCatalogMedia[] = [];
  for (const row of rows) {
    const projection = row && typeof row === 'object' && !Array.isArray(row)
      ? (row as Record<string, unknown>).projection
      : null;
    if (!projection || typeof projection !== 'object' || Array.isArray(projection)) continue;
    const object = projection as Record<string, unknown>;
    const catalog = object.catalog && typeof object.catalog === 'object' && !Array.isArray(object.catalog)
      ? object.catalog as Record<string, unknown>
      : null;
    const recipe = object.recipe && typeof object.recipe === 'object' && !Array.isArray(object.recipe)
      ? object.recipe as Record<string, unknown>
      : null;
    const rosterId = typeof catalog?.rosterId === 'string' ? catalog.rosterId.toUpperCase() : '';
    if (!/^[A-Z]{2}[0-9]{3}$/.test(rosterId) || !Array.isArray(recipe?.mediaAssets)) continue;
    const media = recipe.mediaAssets.map(parseMedia).find((asset): asset is RecipeMediaAsset => asset !== null);
    if (media) parsed.push({ rosterId, media });
  }
  return parsed;
}

export function replaceHostedCatalogMedia(overlays: readonly HostedCatalogMedia[], options: { allowEmpty?: boolean } = {}): boolean {
  if (!overlays.length && !options.allowEmpty) return false;
  mediaByRecipeId = new Map(overlays.map(({ rosterId, media }) => [`kwilt-recipe-${rosterId.toLowerCase()}`, media]));
  return true;
}

export function applyHostedCatalogMedia(projection: RecipeProjection): RecipeProjection {
  const media = mediaByRecipeId.get(projection.recipe.id);
  if (!media) return projection;
  return { ...projection, recipe: { ...projection.recipe, mediaAssets: [media] } };
}
