import { parseRecipeProjection } from './recipeCache';
import {
  DEFAULT_RECIPE_INVENTORY_FILTERS,
  STARTER_RECIPE_PROJECTIONS,
  buildRecipeLibraryInventory,
  countActiveRecipeInventoryFilters,
  filterRecipeInventory,
  getBundledRecipeArtworkIndex,
  getStarterRecipeMetadata,
} from './starterRecipeCatalog';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';

describe('starter Recipe catalog', () => {
  it('ships exactly 100 unique, contract-valid household recipes', () => {
    expect(STARTER_RECIPE_PROJECTIONS).toHaveLength(100);
    expect(new Set(STARTER_RECIPE_PROJECTIONS.map(({ recipe }) => recipe.id)).size).toBe(100);
    for (const projection of STARTER_RECIPE_PROJECTIONS) {
      expect(() => parseRecipeProjection(projection)).not.toThrow();
      expect(projection.currentVersion.ingredients.length).toBeGreaterThanOrEqual(6);
      expect(projection.currentVersion.instructions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('covers broad meal categories and cuisines with food artwork', () => {
    const metadata = STARTER_RECIPE_PROJECTIONS.map(({ recipe }) => getStarterRecipeMetadata(recipe.id));
    expect(new Set(metadata.map((item) => item?.category))).toEqual(expect.objectContaining(new Set([
      'Breakfast', 'Dinner', 'Soup', 'Dessert', 'Vegetarian',
    ])));
    expect(new Set(metadata.map((item) => item?.cuisine))).toEqual(expect.objectContaining(new Set([
      'American', 'Mexican', 'French', 'Japanese', 'Italian', 'Indian', 'Mediterranean', 'Chinese', 'Thai',
    ])));
    expect(metadata.every((item) => typeof item?.artworkIndex === 'number')).toBe(true);
  });

  it('puts personal recipes before the bundled catalog without duplicate identities', () => {
    const personal = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };
    const duplicate = { ...personal, recipe: { ...personal.recipe, id: STARTER_RECIPE_PROJECTIONS[0].recipe.id } };
    const inventory = buildRecipeLibraryInventory([personal, duplicate]);

    expect(inventory).toHaveLength(101);
    expect(inventory[0]).toBe(personal);
    expect(inventory[1]).toBe(duplicate);
    expect(inventory.filter(({ recipe }) => recipe.id === duplicate.recipe.id)).toHaveLength(1);
  });

  it('accepts only an in-range bundled artwork reference', () => {
    expect(getBundledRecipeArtworkIndex('bundle://household-recipe-atlas/11')).toBe(11);
    expect(getBundledRecipeArtworkIndex('bundle://household-recipe-atlas/23')).toBe(23);
    expect(getBundledRecipeArtworkIndex('bundle://household-recipe-atlas/24')).toBeNull();
    expect(getBundledRecipeArtworkIndex('https://example.test/food.jpg')).toBeNull();
  });

  it('filters the inventory by title, description, category, or cuisine', () => {
    const inventory = buildRecipeLibraryInventory([]);
    expect(filterRecipeInventory(inventory, { query: 'tikka', filters: DEFAULT_RECIPE_INVENTORY_FILTERS, sort: 'featured' })).toHaveLength(1);
    expect(filterRecipeInventory(inventory, { query: 'creamy tomato', filters: DEFAULT_RECIPE_INVENTORY_FILTERS, sort: 'featured' }).length).toBeGreaterThan(1);
    expect(filterRecipeInventory(inventory, { query: '', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, cuisine: 'Japanese' }, sort: 'featured' })).toHaveLength(5);
    expect(filterRecipeInventory(inventory, { query: '', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, category: 'Breakfast' }, sort: 'featured' })).toHaveLength(10);
  });

  it('combines independent recipe filters and counts only active dimensions', () => {
    const inventory = buildRecipeLibraryInventory([]);
    const filters = {
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      maxMinutes: 40,
      category: 'Dinner' as const,
      cuisine: 'Japanese',
    };

    expect(countActiveRecipeInventoryFilters(filters)).toBe(3);
    expect(filterRecipeInventory(inventory, { query: '', filters, sort: 'featured' }).map(({ currentVersion }) => currentVersion.title)).toEqual([
      'Teriyaki Salmon Rice Bowls',
      'Chicken Katsu Curry Bowls',
      'Miso Ginger Tofu Bowls',
      'Beef Sukiyaki-Style Rice Bowls',
      'Sesame Soba Noodle Bowls',
    ]);
  });

  it('sorts the visible inventory without changing the source array', () => {
    const inventory = buildRecipeLibraryInventory([]);
    const originalFirst = inventory[0];
    const alphabetical = filterRecipeInventory(inventory, { query: '', filters: DEFAULT_RECIPE_INVENTORY_FILTERS, sort: 'title' });
    const quickest = filterRecipeInventory(inventory, { query: '', filters: DEFAULT_RECIPE_INVENTORY_FILTERS, sort: 'quickest' });

    expect(alphabetical[0].currentVersion.title).toBe('Almond Cherry Tea Cake');
    expect(quickest[0].currentVersion.title).toBe('Apple Cinnamon Pancakes');
    expect(inventory[0]).toBe(originalFirst);
  });
});
