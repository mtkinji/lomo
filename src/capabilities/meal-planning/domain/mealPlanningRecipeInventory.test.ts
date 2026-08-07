import {
  recipeContractFixture,
  recipeVersionContractFixture,
} from "../../recipes/domain/recipeContractFixtures";
import {
  buildMealPlanningRecipeInventory,
  orderMealPlanningRecipeInventory,
} from "./mealPlanningRecipeInventory";

describe("Meal Planning recipe inventory", () => {
  it("includes the bundled catalog when the household has not saved a private recipe", () => {
    const inventory = buildMealPlanningRecipeInventory([]);

    expect(inventory).toHaveLength(500);
    expect(
      inventory.every(
        (projection) => projection.recipe.provenance.method === "catalog",
      ),
    ).toBe(true);
  });

  it("keeps private recipes ahead of the bundled catalog", () => {
    const personal = {
      recipe: recipeContractFixture(),
      currentVersion: recipeVersionContractFixture(),
    };
    const inventory = buildMealPlanningRecipeInventory([personal]);

    expect(inventory[0].recipe.id).toBe(personal.recipe.id);
    expect(inventory).toHaveLength(501);
  });

  it("moves the prepared candidates to the top in their ranked order", () => {
    const inventory = buildMealPlanningRecipeInventory([]);
    const rankedIds = [inventory[8].recipe.id, inventory[3].recipe.id];

    const ordered = orderMealPlanningRecipeInventory(inventory, rankedIds);

    expect(
      ordered.slice(0, 2).map((projection) => projection.recipe.id),
    ).toEqual(rankedIds);
    expect(inventory[0].recipe.id).not.toBe(rankedIds[0]);
  });
});
