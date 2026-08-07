import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_083 } from "./starterRecipeBatch083";

describe("starter recipe batch 083", () => {
  it("contains recipes SI006 through SI010 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_083.map((recipe) => recipe.rosterId)).toEqual([
      "SI006",
      "SI007",
      "SI008",
      "SI009",
      "SI010",
    ]);
  });

  it("passes validation and keeps specialist effort bounded", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_083)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_083.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_083.filter(
        (recipe) => recipe.inactiveMinutes >= 120,
      ),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_083.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
