import { recipeContractFixture, recipeVersionContractFixture } from '../../capabilities/recipes/domain/recipeContractFixtures';
import { collectCapabilityEvidence, recipesChatAdapter } from './capabilityAdapters';

describe('Recipe Chat evidence', () => {
  const projection = {
    recipe: recipeContractFixture(),
    currentVersion: recipeVersionContractFixture(),
  };

  it('projects the exact recipe facts needed for a contextual conversation', () => {
    const [evidence] = recipesChatAdapter.evidence.list({ recipes: [projection] });

    expect(evidence).toMatchObject({
      capabilityId: 'recipes',
      object: { type: 'recipe', id: projection.recipe.id, label: projection.currentVersion.title },
      authority: 'authoritative',
    });
    expect(evidence.summary).toContain(projection.currentVersion.ingredients[0].originalText);
    expect(evidence.summary).toContain(projection.currentVersion.instructions[0].text);
  });

  it('includes Recipe evidence only when Recipes participates in the turn', () => {
    const snapshots = {
      goals: { goals: [] },
      todos: { activities: [], goals: [] },
      chapters: { chapters: [] },
      recipes: { recipes: [projection] },
    };
    expect(collectCapabilityEvidence({ participatingCapabilities: ['recipes'], snapshots })).toHaveLength(1);
    expect(collectCapabilityEvidence({ participatingCapabilities: ['goals'], snapshots })).toHaveLength(0);
  });
});
