import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_078 } from "./starterRecipeBatch078";

describe("starter recipe batch 078", () => {
  it("contains recipes SA001 through SA005 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_078.map((recipe) => recipe.rosterId)).toEqual([
      "SA001",
      "SA002",
      "SA003",
      "SA004",
      "SA005",
    ]);
  });

  it("passes validation and the everyday-salad gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_078)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_078.every(
        (recipe) => recipe.tier === "household-anchor",
      ),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_078.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_078.every(
        (recipe) => recipe.prepMinutes + recipe.cookMinutes <= 50,
      ),
    ).toBe(true);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_078.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
  });
});
