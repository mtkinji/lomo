import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_RECIPE_BATCH_075 } from "./starterRecipeBatch075";

describe("starter recipe batch 075", () => {
  it("contains recipes SO001 through SO005 in roster order", () => {
    expect(STARTER_RECIPE_BATCH_075.map((recipe) => recipe.rosterId)).toEqual([
      "SO001",
      "SO002",
      "SO003",
      "SO004",
      "SO005",
    ]);
  });

  it("passes the editorial contract and household-familiarity gate", () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_075)).toEqual([]);
    expect(STARTER_RECIPE_BATCH_075.map((recipe) => recipe.title)).toEqual([
      "Classic chicken noodle soup",
      "Creamy roasted tomato soup",
      "Broccoli cheddar soup",
      "New England clam chowder",
      "Sweet corn and potato chowder",
    ]);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_075.map((recipe) => recipe.ingredients.join("|")),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        STARTER_RECIPE_BATCH_075.map((recipe) => recipe.instructions.join("|")),
      ).size,
    ).toBe(5);
    expect(
      STARTER_RECIPE_BATCH_075.filter((recipe) => recipe.tier === "discovery"),
    ).toHaveLength(0);
    expect(
      STARTER_RECIPE_BATCH_075.filter(
        (recipe) => recipe.tier === "household-anchor",
      ),
    ).toHaveLength(4);
    expect(
      STARTER_RECIPE_BATCH_075.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
  });
});
