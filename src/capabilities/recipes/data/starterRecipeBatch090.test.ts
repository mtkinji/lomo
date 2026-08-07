import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_090 } from "./starterRecipeBatch090";

describe("starter recipe batch 090", () => {
  it("contains recipes DE011 through DE015 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_090.map((recipe) => recipe.rosterId)).toEqual([
      "DE011",
      "DE012",
      "DE013",
      "DE014",
      "DE015",
    ]);
  });

  it("passes validation without introducing a specialist project", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_090)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_090.filter(
        (recipe) => recipe.tier === "household-anchor",
      ),
    ).toHaveLength(5);
    expect(
      STARTER_RECIPE_BATCH_090.filter((recipe) =>
        recipe.instructions.join(" ").includes("batch's one true project"),
      ),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_090.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
