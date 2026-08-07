import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_071 } from "./starterRecipeBatch071";

describe("starter recipe batch 071", () => {
  it("contains recipes DI211 through DI215 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_071.map((recipe) => recipe.rosterId)).toEqual([
      "DI211",
      "DI212",
      "DI213",
      "DI214",
      "DI215",
    ]);
  });

  it("passes the editorial contract and familiarity gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_071)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_071.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_071.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_071.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_071.every((recipe) => recipe.title.includes("(")),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_071.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
