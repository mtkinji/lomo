import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_093 } from "./starterRecipeBatch093";

describe("starter recipe batch 093", () => {
  it("contains recipes DE026 through DE030 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_093.map((recipe) => recipe.rosterId)).toEqual([
      "DE026",
      "DE027",
      "DE028",
      "DE029",
      "DE030",
    ]);
  });

  it("passes validation and keeps cannoli as the only true project", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_093)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_093.filter(
        (recipe) => recipe.tier === "cuisine-anchor",
      ).map((recipe) => recipe.rosterId),
    ).toEqual(["DE028", "DE029", "DE030"]);
    expect(
      STARTER_RECIPE_BATCH_093.filter((recipe) =>
        recipe.instructions.join(" ").includes("batch's one true project"),
      ).map((recipe) => recipe.rosterId),
    ).toEqual(["DE028"]);
    expect(
      STARTER_RECIPE_BATCH_093.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
