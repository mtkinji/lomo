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
  scaleRule: { kind: 'multiply' },
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
    }, 2)).toEqual({
      amount: '½ teaspoon',
      ingredient: 'black pepper',
      qualifier: null,
      display: '½ teaspoon black pepper',
    });
  });

  it('separates amount, ingredient, and preparation without changing the display text', () => {
    expect(ingredientDisplayParts(starterIngredient, 2)).toEqual({
      amount: '4 cups',
      ingredient: '(480 g) all-purpose flour',
      qualifier: null,
      display: '4 cups (480 g) all-purpose flour',
    });
    expect(ingredientDisplayParts(
      starterLine('ingredient-butter', 1, '6 tablespoons unsalted butter, melted and cooled'),
      1,
    )).toEqual({
      amount: '6 tablespoons',
      ingredient: 'unsalted butter',
      qualifier: ', melted and cooled',
      display: '6 tablespoons unsalted butter, melted and cooled',
    });
    expect(ingredientDisplayParts(
      starterLine('ingredient-syrup', 2, 'Warm maple syrup, for serving'),
      2,
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
        multiplier={1}
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
        multiplier={1}
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

  it('scales every reviewed bread quantity from one batch and keeps bowl oil fixed', () => {
    const lines = [
      { ...starterIngredient, originalText: '3 1/2 cups (420 grams) all-purpose flour', quantityMin: 3.5, unit: 'cup', ingredientConcept: 'all-purpose flour', parseConfidence: 1 },
      { ...starterLine('ingredient-yeast', 1, '2 1/4 teaspoons instant yeast'), quantityMin: 2.25, unit: 'teaspoon', ingredientConcept: 'instant yeast', parseConfidence: 1 },
      { ...starterLine('ingredient-milk', 2, '1 cup whole milk'), quantityMin: 1, unit: 'cup', ingredientConcept: 'whole milk', parseConfidence: 1 },
      { ...starterLine('ingredient-oil', 3, 'Neutral oil, for the bowl and pan'), scaleRule: { kind: 'fixed' as const, reason: 'as_needed' as const } },
    ];
    const screen = render(
      <RecipeIngredientList lines={lines} multiplier={2} checked={new Set()} onToggle={jest.fn()} />,
    );

    expect(screen.getByText('7 cups (840 grams) all-purpose flour')).toBeTruthy();
    expect(screen.getByText('4 ½ teaspoons instant yeast')).toBeTruthy();
    expect(screen.getByText('2 cups whole milk')).toBeTruthy();
    expect(screen.getByText('Neutral oil, for the bowl and pan')).toBeTruthy();
  });

  it('fails the whole ingredient list closed when any line still requires review', () => {
    const lines = [
      starterIngredient,
      { ...starterLine('ingredient-salt', 1, '1 teaspoon salt'), scaleRule: { kind: 'review_required' as const } },
    ];
    const screen = render(
      <RecipeIngredientList lines={lines} multiplier={2} checked={new Set()} onToggle={jest.fn()} />,
    );

    expect(screen.getByText('2 cups (240 g) all-purpose flour')).toBeTruthy();
    expect(screen.getByText('1 teaspoon salt')).toBeTruthy();
    expect(screen.getByText('Recipe scaling is unavailable for these ingredients.')).toBeTruthy();
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
