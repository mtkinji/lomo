import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_053 } from "./starterRecipeBatch053";

describe("starter recipe batch 053", () => {
  it("contains recipes DI121 through DI125 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_053.map((recipe) => recipe.rosterId)).toEqual([
      "DI121",
      "DI122",
      "DI123",
      "DI124",
      "DI125",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_053)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_053.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_053.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_053.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
