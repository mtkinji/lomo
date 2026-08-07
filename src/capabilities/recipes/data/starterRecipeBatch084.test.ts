import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_084 } from "./starterRecipeBatch084";

describe("starter recipe batch 084", () => {
  it("contains recipes BA001 through BA005 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_084.map((recipe) => recipe.rosterId)).toEqual([
      "BA001",
      "BA002",
      "BA003",
      "BA004",
      "BA005",
    ]);
  });

  it("passes validation and has one disclosed project recipe", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_084)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_084.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_084.filter(
        (recipe) => recipe.inactiveMinutes >= 480,
      ),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_084.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
