import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_051 } from "./starterRecipeBatch051";

describe("starter recipe batch 051", () => {
  it("contains recipes DI111 through DI115 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_051.map((recipe) => recipe.rosterId)).toEqual([
      "DI111",
      "DI112",
      "DI113",
      "DI114",
      "DI115",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_051)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_051.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_051.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_051.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
