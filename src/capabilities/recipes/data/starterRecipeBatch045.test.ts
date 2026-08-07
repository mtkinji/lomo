import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_045 } from "./starterRecipeBatch045";

describe("starter recipe batch 045", () => {
  it("contains recipes DI081 through DI085 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_045.map((recipe) => recipe.rosterId)).toEqual([
      "DI081",
      "DI082",
      "DI083",
      "DI084",
      "DI085",
    ]);
  });
  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_045)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_045.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_045.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_045.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
