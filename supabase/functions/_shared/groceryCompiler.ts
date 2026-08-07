import { buildGroceryCompilation, type GroceryCompilerLine } from '../../../packages/food-core/src/index.ts';

export type GroceryAuthorityInput = {
  plan: { id: string; version: number; state: string; organizer_person_id: string };
  expectedVersion: number;
  actorPersonId: string;
  entries: Array<{ id: string; plan_version: number; servings: number | null; recipe_snapshot: Record<string, unknown> | null }>;
  ingredientsByVersionId: Record<string, Array<{ id: string; original_text: string; optional: boolean }>>;
};

type IngredientAuthority = { id: string; original_text: string; optional: boolean };

export type RecipeGrocerySource = {
  recipeId: string;
  recipeVersionId: string;
  recipeVersion: number;
  contentHash: string;
  sourceType: string;
  title: string;
  yieldQuantity: number | null;
  ingredients: Array<{ id: string; originalText: string; optional: boolean }>;
};

function catalogIngredients(snapshot: Record<string, unknown>, recipeVersionId: string): IngredientAuthority[] | null {
  if (snapshot.sourceType !== 'catalog'
    || !/^kwilt-recipe-[a-z0-9-]+-v\d+$/.test(recipeVersionId)
    || typeof snapshot.contentHash !== 'string'
    || !/^kwilt:[A-Z0-9-]+:v\d+$/.test(snapshot.contentHash)
    || !Array.isArray(snapshot.ingredients)
    || snapshot.ingredients.length > 200) return null;

  const ingredients: IngredientAuthority[] = [];
  for (const value of snapshot.ingredients) {
    if (!value || typeof value !== 'object') return null;
    const ingredient = value as Record<string, unknown>;
    if (typeof ingredient.id !== 'string'
      || !ingredient.id.startsWith(`${recipeVersionId}-ingredient-`)
      || typeof ingredient.originalText !== 'string'
      || !ingredient.originalText.trim()
      || ingredient.originalText.length > 500
      || typeof ingredient.optional !== 'boolean') return null;
    ingredients.push({ id: ingredient.id, original_text: ingredient.originalText, optional: ingredient.optional });
  }
  return ingredients;
}

export function compileGroceryAuthority(input: GroceryAuthorityInput) {
  if (input.plan.organizer_person_id !== input.actorPersonId) throw new Error('grocery_plan_not_owned');
  if (input.plan.state !== 'finalized' || input.plan.version !== input.expectedVersion) throw new Error('stale_or_unfinalized_meal_plan');
  const lines: GroceryCompilerLine[] = [];
  const catalogVersionIds = new Set<string>();
  for (const entry of input.entries) {
    if (entry.plan_version !== input.expectedVersion || !entry.recipe_snapshot) continue;
    const recipeVersionId = typeof entry.recipe_snapshot.recipeVersionId === 'string' ? entry.recipe_snapshot.recipeVersionId : '';
    const fromYield = typeof entry.recipe_snapshot.yieldQuantity === 'number' ? entry.recipe_snapshot.yieldQuantity : null;
    const ingredients = input.ingredientsByVersionId[recipeVersionId]
      ?? catalogIngredients(entry.recipe_snapshot, recipeVersionId);
    if (!recipeVersionId || !ingredients) throw new Error('missing_recipe_version');
    if (!input.ingredientsByVersionId[recipeVersionId]) catalogVersionIds.add(recipeVersionId);
    for (const ingredient of ingredients) lines.push({ originalText: ingredient.original_text, recipeVersionId, ingredientLineId: ingredient.id, planEntryId: entry.id, fromYield, toYield: entry.servings, optional: ingredient.optional });
  }
  const compiled = buildGroceryCompilation(lines);
  const originalBySource = new Map(lines.map((line) => [`${line.recipeVersionId}:${line.ingredientLineId}:${line.planEntryId}`, line.originalText]));
  return { items: compiled.items.map((item) => ({ ...item, sources: item.sources.map((source) => ({
    ...source,
    kind: catalogVersionIds.has(source.recipeVersionId) ? 'catalog_recipe_ingredient' : 'recipe_ingredient',
    originalText: originalBySource.get(`${source.recipeVersionId}:${source.ingredientLineId}:${source.planEntryId}`) ?? null,
  })) })) };
}

export function compileRecipeGroceryAuthority(input: {
  source: RecipeGrocerySource;
  servings: number;
  authoritativeIngredients: IngredientAuthority[] | null;
}) {
  if (!input.source.recipeId.trim()
    || !input.source.recipeVersionId.trim()
    || !Number.isInteger(input.source.recipeVersion)
    || input.source.recipeVersion < 1
    || !input.source.contentHash.trim()
    || !input.source.title.trim()
    || !Number.isFinite(input.servings)
    || input.servings <= 0) throw new Error('invalid_recipe_grocery_source');

  const ingredients = input.authoritativeIngredients
    ?? catalogIngredients(input.source as unknown as Record<string, unknown>, input.source.recipeVersionId);
  if (!ingredients) throw new Error('missing_recipe_version');

  const sourceRef = `recipe:${input.source.recipeVersionId}`;
  const lines: GroceryCompilerLine[] = ingredients.map((ingredient) => ({
    originalText: ingredient.original_text,
    recipeVersionId: input.source.recipeVersionId,
    ingredientLineId: ingredient.id,
    planEntryId: sourceRef,
    fromYield: input.source.yieldQuantity,
    toYield: input.servings,
    optional: ingredient.optional,
  }));
  const compiled = buildGroceryCompilation(lines);
  const originalByIngredientId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.original_text]));
  const kind = input.source.sourceType === 'catalog' ? 'catalog_recipe_ingredient' : 'recipe_ingredient';

  return {
    items: compiled.items.map((item) => ({
      ...item,
      sources: item.sources.map((source) => ({
        ...source,
        kind,
        scope: 'recipe_version' as const,
        originalText: originalByIngredientId.get(source.ingredientLineId) ?? null,
      })),
    })),
  };
}
