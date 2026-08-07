import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_076 } from "./starterRecipeBatch076";

describe("starter recipe batch 076", () => {
  it("contains recipes SO006 through SO010 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_076.map((recipe) => recipe.rosterId)).toEqual([
      "SO006",
      "SO007",
      "SO008",
      "SO009",
      "SO010",
    ]);
  });

  it("passes the editorial contract and familiar-household gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_076)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_076.every(
        (recipe) => recipe.tier === "household-anchor",
      ),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_076.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
    expect(
      new Set(STARTER_RECIPE_BATCH_076.map((recipe) => recipe.title)).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_076.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
  });
});
