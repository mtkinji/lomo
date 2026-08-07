import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_047 } from "./starterRecipeBatch047";

describe("starter recipe batch 047", () => {
  it("contains recipes DI091 through DI095 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_047.map((recipe) => recipe.rosterId)).toEqual([
      "DI091",
      "DI092",
      "DI093",
      "DI094",
      "DI095",
    ]);
  });
  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_047)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_047.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_047.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_047.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
