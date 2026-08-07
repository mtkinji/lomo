import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_061 } from "./starterRecipeBatch061";

describe("starter recipe batch 061", () => {
  it("contains recipes DI161 through DI165 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_061.map((recipe) => recipe.rosterId)).toEqual([
      "DI161",
      "DI162",
      "DI163",
      "DI164",
      "DI165",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_061)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_061.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_061.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_061.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
