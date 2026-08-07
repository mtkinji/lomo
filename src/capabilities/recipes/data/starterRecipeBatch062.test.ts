import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_062 } from "./starterRecipeBatch062";

describe("starter recipe batch 062", () => {
  it("contains recipes DI166 through DI170 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_062.map((recipe) => recipe.rosterId)).toEqual([
      "DI166",
      "DI167",
      "DI168",
      "DI169",
      "DI170",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_062)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_062.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_062.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_062.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
