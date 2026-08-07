import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_063 } from "./starterRecipeBatch063";

describe("starter recipe batch 063", () => {
  it("contains recipes DI171 through DI175 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_063.map((recipe) => recipe.rosterId)).toEqual([
      "DI171",
      "DI172",
      "DI173",
      "DI174",
      "DI175",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_063)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_063.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_063.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_063.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
