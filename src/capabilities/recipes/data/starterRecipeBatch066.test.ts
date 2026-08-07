import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_066 } from "./starterRecipeBatch066";

describe("starter recipe batch 066", () => {
  it("contains recipes DI186 through DI190 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_066.map((recipe) => recipe.rosterId)).toEqual([
      "DI186",
      "DI187",
      "DI188",
      "DI189",
      "DI190",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_066)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_066.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_066.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_066.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
