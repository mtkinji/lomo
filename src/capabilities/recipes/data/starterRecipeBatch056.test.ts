import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_056 } from "./starterRecipeBatch056";

describe("starter recipe batch 056", () => {
  it("contains recipes DI136 through DI140 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_056.map((recipe) => recipe.rosterId)).toEqual([
      "DI136",
      "DI137",
      "DI138",
      "DI139",
      "DI140",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_056)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_056.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_056.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_056.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
