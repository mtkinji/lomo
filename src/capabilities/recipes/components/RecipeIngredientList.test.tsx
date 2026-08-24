import { fireEvent, render } from '@testing-library/react-native';
import { createRef } from 'react';
import type { View } from 'react-native';

import { colors, fonts } from '../../../theme';
import type { RecipeIngredientLine } from '../domain/recipeContracts';
import {
  ingredientDisplayParts,
  RecipeIngredientChecklist,
  RecipeIngredientList,
} from './RecipeIngredientList';

const starterIngredient: RecipeIngredientLine = {
  id: 'ingredient-flour',
  recipeVersionId: 'recipe-version-1',
  position: 0,
  groupLabel: null,
  originalText: '2 cups (240 g) all-purpose flour',
  quantityMin: null,
  quantityMax: null,
  unit: null,
  ingredientConcept: null,
  preparation: null,
  optional: false,
  parseConfidence: 1,
};

function starterLine(id: string, position: number, originalText: string): RecipeIngredientLine {
  return { ...starterIngredient, id, position, originalText };
}

describe('RecipeIngredientList', () => {
  it('keeps a scaled sixth in cooking-fraction form', () => {
    expect(ingredientDisplayParts({
      ...starterIngredient,
      originalText: '1/4 teaspoon black pepper',
      quantityMin: 0.25,
      unit: 'teaspoon',
      ingredientConcept: 'black pepper',
      parseConfidence: 0.98,
    }, 6, 4)).toEqual({
      amount: '⅙ teaspoon',
      ingredient: 'black pepper',
      qualifier: null,
      display: '⅙ teaspoon black pepper',
    });
  });

  it('separates amount, ingredient, and preparation without changing the display text', () => {
    expect(ingredientDisplayParts(starterIngredient, 4, 6)).toEqual({
      amount: '3 cups',
      ingredient: '(240 g) all-purpose flour',
      qualifier: null,
      display: '3 cups (240 g) all-purpose flour',
    });
    expect(ingredientDisplayParts(
      starterLine('ingredient-butter', 1, '6 tablespoons unsalted butter, melted and cooled'),
      6,
      6,
    )).toEqual({
      amount: '6 tablespoons',
      ingredient: 'unsalted butter',
      qualifier: ', melted and cooled',
      display: '6 tablespoons unsalted butter, melted and cooled',
    });
    expect(ingredientDisplayParts(
      starterLine('ingredient-syrup', 2, 'Warm maple syrup, for serving'),
      4,
      6,
    )).toEqual({
      amount: null,
      ingredient: 'Warm maple syrup',
      qualifier: ', for serving',
      display: 'Warm maple syrup, for serving',
    });
  });

  it('lets the cook temporarily check and uncheck ingredient rows', () => {
    const onToggle = jest.fn();
    const screen = render(
      <RecipeIngredientList
        lines={[starterIngredient]}
        fromYield={4}
        toYield={4}
        checked={new Set()}
        onToggle={onToggle}
      />,
    );

    const ingredient = screen.getByRole('checkbox');
    expect(ingredient.props.accessibilityState).toEqual({ checked: false });
    fireEvent.press(ingredient);
    expect(onToggle).toHaveBeenCalledWith('ingredient-flour');

    screen.rerender(
      <RecipeIngredientList
        lines={[starterIngredient]}
        fromYield={4}
        toYield={4}
        checked={new Set(['ingredient-flour'])}
        onToggle={onToggle}
      />,
    );
    expect(screen.getByRole('checkbox').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByTestId('ingredient-check-ingredient-flour')).toHaveStyle({
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    });
    expect(screen.getByTestId('ingredient-list')).toHaveStyle({ gap: 0 });
    expect(screen.getByTestId('ingredient-amount-ingredient-flour')).toHaveStyle({
      fontFamily: fonts.medium,
    });
    expect(screen.getByTestId('ingredient-name-ingredient-flour')).toHaveStyle({
      fontFamily: fonts.regular,
    });
  });

  it('rescales a starter-style ingredient when the serving count changes', () => {
    const lines = [
      starterIngredient,
      starterLine('ingredient-salt', 1, '1 teaspoon Diamond Crystal kosher salt'),
      starterLine('ingredient-eggs', 2, '2 large eggs'),
      starterLine('ingredient-syrup', 3, 'Warm maple syrup, for serving'),
    ];
    const screen = render(
      <RecipeIngredientList lines={lines} fromYield={4} toYield={4} checked={new Set()} onToggle={jest.fn()} />,
    );

    expect(screen.getByText('2 cups (240 g) all-purpose flour')).toBeTruthy();

    screen.rerender(
      <RecipeIngredientList lines={lines} fromYield={4} toYield={6} checked={new Set()} onToggle={jest.fn()} />,
    );

    expect(screen.getByText('3 cups (240 g) all-purpose flour')).toBeTruthy();
    expect(screen.getByText('1 ½ teaspoons Diamond Crystal kosher salt')).toBeTruthy();
    expect(screen.getByText('3 large eggs')).toBeTruthy();
    expect(screen.getByText('Warm maple syrup, for serving')).toBeTruthy();
    expect(screen.queryByText('2 cups (240 g) all-purpose flour')).toBeNull();
  });

  it('can target the first still-needed checklist row for education', () => {
    const targetRef = createRef<View>();
    const screen = render(
      <RecipeIngredientChecklist
        items={[
          { id: 'already-have', display: 'Flour' },
          { id: 'still-needed', display: 'Eggs' },
        ]}
        checked={new Set(['already-have'])}
        onToggle={jest.fn()}
        firstItemTargetRef={targetRef}
        targetItemId="still-needed"
      />,
    );

    expect(screen.getByTestId('ingredient-coachmark-target')).toHaveProp('collapsable', false);
    expect(screen.getByTestId('ingredient-coachmark-target').findByProps({
      accessibilityLabel: 'Eggs',
    })).toBeTruthy();
  });
});
