import {
  buildRecipeEquipmentSuggestions,
  collectRecipeEquipmentSources,
  deriveSpecializedRecipeEquipment,
  formatEquipmentRecipeProvenance,
  parseSnapshotEquipment,
} from './recipeEquipmentSuggestions';

describe('recipe equipment suggestions', () => {
  it('finds specialized equipment without merchandising ordinary kitchen basics', () => {
    expect(deriveSpecializedRecipeEquipment([
      'Preheat the oven. Heat a pot, then blend the soup with an immersion blender.',
      'Finish in a skillet.',
    ])).toEqual([
      {
        id: 'immersion-blender',
        label: 'Immersion blender',
        searchQuery: 'immersion blender',
        necessity: 'required',
        confidence: 1,
        evidenceText: 'Heat a pot, then blend the soup with an immersion blender.',
        substitute: null,
      },
    ]);
  });

  it('preserves a meaningful size in the label and retailer search query', () => {
    expect(deriveSpecializedRecipeEquipment([
      'Bake the cheesecake in a 9-inch springform pan until just set.',
    ])).toEqual([
      expect.objectContaining({
        id: 'springform-pan',
        label: '9-inch springform pan',
        searchQuery: '9-inch springform pan',
        necessity: 'required',
        evidenceText: 'Bake the cheesecake in a 9-inch springform pan until just set.',
      }),
    ]);
  });

  it('does not turn optional equipment into a purchase suggestion', () => {
    expect(deriveSpecializedRecipeEquipment([
      'Mash by hand. If you have an immersion blender, you can use it instead.',
      'No special equipment is required.',
    ])).toEqual([]);
  });

  it('does not suggest equipment that the recipe explicitly warns against', () => {
    expect(deriveSpecializedRecipeEquipment([
      'Mash by hand; never use a blender or food processor, which can turn the potatoes gluey.',
      'Slice thinly with a knife instead of a mandoline.',
    ])).toEqual([]);
  });

  it('does not mistake an unrelated without phrase for rejection of the tool', () => {
    expect(deriveSpecializedRecipeEquipment([
      'Braise in a 6-quart Dutch oven without the lid for the final 20 minutes.',
    ])).toEqual([
      expect.objectContaining({
        id: 'dutch-oven',
        label: '6-quart Dutch oven',
        necessity: 'required',
      }),
    ]);
  });

  it('records an explicit ordinary substitute as non-blocking evidence', () => {
    expect(deriveSpecializedRecipeEquipment([
      'Use an immersion blender, or carefully transfer the soup to a countertop blender.',
    ])).toEqual([
      expect.objectContaining({
        id: 'immersion-blender',
        necessity: 'preferred',
        substitute: 'Countertop blender',
      }),
    ]);
  });

  it('rejects malformed structured snapshot evidence instead of upgrading it', () => {
    expect(parseSnapshotEquipment([
      { id: 'stand-mixer', label: 'Stand mixer', necessity: 'maybe', confidence: 5 },
      { id: 'immersion-blender', label: 'Immersion blender' },
    ])).toEqual([
      expect.objectContaining({
        id: 'immersion-blender',
        necessity: 'required',
        confidence: 1,
        evidenceText: null,
      }),
    ]);
  });

  it('deduplicates tools across recipes, keeps their provenance, and caps the quiet section', () => {
    const suggestions = buildRecipeEquipmentSuggestions({
      sources: [
        { recipeVersionId: 'soup-v1', recipeTitle: 'Tomato soup' },
        { recipeVersionId: 'sauce-v1', recipeTitle: 'Green sauce' },
        { recipeVersionId: 'cake-v1', recipeTitle: 'Cheesecake' },
        { recipeVersionId: 'bread-v1', recipeTitle: 'Milk bread' },
      ],
      recipes: [
        { versionId: 'soup-v1', instructions: ['Purée with an immersion blender.'] },
        { versionId: 'sauce-v1', instructions: ['Use an immersion blender until smooth.'] },
        { versionId: 'cake-v1', instructions: ['Bake in a 9-inch springform pan.'] },
        { versionId: 'bread-v1', instructions: ['Knead in a stand mixer.'] },
      ],
      existingItemConcepts: [],
      limit: 2,
    });

    expect(suggestions).toEqual([
      {
        id: 'immersion-blender',
        label: 'Immersion blender',
        searchQuery: 'immersion blender',
        necessity: 'required',
        confidence: 1,
        evidenceText: 'Purée with an immersion blender.',
        substitute: null,
        recipeTitles: ['Tomato soup', 'Green sauce'],
      },
      {
        id: 'springform-pan',
        label: '9-inch springform pan',
        searchQuery: '9-inch springform pan',
        necessity: 'required',
        confidence: 1,
        evidenceText: 'Bake in a 9-inch springform pan.',
        substitute: null,
        recipeTitles: ['Cheesecake'],
      },
    ]);
  });

  it('uses immutable snapshot evidence and suppresses equipment already on the list', () => {
    const suggestions = buildRecipeEquipmentSuggestions({
      sources: [
        {
          recipeVersionId: 'shared-v1',
          recipeTitle: 'Birthday cake',
          snapshotEquipment: [
            {
              id: 'stand-mixer',
              label: 'Stand mixer',
              searchQuery: 'stand mixer',
              necessity: 'required',
              confidence: 1,
              evidenceText: 'Knead with a stand mixer.',
              substitute: null,
            },
            {
              id: 'kitchen-scale',
              label: 'Kitchen scale',
              searchQuery: 'kitchen scale',
              necessity: 'required',
              confidence: 1,
              evidenceText: 'Weigh the flour on a kitchen scale.',
              substitute: null,
            },
          ],
        },
      ],
      recipes: [],
      existingItemConcepts: ['stand mixer'],
    });

    expect(suggestions).toEqual([
      {
        id: 'kitchen-scale',
        label: 'Kitchen scale',
        searchQuery: 'kitchen scale',
        necessity: 'required',
        confidence: 1,
        evidenceText: 'Weigh the flour on a kitchen scale.',
        substitute: null,
        recipeTitles: ['Birthday cake'],
      },
    ]);
  });

  it('omits non-blocking tools and ranks shared blockers before one-recipe tools', () => {
    const suggestions = buildRecipeEquipmentSuggestions({
      sources: [
        { recipeVersionId: 'soup-v1', recipeTitle: 'Tomato soup' },
        { recipeVersionId: 'beans-v1', recipeTitle: 'White bean soup' },
        { recipeVersionId: 'cake-v1', recipeTitle: 'Cheesecake' },
        { recipeVersionId: 'sauce-v1', recipeTitle: 'Green sauce' },
      ],
      recipes: [
        { versionId: 'soup-v1', instructions: ['Blend with an immersion blender.'] },
        { versionId: 'beans-v1', instructions: ['Purée using a stick blender.'] },
        { versionId: 'cake-v1', instructions: ['Bake in a 9-inch springform pan.'] },
        { versionId: 'sauce-v1', instructions: ['Use a food processor or chop everything finely with a knife.'] },
      ],
      existingItemConcepts: [],
      limit: 2,
    });

    expect(suggestions.map((item) => item.id)).toEqual([
      'immersion-blender',
      'springform-pan',
    ]);
    expect(suggestions[0].recipeTitles).toEqual(['Tomato soup', 'White bean soup']);
    expect(suggestions[1].searchQuery).toBe('9-inch springform pan');
  });

  it('does not surface preferred or low-confidence structured evidence', () => {
    expect(buildRecipeEquipmentSuggestions({
      sources: [{
        recipeVersionId: 'sauce-v1',
        recipeTitle: 'Green sauce',
        snapshotEquipment: [
          { id: 'food-processor', label: 'Food processor', searchQuery: 'food processor', necessity: 'preferred', confidence: 1, evidenceText: 'Use a food processor or chop with a knife.', substitute: 'Knife' },
          { id: 'mandoline', label: 'Mandoline', searchQuery: 'mandoline slicer', necessity: 'required', confidence: 0.4, evidenceText: 'Slice with a mandoline.', substitute: null },
        ],
      }],
      recipes: [],
      existingItemConcepts: [],
    })).toEqual([]);
  });

  it('uses only the household Plan candidates that contributed to this grocery list', () => {
    expect(collectRecipeEquipmentSources({
      sourceKind: 'household_plan',
      sourceRecipeVersionId: null,
      sourceTitle: null,
      contributingCandidateIds: ['candidate-soup'],
      plan: {
        entries: [],
        candidates: [
          {
            id: 'candidate-soup',
            title: 'Tomato soup',
            recipeSnapshot: {
              recipeVersionId: 'soup-v1',
              equipmentSuggestions: [{ id: 'immersion-blender', label: 'Immersion blender' }],
            },
          },
          {
            id: 'candidate-cake',
            title: 'Cheesecake',
            recipeSnapshot: {
              recipeVersionId: 'cake-v1',
              equipmentSuggestions: [{ id: 'springform-pan', label: 'Springform pan' }],
            },
          },
        ],
      },
    })).toEqual([
      {
        recipeVersionId: 'soup-v1',
        recipeTitle: 'Tomato soup',
        snapshotEquipment: [{ id: 'immersion-blender', label: 'Immersion blender' }],
      },
    ]);
  });

  it('keeps recipe provenance concise in the list', () => {
    expect(formatEquipmentRecipeProvenance(['Tomato soup'])).toBe('Needed for Tomato soup');
    expect(formatEquipmentRecipeProvenance(['Tomato soup', 'Green sauce', 'Bean soup'])).toBe(
      'Needed for Tomato soup, Green sauce, and 1 more',
    );
  });
});
