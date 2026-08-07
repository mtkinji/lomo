import { validateEditorialBatch } from "./editorialRecipeCatalog";
import { STARTER_EDITORIAL_RECIPE_CATALOG } from "./starterEditorialRecipeCatalog";

describe("staging starter editorial recipe catalog", () => {
  it("contains the authored roster entries in exact continuous order", () => {
    expect(STARTER_EDITORIAL_RECIPE_CATALOG).toHaveLength(500);
    expect(
      STARTER_EDITORIAL_RECIPE_CATALOG.map((recipe) => recipe.rosterId),
    ).toEqual([
      ...Array.from(
        { length: 90 },
        (_, index) => `BR${String(index + 1).padStart(3, "0")}`,
      ),
      ...Array.from(
        { length: 85 },
        (_, index) => `LU${String(index + 1).padStart(3, "0")}`,
      ),
      ...Array.from(
        { length: 230 },
        (_, index) => `DI${String(index + 1).padStart(3, "0")}`,
      ),
      ...Array.from(
        { length: 15 },
        (_, index) => `SO${String(index + 1).padStart(3, "0")}`,
      ),
      ...Array.from(
        { length: 10 },
        (_, index) => `SA${String(index + 1).padStart(3, "0")}`,
      ),
      ...Array.from(
        { length: 10 },
        (_, index) => `AP${String(index + 1).padStart(3, "0")}`,
      ),
      ...Array.from(
        { length: 10 },
        (_, index) => `SI${String(index + 1).padStart(3, "0")}`,
      ),
      ...Array.from(
        { length: 20 },
        (_, index) => `BA${String(index + 1).padStart(3, "0")}`,
      ),
      ...Array.from(
        { length: 30 },
        (_, index) => `DE${String(index + 1).padStart(3, "0")}`,
      ),
    ]);
  });

  it("passes validation globally, including cross-batch ID and title uniqueness", () => {
    expect(validateEditorialBatch(STARTER_EDITORIAL_RECIPE_CATALOG)).toEqual(
      [],
    );
  });

  it("does not overstate kitchen verification", () => {
    expect(
      STARTER_EDITORIAL_RECIPE_CATALOG.every(
        (recipe) => recipe.kitchenTestState === "desk-reviewed",
      ),
    ).toBe(true);
    expect(
      STARTER_EDITORIAL_RECIPE_CATALOG.every(
        (recipe) => recipe.research.sources.length >= 3,
      ),
    ).toBe(true);
  });

  it("matches the approved category and editorial-tier portfolio", () => {
    const countBy = (key: "category" | "tier") =>
      STARTER_EDITORIAL_RECIPE_CATALOG.reduce<Record<string, number>>(
        (counts, recipe) => ({
          ...counts,
          [recipe[key]]: (counts[recipe[key]] ?? 0) + 1,
        }),
        {},
      );

    expect(countBy("category")).toEqual({
      "Breakfast & brunch": 90,
      "Lunch & handhelds": 85,
      Dinner: 230,
      "Soups & stews": 15,
      "Salads & bowls": 10,
      "Appetizers & snacks": 10,
      Sides: 10,
      "Breads & baking": 20,
      Desserts: 30,
    });
    expect(countBy("tier")).toEqual({
      "household-anchor": 228,
      "cuisine-anchor": 231,
      discovery: 41,
    });
  });

  it("contains 500 distinct recipe bodies and complete appetite and story copy", () => {
    expect(
      new Set(
        STARTER_EDITORIAL_RECIPE_CATALOG.map((recipe) =>
          recipe.ingredients.join("\n").toLocaleLowerCase(),
        ),
      ).size,
    ).toBe(500);
    expect(
      new Set(
        STARTER_EDITORIAL_RECIPE_CATALOG.map((recipe) =>
          recipe.instructions.join("\n").toLocaleLowerCase(),
        ),
      ).size,
    ).toBe(500);
    expect(
      STARTER_EDITORIAL_RECIPE_CATALOG.every(
        (recipe) =>
          recipe.title.trim().length > 0 &&
          recipe.title.length <= 80 &&
          recipe.description.trim().length >= 40 &&
          recipe.notes.trim().length >= 20,
      ),
    ).toBe(true);
  });

  it("keeps discovery meals a small layer and records at least 1,500 sources", () => {
    const discoveryCount = STARTER_EDITORIAL_RECIPE_CATALOG.filter(
      (recipe) => recipe.tier === "discovery",
    ).length;
    const sourceCount = STARTER_EDITORIAL_RECIPE_CATALOG.reduce(
      (total, recipe) => total + recipe.research.sources.length,
      0,
    );

    expect(
      discoveryCount / STARTER_EDITORIAL_RECIPE_CATALOG.length,
    ).toBeLessThan(0.1);
    expect(sourceCount).toBeGreaterThanOrEqual(1_500);
  });
});
