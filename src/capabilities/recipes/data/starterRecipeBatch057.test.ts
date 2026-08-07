import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_057 } from "./starterRecipeBatch057";

describe("starter recipe batch 057", () => {
  it("contains recipes DI141 through DI145 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_057.map((recipe) => recipe.rosterId)).toEqual([
      "DI141",
      "DI142",
      "DI143",
      "DI144",
      "DI145",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_057)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_057.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_057.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_057.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
