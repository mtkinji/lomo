import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';
import { canHideRecipe, excludeHiddenRecipes } from './hiddenRecipes';

describe('Hidden recipe filtering', () => {
  it('offers Hide only for catalog meals, not private recipes', () => {
    const privateRecipe = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };
    const catalogRecipe = {
      ...privateRecipe,
      recipe: {
        ...privateRecipe.recipe,
        provenance: { ...privateRecipe.recipe.provenance, method: 'catalog' as const },
      },
    };

    expect(canHideRecipe(privateRecipe)).toBe(false);
    expect(canHideRecipe(catalogRecipe)).toBe(true);
  });

  it('removes hidden recipe ids without changing the source inventory', () => {
    const first = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };
    const second = {
      recipe: { ...recipeContractFixture(), id: 'recipe-2' },
      currentVersion: { ...recipeVersionContractFixture(), id: 'version-2', recipeId: 'recipe-2' },
    };
    const inventory = [first, second];

    expect(excludeHiddenRecipes(inventory, [first.recipe.id])).toEqual([second]);
    expect(inventory).toEqual([first, second]);
  });
});
