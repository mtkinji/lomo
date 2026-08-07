import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_086 } from "./starterRecipeBatch086";

describe("starter recipe batch 086", () => {
  it("contains recipes BA011 through BA015 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_086.map((recipe) => recipe.rosterId)).toEqual([
      "BA011",
      "BA012",
      "BA013",
      "BA014",
      "BA015",
    ]);
  });

  it("passes validation and names one high-skill project", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_086)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_086.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_086.filter((recipe) =>
        recipe.instructions.join(" ").includes("batch's one true project"),
      ),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_086.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
