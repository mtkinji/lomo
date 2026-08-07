import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_067 } from "./starterRecipeBatch067";

describe("starter recipe batch 067", () => {
  it("contains recipes DI191 through DI195 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_067.map((recipe) => recipe.rosterId)).toEqual([
      "DI191",
      "DI192",
      "DI193",
      "DI194",
      "DI195",
    ]);
  });

  it("passes the editorial contract and familiarity gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_067)).toEqual([]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_067.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_067.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_067.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_067.every((recipe) => recipe.title.includes("(")),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_067.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
