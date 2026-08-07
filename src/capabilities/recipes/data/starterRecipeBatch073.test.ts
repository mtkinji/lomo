import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_073 } from "./starterRecipeBatch073";

describe("starter recipe batch 073", () => {
  it("contains recipes DI221 through DI225 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_073.map((recipe) => recipe.rosterId)).toEqual([
      "DI221",
      "DI222",
      "DI223",
      "DI224",
      "DI225",
    ]);
  });

  it("passes the editorial contract and familiarity gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_073)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_073.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_073.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_073.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_073.every((recipe) => recipe.title.includes("(")),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_073.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
