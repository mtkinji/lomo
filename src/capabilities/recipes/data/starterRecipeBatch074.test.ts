import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_074 } from "./starterRecipeBatch074";

describe("starter recipe batch 074", () => {
  it("contains recipes DI226 through DI230 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_074.map((recipe) => recipe.rosterId)).toEqual([
      "DI226",
      "DI227",
      "DI228",
      "DI229",
      "DI230",
    ]);
  });

  it("passes the editorial contract and familiarity gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_074)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_074.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_074.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_074.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_074.every((recipe) => recipe.title.includes("(")),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_074.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
