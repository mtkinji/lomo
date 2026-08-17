import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../../theme';
import { FoodNeedsDrawer } from './FoodNeedsDrawer';

jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView, View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children }: any) => visible ? <View>{children}</View> : null,
    BottomDrawerScrollView: ({ children }: any) => <ScrollView>{children}</ScrollView>,
  };
});

const members = [
  { id: 'membership-adult', personId: 'adult', displayName: 'Blair', kind: 'adult' as const, role: 'owner' as const },
  { id: 'membership-child', personId: 'child', displayName: 'Avery', kind: 'dependent' as const, role: 'child' as const },
];

describe('Food needs drawer', () => {
  it('keeps the drawer copy to section labels and the evidence caveat', () => {
    const screen = render(<FoodNeedsDrawer visible members={members} foodNeeds={[]} onClose={jest.fn()} onSetFoodNeed={jest.fn()} />);

    expect(screen.queryByText('Choose a person, then add foods they need to avoid.')).toBeNull();
    expect(screen.getByText('Person')).toBeTruthy();
    expect(screen.getByText('Common foods')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
    expect(screen.getByText('Kwilt flags recorded ingredients when available. Always check labels.')).toBeTruthy();
  });

  it('uses a neutral selected state for the active person', () => {
    const screen = render(<FoodNeedsDrawer visible members={members} foodNeeds={[]} onClose={jest.fn()} onSetFoodNeed={jest.fn()} />);

    const selectedPerson = screen.getByLabelText('Record a food need for Blair');
    expect(StyleSheet.flatten(selectedPerson.props.style)).toMatchObject({ backgroundColor: colors.sumi900 });
    expect(StyleSheet.flatten(screen.getByText('Blair').props.style)).toMatchObject({ color: colors.primaryForeground });
  });

  it('records a must-avoid food for one named person with bounded evidence copy', () => {
    const onSetFoodNeed = jest.fn();
    const screen = render(<FoodNeedsDrawer visible members={members} foodNeeds={[]} onClose={jest.fn()} onSetFoodNeed={onSetFoodNeed} />);

    fireEvent.press(screen.getByLabelText('Record a food need for Avery'));
    fireEvent.changeText(screen.getByPlaceholderText('Food or ingredient'), 'Peanuts');
    fireEvent.press(screen.getByText('Add'));

    expect(onSetFoodNeed).toHaveBeenCalledWith({
      personId: 'child', ingredientConcept: 'peanuts', displayLabel: 'Peanuts', present: true,
    });
    expect(screen.getByText(/Kwilt flags recorded ingredients/)).toBeTruthy();
    expect(screen.queryByText(/safe|allergy-safe|compatible/i)).toBeNull();
  });

  it('records a common food for the selected person with one tap', () => {
    const onSetFoodNeed = jest.fn();
    const screen = render(<FoodNeedsDrawer visible members={members} foodNeeds={[]} onClose={jest.fn()} onSetFoodNeed={onSetFoodNeed} />);

    fireEvent.press(screen.getByLabelText('Record a food need for Avery'));
    fireEvent.press(screen.getByLabelText('Add Peanuts for Avery'));

    expect(onSetFoodNeed).toHaveBeenCalledWith({
      personId: 'child', ingredientConcept: 'peanut', displayLabel: 'Peanuts', present: true,
    });
    expect(screen.getByText('Tree nuts')).toBeTruthy();
    expect(screen.getByText('Sesame')).toBeTruthy();
  });

  it('removes a recorded common food from its selected chip', () => {
    const onSetFoodNeed = jest.fn();
    const screen = render(<FoodNeedsDrawer
      visible
      members={members}
      foodNeeds={[{ id: 'need-peanut', personId: 'adult', kind: 'must_avoid', ingredientConcept: 'peanut', displayLabel: 'Peanuts' }]}
      onClose={jest.fn()}
      onSetFoodNeed={onSetFoodNeed}
    />);

    const peanut = screen.getByLabelText('Remove Peanuts for Blair');
    expect(peanut.props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(peanut);

    expect(onSetFoodNeed).toHaveBeenCalledWith({
      personId: 'adult', ingredientConcept: 'peanut', displayLabel: 'Peanuts', present: false,
    });
  });
});
