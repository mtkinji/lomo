import { render } from '@testing-library/react-native';

import { colors } from '../../../theme';
import type { RecipeInstructionCue, RecipeInstructionStep } from '../domain/recipeContracts';
import { RecipeMethodPreview } from './RecipeMethodPreview';

function instruction(
  position: number,
  text: string,
  sectionLabel: string | null,
  cues?: RecipeInstructionCue[],
): RecipeInstructionStep {
  return {
    id: `step-${position + 1}`,
    recipeVersionId: 'version-1',
    position,
    sectionLabel,
    text,
    cues,
  };
}

describe('RecipeMethodPreview', () => {
  it('suppresses a generic Cook label while retaining meaningful section labels', () => {
    const screen = render(
      <RecipeMethodPreview
        steps={[
          instruction(0, 'Whisk the batter.', 'Cook'),
          instruction(1, 'Bake until golden.', 'Bake'),
        ]}
      />,
    );

    expect(screen.queryByText('Cook')).toBeNull();
    expect(screen.getByText('Bake')).toBeTruthy();
  });

  it('renders one neutral phase number with its ordered action lines and grouped accessible copy', () => {
    const screen = render(
      <RecipeMethodPreview
        steps={[instruction(
          0,
          'Whisk the dry ingredients. Whisk the wet ingredients.',
          null,
          [
            { id: 'cue-dry', position: 0, text: 'Whisk the dry ingredients.' },
            { id: 'cue-wet', position: 1, text: 'Whisk the wet ingredients.' },
          ],
        )]}
      />,
    );

    expect(screen.getByTestId('recipe-instruction-number-1')).toHaveStyle({
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 28,
      width: 28,
    });
    expect(screen.getByText('1')).toHaveStyle({ color: colors.primaryForeground });
    expect(screen.getByText('Whisk the dry ingredients.')).toBeTruthy();
    expect(screen.getByText('Whisk the wet ingredients.')).toBeTruthy();
    expect(screen.getAllByTestId(/recipe-instruction-number-/)).toHaveLength(1);
    expect(
      screen.getByLabelText('Phase 1. Whisk the dry ingredients. Whisk the wet ingredients.'),
    ).toBeTruthy();
  });
});
