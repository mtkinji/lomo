import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_087 } from "./starterRecipeBatch087";

describe("starter recipe batch 087", () => {
  it("contains recipes BA016 through BA020 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_087.map((recipe) => recipe.rosterId)).toEqual([
      "BA016",
      "BA017",
      "BA018",
      "BA019",
      "BA020",
    ]);
  });

  it("passes validation and keeps croissants as the only true project", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_087)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_087.filter(
        (recipe) => recipe.tier === "discovery",
      ).map((recipe) => recipe.rosterId),
    ).toEqual(["BA018", "BA019"]);
    expect(
      STARTER_RECIPE_BATCH_087.filter((recipe) =>
        recipe.instructions.join(" ").includes("batch's one true project"),
      ).map((recipe) => recipe.rosterId),
    ).toEqual(["BA018"]);
    expect(
      STARTER_RECIPE_BATCH_087.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
