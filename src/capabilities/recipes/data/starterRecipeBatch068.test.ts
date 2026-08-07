import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_068 } from "./starterRecipeBatch068";

describe("starter recipe batch 068", () => {
  it("contains recipes DI196 through DI200 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_068.map((recipe) => recipe.rosterId)).toEqual([
      "DI196",
      "DI197",
      "DI198",
      "DI199",
      "DI200",
    ]);
  });

  it("passes the editorial contract and familiarity gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_068)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_068.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_068.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_068.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_068.every((recipe) => recipe.title.includes("(")),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_068.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
