import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_089 } from "./starterRecipeBatch089";

describe("starter recipe batch 089", () => {
  it("contains recipes DE006 through DE010 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_089.map((recipe) => recipe.rosterId)).toEqual([
      "DE006",
      "DE007",
      "DE008",
      "DE009",
      "DE010",
    ]);
  });

  it("passes validation and keeps birthday cake as the only true project", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_089)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_089.filter(
        (recipe) => recipe.tier === "household-anchor",
      ),
    ).toHaveLength(5);
    expect(
      STARTER_RECIPE_BATCH_089.filter((recipe) =>
        recipe.instructions.join(" ").includes("batch's one true project"),
      ).map((recipe) => recipe.rosterId),
    ).toEqual(["DE007"]);
    expect(
      STARTER_RECIPE_BATCH_089.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
