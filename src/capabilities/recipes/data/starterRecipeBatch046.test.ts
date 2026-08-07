import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_046 } from "./starterRecipeBatch046";

describe("starter recipe batch 046", () => {
  it("contains recipes DI086 through DI090 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_046.map((recipe) => recipe.rosterId)).toEqual([
      "DI086",
      "DI087",
      "DI088",
      "DI089",
      "DI090",
    ]);
  });
  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_046)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_046.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_046.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_046.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
