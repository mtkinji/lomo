import { fireEvent, render } from '@testing-library/react-native';

import { MealSetupDrawer } from './MealSetupDrawer';

jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView, View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children }: any) => visible ? <View>{children}</View> : null,
    BottomDrawerScrollView: ({ children }: any) => <ScrollView>{children}</ScrollView>,
  };
});

describe('Meal setup drawer', () => {
  it('offers only the two useful setup choices and remains skippable', () => {
    const onOpenDiners = jest.fn();
    const onOpenFoodNeeds = jest.fn();
    const onDone = jest.fn();
    const onNotNow = jest.fn();
    const screen = render(<MealSetupDrawer
      visible dinerSummary="Everyone" foodNeedsSummary="Add"
      onOpenDiners={onOpenDiners} onOpenFoodNeeds={onOpenFoodNeeds}
      onDone={onDone} onNotNow={onNotNow}
    />);

    expect(screen.getByText('Make Meals fit your household')).toBeTruthy();
    fireEvent.press(screen.getByText('Usually cooking for'));
    fireEvent.press(screen.getByText('Food needs'));
    fireEvent.press(screen.getByText('Done'));
    fireEvent.press(screen.getByText('Not now'));
    expect(onOpenDiners).toHaveBeenCalled();
    expect(onOpenFoodNeeds).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
    expect(onNotNow).toHaveBeenCalled();
    expect(screen.queryByText(/diet|dislike|reminder|notification|adult serving|kid serving/i)).toBeNull();
  });
});
