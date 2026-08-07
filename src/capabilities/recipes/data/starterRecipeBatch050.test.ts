import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_050 } from "./starterRecipeBatch050";

describe("starter recipe batch 050", () => {
  it("contains recipes DI106 through DI110 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_050.map((recipe) => recipe.rosterId)).toEqual([
      "DI106",
      "DI107",
      "DI108",
      "DI109",
      "DI110",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_050)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_050.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_050.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_050.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
