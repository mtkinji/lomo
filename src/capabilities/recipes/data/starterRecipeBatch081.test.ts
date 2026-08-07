import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_081 } from "./starterRecipeBatch081";

describe("starter recipe batch 081", () => {
  it("contains recipes AP006 through AP010 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_081.map((recipe) => recipe.rosterId)).toEqual([
      "AP006",
      "AP007",
      "AP008",
      "AP009",
      "AP010",
    ]);
  });

  it("passes validation and keeps the appetizer set approachable", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_081)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_081.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_081.filter(
        (recipe) => recipe.prepMinutes + recipe.cookMinutes <= 30,
      ),
    ).toHaveLength(4);
    expect(
      STARTER_RECIPE_BATCH_081.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
