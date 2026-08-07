import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_064 } from "./starterRecipeBatch064";

describe("starter recipe batch 064", () => {
  it("contains recipes DI176 through DI180 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_064.map((recipe) => recipe.rosterId)).toEqual([
      "DI176",
      "DI177",
      "DI178",
      "DI179",
      "DI180",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_064)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_064.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_064.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_064.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
