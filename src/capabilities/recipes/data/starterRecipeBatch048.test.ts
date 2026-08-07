import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_048 } from "./starterRecipeBatch048";

describe("starter recipe batch 048", () => {
  it("contains recipes DI096 through DI100 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_048.map((recipe) => recipe.rosterId)).toEqual([
      "DI096",
      "DI097",
      "DI098",
      "DI099",
      "DI100",
    ]);
  });
  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_048)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_048.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_048.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_048.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
