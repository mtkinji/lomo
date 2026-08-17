import { resolveRecipeEditorialPicks } from './recipeEditorialPicks';

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
    })).toEqual([expect.objectContaining({
      id: 'kitchenaid-7-cup-food-processor',
      equipmentId: 'food-processor',
      asin: 'B07BW1ZPB5',
      title: 'KitchenAid 7-Cup Food Processor',
      thumbnailAsset: 'food-processor',
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
    })).toEqual([]);
  });

  it('uses deterministic instruction evidence when an editorial recipe has no stored equipment', () => {
    expect(resolveRecipeEditorialPicks({
      equipmentRequirements: [],
      instructions: ['Pulse the pesto briefly in a food processor.'],
    })).toEqual([expect.objectContaining({ equipmentId: 'food-processor' })]);
  });
});
