import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_091 } from "./starterRecipeBatch091";

describe("starter recipe batch 091", () => {
  it("contains recipes DE016 through DE020 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_091.map((recipe) => recipe.rosterId)).toEqual([
      "DE016",
      "DE017",
      "DE018",
      "DE019",
      "DE020",
    ]);
  });

  it("passes validation and keeps beignets as the only true project", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_091)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_091.filter(
        (recipe) => recipe.tier === "cuisine-anchor",
      ).map((recipe) => recipe.rosterId),
    ).toEqual(["DE018", "DE019", "DE020"]);
    expect(
      STARTER_RECIPE_BATCH_091.filter((recipe) =>
        recipe.instructions.join(" ").includes("batch's one true project"),
      ).map((recipe) => recipe.rosterId),
    ).toEqual(["DE020"]);
    expect(
      STARTER_RECIPE_BATCH_091.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
