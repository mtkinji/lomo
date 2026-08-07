import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_079 } from "./starterRecipeBatch079";

describe("starter recipe batch 079", () => {
  it("contains recipes SA006 through SA010 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_079.map((recipe) => recipe.rosterId)).toEqual([
      "SA006",
      "SA007",
      "SA008",
      "SA009",
      "SA010",
    ]);
  });

  it("passes validation and keeps the specialty burden explicit", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_079)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_079.every(
        (recipe) => recipe.tier === "household-anchor",
      ),
    ).toBe(true);
    expect(
      STARTER_RECIPE_BATCH_079.filter((recipe) =>
        recipe.notes.includes("sourcing and safety burden"),
      ),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_079.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
