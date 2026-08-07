import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_077 } from "./starterRecipeBatch077";

describe("starter recipe batch 077", () => {
  it("contains recipes SO011 through SO015 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_077.map((recipe) => recipe.rosterId)).toEqual([
      "SO011",
      "SO012",
      "SO013",
      "SO014",
      "SO015",
    ]);
  });

  it("passes validation and limits specialist burden", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_077)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_077.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_077.filter((recipe) =>
        recipe.notes.includes("special-occasion project"),
      ),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_077.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
