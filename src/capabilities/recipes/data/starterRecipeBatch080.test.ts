import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_080 } from "./starterRecipeBatch080";

describe("starter recipe batch 080", () => {
  it("contains recipes AP001 through AP005 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_080.map((recipe) => recipe.rosterId)).toEqual([
      "AP001",
      "AP002",
      "AP003",
      "AP004",
      "AP005",
    ]);
  });

  it("passes validation and avoids hidden frying burden", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_080)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_080.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_080.every(
        (recipe) => !recipe.instructions.join(" ").includes("deep-fry"),
      ),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_080.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
