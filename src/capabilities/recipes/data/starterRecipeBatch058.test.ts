import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_058 } from "./starterRecipeBatch058";

describe("starter recipe batch 058", () => {
  it("contains recipes DI146 through DI150 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_058.map((recipe) => recipe.rosterId)).toEqual([
      "DI146",
      "DI147",
      "DI148",
      "DI149",
      "DI150",
    ]);
  });

  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_058)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_058.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_058.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_058.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
