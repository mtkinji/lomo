import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_072 } from "./starterRecipeBatch072";

describe("starter recipe batch 072", () => {
  it("contains recipes DI216 through DI220 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_072.map((recipe) => recipe.rosterId)).toEqual([
      "DI216",
      "DI217",
      "DI218",
      "DI219",
      "DI220",
    ]);
  });

  it("passes the editorial contract and familiarity gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_072)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_072.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_072.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_072.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_072.every((recipe) => recipe.title.includes("(")),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_072.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
