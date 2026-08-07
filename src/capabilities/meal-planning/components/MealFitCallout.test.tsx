import { fireEvent, render } from '@testing-library/react-native';

import { MealFitCallout } from './MealFitCallout';

describe('Meal fit callout', () => {
  it('names authorized recorded evidence and offers contextual resolution', () => {
    const onMakeForOthers = jest.fn();
    const onChooseAnother = jest.fn();
    const screen = render(<MealFitCallout
      fit={{ status: 'recorded_conflict', conflicts: [{ personId: 'child', ingredientConcept: 'peanut', displayLabel: 'Peanuts' }] }}
      personLabelsById={{ child: 'Avery' }} canRevealPersonLabels
      onMakeForOthers={onMakeForOthers} onChooseAnother={onChooseAnother} onReviewIngredients={jest.fn()}
    />);

    expect(screen.getByText("Peanuts conflict with Avery's food needs.")).toBeTruthy();
    fireEvent.press(screen.getByText('Make for everyone else'));
    fireEvent.press(screen.getByText('Choose another meal'));
    expect(onMakeForOthers).toHaveBeenCalled();
    expect(onChooseAnother).toHaveBeenCalled();
    expect(screen.queryByText(/safe|allergy-safe|compatible/i)).toBeNull();
  });

  it('does not reveal private labels without authority', () => {
    const screen = render(<MealFitCallout
      fit={{ status: 'recorded_conflict', conflicts: [{ personId: 'child', ingredientConcept: 'peanut', displayLabel: 'Peanuts' }] }}
      personLabelsById={{ child: 'Avery' }} canRevealPersonLabels={false}
      onMakeForOthers={jest.fn()} onChooseAnother={jest.fn()} onReviewIngredients={jest.fn()}
    />);
    expect(screen.getByText('This meal conflicts with 1 recorded food need.')).toBeTruthy();
    expect(screen.queryByText(/Avery|Peanuts/)).toBeNull();
  });

  it('labels incomplete evidence as not checked', () => {
    const onReviewIngredients = jest.fn();
    const screen = render(<MealFitCallout
      fit={{ status: 'not_checked', conflicts: [] }} personLabelsById={{}} canRevealPersonLabels
      onMakeForOthers={jest.fn()} onChooseAnother={jest.fn()} onReviewIngredients={onReviewIngredients}
    />);
    expect(screen.getByText('Not checked against food needs.')).toBeTruthy();
    fireEvent.press(screen.getByText('Review ingredients'));
    expect(onReviewIngredients).toHaveBeenCalled();
  });
});
