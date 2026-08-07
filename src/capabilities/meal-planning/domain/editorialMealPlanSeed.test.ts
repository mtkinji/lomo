import { buildRecipeLibraryInventory } from '../../recipes/data/starterRecipeCatalog';
import type { MealPlanCandidateDraft } from '../data/mealPlanningRepository';
import {
  buildEditorialMealPlanCandidates,
  mergeEditorialMealPlanCandidates,
  type EditorialMealPlanSeed,
} from './editorialMealPlanSeed';

describe('editorial Meal Plan seed', () => {
  const recipes = buildRecipeLibraryInventory([]);
  const recipeIds = recipes.slice(0, 3).map((projection) => projection.recipe.id);
  const seed: EditorialMealPlanSeed = {
    kind: 'collection_selection',
    sourceId: 'collection-test',
    sourceVersion: 2,
    sourceTitle: 'A useful Collection',
    recipeIds: [...recipeIds, 'missing-recipe'],
    horizon: { kind: 'meal_count', count: 3 },
  };

  it('copies ordered immutable Recipe snapshots and editorial origin', () => {
    let nextId = 0;
    const candidates = buildEditorialMealPlanCandidates({
      seed,
      recipes,
      servings: 5,
      createId: () => `candidate-${++nextId}`,
    });

    expect(candidates).toHaveLength(3);
    expect(candidates.map((candidate) => candidate.recipeSnapshot?.recipeId)).toEqual(recipeIds);
    expect(candidates[0]).toMatchObject({
      id: 'candidate-1',
      kind: 'recipe',
      recipeSnapshot: {
        selectedServings: 5,
        editorialOrigin: {
          kind: 'collection_selection',
          sourceId: 'collection-test',
          sourceVersion: 2,
        },
      },
    });
  });

  it('merges into a draft without duplicating an existing Recipe version', () => {
    const incoming = buildEditorialMealPlanCandidates({
      seed,
      recipes,
      servings: 4,
      createId: () => 'incoming',
    });
    const existing: MealPlanCandidateDraft[] = [
      { ...incoming[0], id: 'already-there' },
      { id: 'meal-note', kind: 'meal_note', title: 'Leftovers', recipeSnapshot: null },
    ];

    const merged = mergeEditorialMealPlanCandidates(existing, incoming);

    expect(merged).toHaveLength(4);
    expect(merged[0].id).toBe('already-there');
    expect(merged[1].kind).toBe('meal_note');
    expect(merged.filter((candidate) => candidate.recipeSnapshot?.recipeVersionId === incoming[0].recipeSnapshot?.recipeVersionId)).toHaveLength(1);
  });
});
