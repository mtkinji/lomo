import seedData from './recipeEditorialEnrichment.seed.json';
import { STARTER_EDITORIAL_RECIPE_CATALOG } from './starterEditorialRecipeCatalog';
import { parseRecipeEditorialEnrichment, type RecipeEditorialEnrichment } from './recipeEditorialEnrichment';

const recipeByRosterId = new Map(
  STARTER_EDITORIAL_RECIPE_CATALOG.map((recipe) => [recipe.rosterId, recipe] as const),
);

export const RECIPE_EDITORIAL_ENRICHMENT_SEEDS: readonly RecipeEditorialEnrichment[] =
  seedData.recipes.map((value) => {
    const recipe = recipeByRosterId.get(value.rosterId);
    if (!recipe) throw new Error(`Recipe enrichment seed ${value.rosterId} has no canonical Recipe.`);
    return parseRecipeEditorialEnrichment(value, recipe.instructions, recipe.ingredients);
  });

export const RECIPE_EDITORIAL_ENRICHMENT_BY_ROSTER_ID = new Map(
  RECIPE_EDITORIAL_ENRICHMENT_SEEDS.map((record) => [record.rosterId, record] as const),
);
