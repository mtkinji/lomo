import { recipeVersionContractFixture } from './recipeContractFixtures';
import {
  buildRecipeInstructionPhases,
  segmentEditorialInstructionCues,
} from './recipeInstructionPhases';

describe('recipe instruction phases', () => {
  it('uses explicit ordered cues as the shared phase structure', () => {
    const step = {
      ...recipeVersionContractFixture().instructions[0],
      text: 'Whisk the dry ingredients. Whisk the wet ingredients.',
      cues: [
        { id: 'cue-dry', position: 0, text: 'Whisk the dry ingredients.' },
        { id: 'cue-wet', position: 1, text: 'Whisk the wet ingredients.' },
      ],
    };

    expect(buildRecipeInstructionPhases([step])).toEqual([
      expect.objectContaining({
        id: step.id,
        title: step.sectionLabel,
        fullText: step.text,
        cues: step.cues,
      }),
    ]);
  });

  it('keeps a legacy instruction as one cue instead of guessing at personal-recipe boundaries', () => {
    const step = {
      ...recipeVersionContractFixture().instructions[0],
      text: 'Whisk the dry ingredients. Whisk the wet ingredients.',
      cues: undefined,
    };

    expect(buildRecipeInstructionPhases([step])[0].cues).toEqual([
      {
        id: `${step.id}-cue-1`,
        position: 0,
        text: step.text,
        mediaAssetIds: step.mediaAssetIds ?? [],
      },
    ]);
  });

  it('segments authored editorial sentences but keeps semicolon clauses together', () => {
    expect(segmentEditorialInstructionCues(
      'Lightly grease the griddle. Cook until bubbles remain open, 2 to 3 minutes. Flip once; cook without pressing.',
    )).toEqual([
      'Lightly grease the griddle.',
      'Cook until bubbles remain open, 2 to 3 minutes.',
      'Flip once; cook without pressing.',
    ]);
  });
});
