import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_085 } from "./starterRecipeBatch085";

describe("starter recipe batch 085", () => {
  it("contains recipes BA006 through BA010 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_085.map((recipe) => recipe.rosterId)).toEqual([
      "BA006",
      "BA007",
      "BA008",
      "BA009",
      "BA010",
    ]);
  });

  it("passes validation and has one overnight project", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_085)).toEqual([]);
    expect(
      STARTER_RECIPE_BATCH_085.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_085.filter(
        (recipe) => recipe.inactiveMinutes >= 480,
      ),
    ).toHaveLength(1);
    expect(
      STARTER_RECIPE_BATCH_085.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
