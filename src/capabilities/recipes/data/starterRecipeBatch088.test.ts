import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_088 } from "./starterRecipeBatch088";

describe("starter recipe batch 088", () => {
  it("contains recipes DE001 through DE005 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_088.map((recipe) => recipe.rosterId)).toEqual([
      "DE001",
      "DE002",
      "DE003",
      "DE004",
      "DE005",
    ]);
  });

  it("passes validation and keeps apple pie as the only true project", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_088)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_088.filter(
        (recipe) => recipe.tier === "household-anchor",
      ),
    ).toHaveLength(5);
    expect(
      STARTER_RECIPE_BATCH_088.filter((recipe) =>
        recipe.instructions.join(" ").includes("batch's one true project"),
      ).map((recipe) => recipe.rosterId),
    ).toEqual(["DE003"]);
    expect(
      STARTER_RECIPE_BATCH_088.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
