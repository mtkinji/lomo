import { buildRecipeLibraryInventory } from '../data/starterRecipeCatalog';
import {
  EDITORIAL_MEAL_COLLECTIONS,
  EDITORIAL_MEAL_PLAN_TEMPLATES,
  getMealEditorialEdition,
} from '../data/editorialMealCollections';
import {
  validateEditorialMealSystem,
  type EditorialCollection,
} from './editorialMealCollectionContracts';

describe('editorial meal Collection contracts', () => {
  const recipes = buildRecipeLibraryInventory([]);

  it('publishes only records whose recipe, template, and editorial references resolve', () => {
    expect(validateEditorialMealSystem({
      collections: EDITORIAL_MEAL_COLLECTIONS,
      templates: EDITORIAL_MEAL_PLAN_TEMPLATES,
      recipes,
      edition: getMealEditorialEdition(new Date('2026-08-06T12:00:00.000Z')),
    })).toEqual([]);
  });

  it('rejects missing recipes, duplicate entries, and cuisine framing without sources', () => {
    const base = EDITORIAL_MEAL_COLLECTIONS[0];
    const firstEntry = base.sections[0].entries[0];
    const invalid: EditorialCollection = {
      ...base,
      id: 'invalid-collection',
      heroRecipeId: 'missing-recipe',
      culturalSources: [],
      sections: [{
        ...base.sections[0],
        entries: [firstEntry, { ...firstEntry, id: 'duplicate-entry' }],
      }],
    };

    const errors = validateEditorialMealSystem({
      collections: [invalid],
      templates: [],
      recipes,
      edition: {
        id: 'invalid-edition',
        startsAt: '2026-08-03T00:00:00.000Z',
        endsAt: '2026-08-10T00:00:00.000Z',
        placements: [{ slot: 'after_third_shelf', collectionId: invalid.id }],
      },
    });

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('hero Recipe missing-recipe'),
      expect.stringContaining('duplicates Recipe'),
      expect.stringContaining('requires a cultural source'),
    ]));
  });

  it('rejects an edition with more than two placements or missing destinations', () => {
    const collection = EDITORIAL_MEAL_COLLECTIONS[0];
    const errors = validateEditorialMealSystem({
      collections: [collection],
      templates: [],
      recipes,
      edition: {
        id: 'crowded-edition',
        startsAt: '2026-08-03T00:00:00.000Z',
        endsAt: '2026-08-10T00:00:00.000Z',
        placements: [
          { slot: 'after_third_shelf', collectionId: collection.id },
          { slot: 'after_sixth_shelf', collectionId: 'missing-collection' },
          { slot: 'after_sixth_shelf', collectionId: collection.id },
        ],
      },
    });

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('at most two placements'),
      expect.stringContaining('missing Collection missing-collection'),
    ]));
  });

  it('keeps an edition stable for the UTC calendar week and rotates the next week', () => {
    const monday = getMealEditorialEdition(new Date('2026-08-03T00:01:00.000Z'));
    const sunday = getMealEditorialEdition(new Date('2026-08-09T23:59:00.000Z'));
    const nextMonday = getMealEditorialEdition(new Date('2026-08-10T00:01:00.000Z'));

    expect(sunday).toEqual(monday);
    expect(nextMonday.id).not.toBe(monday.id);
    expect(nextMonday.placements).not.toEqual(monday.placements);
    expect(monday.placements).toHaveLength(2);
  });
});
