import {
  EDITORIAL_MEAL_COLLECTIONS,
  EDITORIAL_MEAL_COLLECTION_ROTATIONS,
} from '../data/editorialMealCollections';
import { buildPublicEditorialMealCollectionExport } from './publicEditorialMealCollections';

describe('public editorial Meal Collection projection', () => {
  it('exports public reading content and canonical rotations without Plan template identity', () => {
    const result = buildPublicEditorialMealCollectionExport({
      collections: EDITORIAL_MEAL_COLLECTIONS,
      rotations: EDITORIAL_MEAL_COLLECTION_ROTATIONS,
      sourceCommit: 'abc123',
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.sourceCommit).toBe('abc123');
    expect(result.collections).toHaveLength(4);
    expect(result.rotationGroups).toEqual([
      ['collection-weeknight-tour-japan', 'collection-dinners-on-a-budget'],
      ['collection-new-flavors-familiar-rhythm', 'collection-less-effort-good-dinners'],
    ]);

    const japan = result.collections[0];
    expect(japan).toMatchObject({
      id: 'collection-weeknight-tour-japan',
      slug: 'weeknight-tour-of-japan',
      heroRosterId: 'DI145',
      supportsPlanReview: true,
    });
    expect(japan.sections[0].entries[0]).toMatchObject({
      rosterId: 'DI145',
      discoveryRole: 'familiar_anchor',
      whyTry: expect.any(String),
      whyDoable: expect.any(String),
    });
    expect(JSON.stringify(result)).not.toContain('mealPlanTemplateId');
    expect(JSON.stringify(result)).not.toContain('template-weeknight-tour-japan');
  });

  it('rejects a Collection recipe id that cannot become a public roster id', () => {
    const invalid = {
      ...EDITORIAL_MEAL_COLLECTIONS[0],
      sections: [{
        ...EDITORIAL_MEAL_COLLECTIONS[0].sections[0],
        entries: [{
          ...EDITORIAL_MEAL_COLLECTIONS[0].sections[0].entries[0],
          recipeId: 'private-household-recipe',
        }],
      }],
    };

    expect(() => buildPublicEditorialMealCollectionExport({
      collections: [invalid],
      rotations: [[invalid.id]],
      sourceCommit: 'abc123',
    })).toThrow('private-household-recipe');
  });
});
