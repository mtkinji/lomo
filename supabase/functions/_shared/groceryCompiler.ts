import { buildGroceryCompilation, type GroceryCompilerLine } from '../../../packages/food-core/src/index.ts';

export type GroceryAuthorityInput = {
  plan: { id: string; version: number; state: string; organizer_person_id: string };
  expectedVersion: number;
  actorPersonId: string;
  entries: Array<{ id: string; plan_version: number; servings: number | null; recipe_snapshot: Record<string, unknown> | null }>;
  ingredientsByVersionId: Record<string, Array<{ id: string; original_text: string; optional: boolean }>>;
};

export function compileGroceryAuthority(input: GroceryAuthorityInput) {
  if (input.plan.organizer_person_id !== input.actorPersonId) throw new Error('grocery_plan_not_owned');
  if (input.plan.state !== 'finalized' || input.plan.version !== input.expectedVersion) throw new Error('stale_or_unfinalized_meal_plan');
  const lines: GroceryCompilerLine[] = [];
  for (const entry of input.entries) {
    if (entry.plan_version !== input.expectedVersion || !entry.recipe_snapshot) continue;
    const recipeVersionId = typeof entry.recipe_snapshot.recipeVersionId === 'string' ? entry.recipe_snapshot.recipeVersionId : '';
    const fromYield = typeof entry.recipe_snapshot.yieldQuantity === 'number' ? entry.recipe_snapshot.yieldQuantity : null;
    const ingredients = input.ingredientsByVersionId[recipeVersionId];
    if (!recipeVersionId || !ingredients) throw new Error('missing_recipe_version');
    for (const ingredient of ingredients) lines.push({ originalText: ingredient.original_text, recipeVersionId, ingredientLineId: ingredient.id, planEntryId: entry.id, fromYield, toYield: entry.servings, optional: ingredient.optional });
  }
  const compiled = buildGroceryCompilation(lines);
  const originalBySource = new Map(lines.map((line) => [`${line.recipeVersionId}:${line.ingredientLineId}:${line.planEntryId}`, line.originalText]));
  return { items: compiled.items.map((item) => ({ ...item, sources: item.sources.map((source) => ({ ...source, originalText: originalBySource.get(`${source.recipeVersionId}:${source.ingredientLineId}:${source.planEntryId}`) ?? null })) })) };
}
