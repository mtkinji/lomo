import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_065 } from "./starterRecipeBatch065";

describe("starter recipe batch 065", () => {
  it("contains recipes DI181 through DI185 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_065.map((recipe) => recipe.rosterId)).toEqual([
      "DI181",
      "DI182",
      "DI183",
      "DI184",
      "DI185",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_065)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_065.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_065.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_065.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
