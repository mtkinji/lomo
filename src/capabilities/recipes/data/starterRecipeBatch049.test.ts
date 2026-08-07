import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_049 } from "./starterRecipeBatch049";

describe("starter recipe batch 049", () => {
  it("contains recipes DI101 through DI105 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_049.map((recipe) => recipe.rosterId)).toEqual([
      "DI101",
      "DI102",
      "DI103",
      "DI104",
      "DI105",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_049)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_049.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_049.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_049.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
