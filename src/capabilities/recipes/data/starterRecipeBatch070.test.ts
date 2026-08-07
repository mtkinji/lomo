import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_070 } from "./starterRecipeBatch070";

describe("starter recipe batch 070", () => {
  it("contains recipes DI206 through DI210 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_070.map((recipe) => recipe.rosterId)).toEqual([
      "DI206",
      "DI207",
      "DI208",
      "DI209",
      "DI210",
    ]);
  });

  it("passes the editorial contract and familiarity gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_070)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_070.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_070.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_070.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_070.every((recipe) => recipe.title.includes("(")),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_070.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
