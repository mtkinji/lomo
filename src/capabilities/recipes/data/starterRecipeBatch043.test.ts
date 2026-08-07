import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_043 } from "./starterRecipeBatch043";

describe("starter recipe batch 043", () => {
  it("contains recipes DI071 through DI075 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_043.map((recipe) => recipe.rosterId)).toEqual([
      "DI071",
      "DI072",
      "DI073",
      "DI074",
      "DI075",
    ]);
  });
  it("passes the editorial contract without cloned bodies", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_043)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_043.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_043.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_043.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
