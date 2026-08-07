import { fireEvent, render } from '@testing-library/react-native';

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
  it('records a must-avoid food for one named person with bounded evidence copy', () => {
    const onSetFoodNeed = jest.fn();
    const screen = render(<FoodNeedsDrawer visible members={members} foodNeeds={[]} onClose={jest.fn()} onSetFoodNeed={onSetFoodNeed} />);

    fireEvent.press(screen.getByLabelText('Record a food need for Avery'));
    fireEvent.changeText(screen.getByPlaceholderText('Food or ingredient'), 'Peanuts');
    fireEvent.press(screen.getByText('Add food to avoid'));

    expect(onSetFoodNeed).toHaveBeenCalledWith({
      personId: 'child', ingredientConcept: 'peanuts', displayLabel: 'Peanuts', present: true,
    });
    expect(screen.getByText(/Kwilt checks recorded ingredients/)).toBeTruthy();
    expect(screen.queryByText(/safe|allergy-safe|compatible/i)).toBeNull();
  });
});
