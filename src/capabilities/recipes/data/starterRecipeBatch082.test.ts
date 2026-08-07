import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_082 } from "./starterRecipeBatch082";

describe("starter recipe batch 082", () => {
  it("contains recipes SI001 through SI005 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_082.map((recipe) => recipe.rosterId)).toEqual([
      "SI001",
      "SI002",
      "SI003",
      "SI004",
      "SI005",
    ]);
  });

  it("passes validation and has only one true project recipe", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_082)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_082.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_082.filter(
        (recipe) =>
          recipe.prepMinutes + recipe.cookMinutes + recipe.inactiveMinutes >=
          120,
      ),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_082.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
