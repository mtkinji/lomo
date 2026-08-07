import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_052 } from "./starterRecipeBatch052";

describe("starter recipe batch 052", () => {
  it("contains recipes DI116 through DI120 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_052.map((recipe) => recipe.rosterId)).toEqual([
      "DI116",
      "DI117",
      "DI118",
      "DI119",
      "DI120",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_052)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_052.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_052.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_052.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
