import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_055 } from "./starterRecipeBatch055";

describe("starter recipe batch 055", () => {
  it("contains recipes DI131 through DI135 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_055.map((recipe) => recipe.rosterId)).toEqual([
      "DI131",
      "DI132",
      "DI133",
      "DI134",
      "DI135",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_055)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_055.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_055.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_055.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
