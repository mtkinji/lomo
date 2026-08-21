import {
  countRecipeEquipmentUsage,
  resolveRecipeEditorialPicks,
} from './recipeEditorialPicks';

describe('recipe editorial equipment picks', () => {
  it('matches a generic required food processor to the practical Kwilt pick', () => {
    expect(resolveRecipeEditorialPicks({
      equipmentRequirements: [{
        id: 'food-processor',
        label: 'Food processor',
        searchQuery: 'food processor',
        necessity: 'required',
        confidence: 0.96,
        evidenceText: 'Pulse the basil in a food processor.',
        substitute: null,
      }],
      instructions: ['Pulse the basil in a food processor.'],
      equipmentUsageCounts: { 'food-processor': 4 },
      asOf: '2026-08-20',
    })).toEqual([expect.objectContaining({
      id: 'kitchenaid-7-cup-food-processor',
      equipmentId: 'food-processor',
      productId: 'kitchenaid-7-cup-food-processor',
      retailerListingId: 'amazon-us-kitchenaid-7-cup-food-processor',
      retailerExternalProductId: 'B07BW1ZPB5',
      title: 'KitchenAid 7-Cup Food Processor',
      thumbnailAsset: 'food-processor',
      recipeCount: 4,
      substituteSummary: expect.stringContaining('knife'),
      tradeoff: expect.any(String),
    })]);
  });

  it('does not recommend an undersized editorial pick when the recipe requires more capacity', () => {
    expect(resolveRecipeEditorialPicks({
      equipmentRequirements: [{
        id: 'food-processor',
        label: '12-cup food processor',
        searchQuery: '12-cup food processor',
        necessity: 'required',
        confidence: 0.98,
        evidenceText: 'Transfer the dough to a 12-cup food processor.',
        substitute: null,
      }],
      instructions: ['Transfer the dough to a 12-cup food processor.'],
      asOf: '2026-08-20',
    })).toEqual([]);
  });

  it('does not merchandise optional or substitutable equipment', () => {
    expect(resolveRecipeEditorialPicks({
      equipmentRequirements: [{
        id: 'food-processor',
        label: 'Food processor',
        searchQuery: 'food processor',
        necessity: 'preferred',
        confidence: 1,
        evidenceText: 'Use a food processor, or chop by hand.',
        substitute: 'Chop by hand',
      }],
      instructions: ['Use a food processor, or chop by hand.'],
      asOf: '2026-08-20',
    })).toEqual([]);
  });

  it('uses deterministic instruction evidence when an editorial recipe has no stored equipment', () => {
    expect(resolveRecipeEditorialPicks({
      equipmentRequirements: [],
      instructions: ['Pulse the pesto briefly in a food processor.'],
      asOf: '2026-08-20',
    })).toEqual([expect.objectContaining({ equipmentId: 'food-processor' })]);
  });

  it('counts each Recipe once when explaining how broadly a tool is useful', () => {
    expect(countRecipeEquipmentUsage({
      recipes: [
        { equipmentRequirements: [], instructions: ['Pulse once in a food processor. Then pulse again in the food processor.'] },
        { equipmentRequirements: [], instructions: ['Chop by hand.'] },
        { equipmentRequirements: [], instructions: ['Use a food processor for the filling.'] },
      ],
    })).toEqual({ 'food-processor': 2 });
  });
});
