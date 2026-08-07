import type { RecipeProjection } from '../data/recipeCache';
import type { MealPlanHorizon } from '../../meal-planning/domain/mealPlanContracts';

export type EditorialCollectionJobIntent =
  | 'inspire_achievable'
  | 'escape_rotation'
  | 'explore_cuisine'
  | 'plan_budget'
  | 'reduce_effort';

export type CollectionDiscoveryRole = 'familiar_anchor' | 'adjacent_discovery' | 'stretch';

export type CollectionMealEntry = {
  id: string;
  recipeId: string;
  recipeVersion: number;
  discoveryRole: CollectionDiscoveryRole;
  whyTry: string;
  whyDoable: string;
  firstTimeNote?: string;
};

export type EditorialCollection = {
  id: string;
  slug: string;
  version: number;
  title: string;
  deck: string;
  eyebrow: string;
  jobIntent: EditorialCollectionJobIntent;
  heroRecipeId: string;
  editorialOwner: string;
  culturalSources: readonly string[];
  sections: ReadonlyArray<{
    id: string;
    title: string;
    note: string;
    entries: readonly CollectionMealEntry[];
  }>;
  mealPlanTemplateId?: string;
};

export type MealPlanTemplateSlot = {
  id: string;
  recipeId: string;
  recipeVersion: number;
  role: 'quick_anchor' | 'longer_cook' | 'ingredient_bridge' | 'leftovers_use';
  reason: string;
  alternativeRecipeIds?: readonly string[];
};

/** Meal Planning-owned authored proposal. Collection code may reference it but never adopts it directly. */
export type EditorialMealPlanTemplate = {
  id: string;
  version: number;
  sourceCollectionId: string;
  sourceCollectionVersion: number;
  title: string;
  horizon: MealPlanHorizon;
  defaultServings: number;
  basketRationale: string;
  slots: readonly MealPlanTemplateSlot[];
};

export type MealEditorialPlacement = {
  slot: 'after_third_shelf' | 'after_sixth_shelf';
  collectionId: string;
};

export type MealEditorialEdition = {
  id: string;
  startsAt: string;
  endsAt: string;
  placements: readonly MealEditorialPlacement[];
};

export function findEditorialCollection(
  collections: readonly EditorialCollection[],
  collectionId: string,
): EditorialCollection | null {
  return collections.find((collection) => collection.id === collectionId) ?? null;
}

export function collectionRecipeIds(collection: EditorialCollection): string[] {
  return collection.sections.flatMap((section) => section.entries.map((entry) => entry.recipeId));
}

export function validateEditorialMealSystem(input: {
  collections: readonly EditorialCollection[];
  templates: readonly EditorialMealPlanTemplate[];
  recipes: readonly RecipeProjection[];
  edition: MealEditorialEdition;
}): string[] {
  const errors: string[] = [];
  const recipeById = new Map(input.recipes.map((projection) => [projection.recipe.id, projection]));
  const collectionById = new Map(input.collections.map((collection) => [collection.id, collection]));
  const templateById = new Map(input.templates.map((template) => [template.id, template]));
  const seenCollectionIds = new Set<string>();

  for (const collection of input.collections) {
    if (seenCollectionIds.has(collection.id)) errors.push(`Collection ${collection.id} is duplicated.`);
    seenCollectionIds.add(collection.id);
    const hero = recipeById.get(collection.heroRecipeId);
    if (!hero) errors.push(`Collection ${collection.id} references hero Recipe ${collection.heroRecipeId}, which is missing.`);
    if (collection.jobIntent === 'explore_cuisine' && !collection.culturalSources.length) {
      errors.push(`Collection ${collection.id} requires a cultural source for cuisine framing.`);
    }
    const seenRecipeIds = new Set<string>();
    for (const section of collection.sections) {
      for (const entry of section.entries) {
        const recipe = recipeById.get(entry.recipeId);
        if (!recipe) errors.push(`Collection ${collection.id} references missing Recipe ${entry.recipeId}.`);
        else if (recipe.currentVersion.version !== entry.recipeVersion) {
          errors.push(`Collection ${collection.id} expects ${entry.recipeId} version ${entry.recipeVersion}.`);
        }
        if (seenRecipeIds.has(entry.recipeId)) errors.push(`Collection ${collection.id} duplicates Recipe ${entry.recipeId}.`);
        seenRecipeIds.add(entry.recipeId);
        if (!entry.whyTry.trim() || !entry.whyDoable.trim()) {
          errors.push(`Collection entry ${entry.id} must explain why to try it and why it is doable.`);
        }
      }
    }
    if (collection.mealPlanTemplateId && !templateById.has(collection.mealPlanTemplateId)) {
      errors.push(`Collection ${collection.id} references missing template ${collection.mealPlanTemplateId}.`);
    }
  }

  for (const template of input.templates) {
    const source = collectionById.get(template.sourceCollectionId);
    if (!source) errors.push(`Template ${template.id} references missing Collection ${template.sourceCollectionId}.`);
    else if (source.version !== template.sourceCollectionVersion) errors.push(`Template ${template.id} has a stale Collection version.`);
    if (template.defaultServings < 1) errors.push(`Template ${template.id} requires a positive serving assumption.`);
    if (template.horizon.kind === 'meal_count' && template.horizon.count !== template.slots.length) {
      errors.push(`Template ${template.id} meal-count horizon must match its slots.`);
    }
    const seenRecipeIds = new Set<string>();
    for (const slot of template.slots) {
      const recipe = recipeById.get(slot.recipeId);
      if (!recipe) errors.push(`Template ${template.id} references missing Recipe ${slot.recipeId}.`);
      else if (recipe.currentVersion.version !== slot.recipeVersion) errors.push(`Template ${template.id} expects ${slot.recipeId} version ${slot.recipeVersion}.`);
      if (seenRecipeIds.has(slot.recipeId)) errors.push(`Template ${template.id} duplicates Recipe ${slot.recipeId}.`);
      seenRecipeIds.add(slot.recipeId);
    }
  }

  if (input.edition.placements.length > 2) errors.push(`Edition ${input.edition.id} must have at most two placements.`);
  for (const placement of input.edition.placements) {
    if (!collectionById.has(placement.collectionId)) {
      errors.push(`Edition ${input.edition.id} references missing Collection ${placement.collectionId}.`);
    }
  }
  return errors;
}
