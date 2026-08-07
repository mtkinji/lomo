import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_059 } from "./starterRecipeBatch059";

describe("starter recipe batch 059", () => {
  it("contains recipes DI151 through DI155 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_059.map((recipe) => recipe.rosterId)).toEqual([
      "DI151",
      "DI152",
      "DI153",
      "DI154",
      "DI155",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_059)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_059.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_059.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_059.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
