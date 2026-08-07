import { buildGroceryCompilation, type GroceryCompilerLine } from '../../../packages/food-core/src/index.ts';

export type GroceryAuthorityInput = {
  plan: { id: string; version: number; state: string; organizer_person_id: string };
  expectedVersion: number;
  actorPersonId: string;
  entries: Array<{ id: string; plan_version: number; servings: number | null; recipe_snapshot: Record<string, unknown> | null }>;
  ingredientsByVersionId: Record<string, Array<{ id: string; original_text: string; optional: boolean }>>;
};

type IngredientAuthority = { id: string; original_text: string; optional: boolean };

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
