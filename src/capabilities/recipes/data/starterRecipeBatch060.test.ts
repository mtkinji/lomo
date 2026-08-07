import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_060 } from "./starterRecipeBatch060";

describe("starter recipe batch 060", () => {
  it("contains recipes DI156 through DI160 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_060.map((recipe) => recipe.rosterId)).toEqual([
      "DI156",
      "DI157",
      "DI158",
      "DI159",
      "DI160",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_060)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_060.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_060.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_060.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
