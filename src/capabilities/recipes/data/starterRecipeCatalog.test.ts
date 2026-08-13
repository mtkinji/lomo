import { parseRecipeProjection } from "./recipeCache";
import {
  DEFAULT_RECIPE_INVENTORY_FILTERS,
  STARTER_RECIPE_CATEGORIES,
  STARTER_RECIPE_CUISINES,
  STARTER_RECIPE_PROJECTIONS,
  buildRecipeLibraryInventory,
  countActiveRecipeInventoryFilters,
  filterRecipeInventory,
  getBundledRecipeArtworkIndex,
  getStarterRecipeMetadata,
} from "./starterRecipeCatalog";
import {
  recipeContractFixture,
  recipeVersionContractFixture,
} from "../domain/recipeContractFixtures";
import { getCuisineFamilyForCuisine } from "../domain/cuisineFamilies";

describe("starter Recipe catalog", () => {
  it("ships exactly 500 unique, contract-valid independently authored recipes", () => {
    expect(STARTER_RECIPE_PROJECTIONS).toHaveLength(500);
    expect(
      new Set(STARTER_RECIPE_PROJECTIONS.map(({ recipe }) => recipe.id)).size,
    ).toBe(500);
    for (const projection of STARTER_RECIPE_PROJECTIONS) {
      expect(() => parseRecipeProjection(projection)).not.toThrow();
      expect(
        projection.currentVersion.ingredients.length,
      ).toBeGreaterThanOrEqual(5);
      expect(
        projection.currentVersion.instructions.length,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it("covers every approved meal role and broad cuisines with food artwork", () => {
    const metadata = STARTER_RECIPE_PROJECTIONS.map(({ recipe }) =>
      getStarterRecipeMetadata(recipe.id),
    );
    expect(new Set(metadata.map((item) => item?.category))).toEqual(
      new Set(STARTER_RECIPE_CATEGORIES),
    );
    expect(STARTER_RECIPE_CUISINES).toEqual(
      expect.arrayContaining([
        "American",
        "Mexican",
        "French",
        "Japanese",
        "Italian",
        "Indian",
        "Chinese",
        "Thai",
      ]),
    );
    expect(
      metadata.every((item) => typeof item?.artworkIndex === "number"),
    ).toBe(true);
  });

  it("puts personal recipes before the bundled catalog without duplicate identities", () => {
    const personal = {
      recipe: recipeContractFixture(),
      currentVersion: recipeVersionContractFixture(),
    };
    const duplicate = {
      ...personal,
      recipe: {
        ...personal.recipe,
        id: STARTER_RECIPE_PROJECTIONS[0].recipe.id,
      },
    };
    const inventory = buildRecipeLibraryInventory([personal, duplicate]);

    expect(inventory).toHaveLength(501);
    expect(inventory[0]).toBe(personal);
    expect(inventory[1]).toBe(duplicate);
    expect(
      inventory.filter(({ recipe }) => recipe.id === duplicate.recipe.id),
    ).toHaveLength(1);
  });

  it("does not count a database-backed canonical catalog projection as a personal recipe", () => {
    const personal = {
      recipe: recipeContractFixture(),
      currentVersion: recipeVersionContractFixture(),
    };
    const importedCatalog = {
      recipe: {
        ...recipeContractFixture(),
        id: "93000000-0000-0000-0000-000000000001",
        currentVersionId: "94000000-0000-0000-0000-000000000001",
        provenance: {
          ...recipeContractFixture().provenance,
          id: "95000000-0000-0000-0000-000000000001",
          method: "catalog" as const,
          rightsBasis: "kwilt_authored" as const,
        },
      },
      currentVersion: {
        ...recipeVersionContractFixture(),
        id: "94000000-0000-0000-0000-000000000001",
        recipeId: "93000000-0000-0000-0000-000000000001",
      },
    };

    expect(buildRecipeLibraryInventory([])).toHaveLength(500);
    expect(buildRecipeLibraryInventory([personal])).toHaveLength(501);
    const inventory = buildRecipeLibraryInventory([personal, importedCatalog]);

    expect(inventory).toHaveLength(501);
    expect(inventory[0]).toBe(personal);
    expect(
      inventory.some(
        ({ recipe }) => recipe.id === importedCatalog.recipe.id,
      ),
    ).toBe(false);
  });

  it("keeps a private adaptation descended from a canonical catalog recipe", () => {
    const personalEdition = {
      recipe: {
        ...recipeContractFixture(),
        id: "93000000-0000-0000-0000-000000000002",
        provenance: {
          ...recipeContractFixture().provenance,
          method: "catalog" as const,
          rightsBasis: "kwilt_authored" as const,
        },
        lineage: [
          {
            id: "lineage-personal-edition",
            relationship: "adaptation" as const,
            sourceRecipeId: "93000000-0000-0000-0000-000000000001",
            sourceRecipeVersionId: "94000000-0000-0000-0000-000000000001",
            sourcePublicationId: "95000000-0000-0000-0000-000000000001",
          },
        ],
      },
      currentVersion: recipeVersionContractFixture(),
    };

    const inventory = buildRecipeLibraryInventory([personalEdition]);

    expect(inventory).toHaveLength(501);
    expect(inventory[0]).toBe(personalEdition);
  });

  it("accepts only an in-range bundled artwork reference", () => {
    expect(
      getBundledRecipeArtworkIndex("bundle://household-recipe-atlas/11"),
    ).toBe(11);
    expect(
      getBundledRecipeArtworkIndex("bundle://household-recipe-atlas/23"),
    ).toBe(23);
    expect(
      getBundledRecipeArtworkIndex("bundle://household-recipe-atlas/24"),
    ).toBeNull();
    expect(
      getBundledRecipeArtworkIndex("https://example.test/food.jpg"),
    ).toBeNull();
  });

  it("filters the inventory by title, description, category, or cuisine", () => {
    const inventory = buildRecipeLibraryInventory([]);
    expect(
      filterRecipeInventory(inventory, {
        query: "tikka",
        filters: DEFAULT_RECIPE_INVENTORY_FILTERS,
        sort: "featured",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      filterRecipeInventory(inventory, {
        query: "creamy tomato",
        filters: DEFAULT_RECIPE_INVENTORY_FILTERS,
        sort: "featured",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      filterRecipeInventory(inventory, {
        query: "",
        filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, cuisine: "Japanese" },
        sort: "featured",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      filterRecipeInventory(inventory, {
        query: "",
        filters: {
          ...DEFAULT_RECIPE_INVENTORY_FILTERS,
          category: "Breakfast & brunch",
        },
        sort: "featured",
      }),
    ).toHaveLength(90);
  });

  it("filters a canonical cuisine family without discarding regional cuisines", () => {
    const inventory = buildRecipeLibraryInventory([]);
    const french = filterRecipeInventory(inventory, {
      query: "",
      filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, cuisine: "French" },
      sort: "featured",
    });
    const cuisines = french.map(({ recipe }) =>
      getStarterRecipeMetadata(recipe.id)?.cuisine,
    );

    expect(cuisines).toEqual(
      expect.arrayContaining([
        "French",
        "Burgundian French",
        "Provençal French",
      ]),
    );
  });

  it("combines independent recipe filters and counts only active dimensions", () => {
    const inventory = buildRecipeLibraryInventory([]);
    const filters = {
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      maxMinutes: 40,
      category: "Dinner" as const,
      cuisine: "Italian",
    };

    expect(countActiveRecipeInventoryFilters(filters)).toBe(3);
    const results = filterRecipeInventory(inventory, {
      query: "",
      filters,
      sort: "featured",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(({ recipe }) => {
        const metadata = getStarterRecipeMetadata(recipe.id);
        return (
          metadata?.category === "Dinner" &&
          getCuisineFamilyForCuisine(metadata.cuisine)?.id === "italian" &&
          metadata.totalMinutes <= 40
        );
      }),
    ).toBe(true);
  });

  it("sorts the visible inventory without changing the source array", () => {
    const inventory = buildRecipeLibraryInventory([]);
    const originalFirst = inventory[0];
    const alphabetical = filterRecipeInventory(inventory, {
      query: "",
      filters: DEFAULT_RECIPE_INVENTORY_FILTERS,
      sort: "title",
    });
    const quickest = filterRecipeInventory(inventory, {
      query: "",
      filters: DEFAULT_RECIPE_INVENTORY_FILTERS,
      sort: "quickest",
    });

    expect(
      alphabetical.map(({ currentVersion }) => currentVersion.title),
    ).toEqual(
      [...alphabetical.map(({ currentVersion }) => currentVersion.title)].sort(
        (left, right) => left.localeCompare(right),
      ),
    );
    expect(
      quickest.slice(0, -1).every((projection, index) => {
        const current =
          getStarterRecipeMetadata(projection.recipe.id)?.totalMinutes ?? 0;
        const next =
          getStarterRecipeMetadata(quickest[index + 1].recipe.id)
            ?.totalMinutes ?? 0;
        return current <= next;
      }),
    ).toBe(true);
    expect(inventory[0]).toBe(originalFirst);
  });

  it("includes inactive time in quick filters so waiting-heavy recipes are honest", () => {
    const inventory = buildRecipeLibraryInventory([]);
    const waffles = inventory.find(
      ({ recipe }) => recipe.id === "kwilt-recipe-br003",
    );
    expect(waffles).toBeDefined();
    expect(getStarterRecipeMetadata("kwilt-recipe-br003")?.totalMinutes).toBe(
      81,
    );
    expect(
      filterRecipeInventory([waffles!], {
        query: "",
        filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, maxMinutes: 30 },
        sort: "featured",
      }),
    ).toEqual([]);
  });
});
