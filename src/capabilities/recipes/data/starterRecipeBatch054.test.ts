import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_054 } from "./starterRecipeBatch054";

describe("starter recipe batch 054", () => {
  it("contains recipes DI126 through DI130 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_054.map((recipe) => recipe.rosterId)).toEqual([
      "DI126",
      "DI127",
      "DI128",
      "DI129",
      "DI130",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_054)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_054.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_054.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_054.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
