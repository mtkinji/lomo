import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_044 } from "./starterRecipeBatch044";

describe("starter recipe batch 044", () => {
  it("contains recipes DI076 through DI080 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_044.map((recipe) => recipe.rosterId)).toEqual([
      "DI076",
      "DI077",
      "DI078",
      "DI079",
      "DI080",
    ]);
  });
  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_044)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_044.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_044.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_044.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
