import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_092 } from "./starterRecipeBatch092";

describe("starter recipe batch 092", () => {
  it("contains recipes DE021 through DE025 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_092.map((recipe) => recipe.rosterId)).toEqual([
      "DE021",
      "DE022",
      "DE023",
      "DE024",
      "DE025",
    ]);
  });

  it("passes validation and keeps cinnamon rolls as the only true project", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_092)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_092.filter(
        (recipe) => recipe.tier === "household-anchor",
      ),
    ).toHaveLength(5);
    expect(
      STARTER_RECIPE_BATCH_092.filter((recipe) =>
        recipe.instructions.join(" ").includes("batch's one true project"),
      ).map((recipe) => recipe.rosterId),
    ).toEqual(["DE023"]);
    expect(
      STARTER_RECIPE_BATCH_092.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
