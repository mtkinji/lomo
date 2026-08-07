import { fireEvent, render } from '@testing-library/react-native';

import { MealsSettingsView } from './MealsSettingsScreen';

describe('global Meals settings', () => {
  it('mirrors the same diner and food-need editors without owning duplicate state', () => {
    const onOpenDiners = jest.fn();
    const onOpenFoodNeeds = jest.fn();
    const screen = render(<MealsSettingsView
      dinerSummary="3 people"
      foodNeedsSummary="1 recorded"
      onOpenDiners={onOpenDiners}
      onOpenFoodNeeds={onOpenFoodNeeds}
    />);

    fireEvent.press(screen.getByLabelText('Usually cooking for'));
    fireEvent.press(screen.getByLabelText('Food needs'));
    expect(onOpenDiners).toHaveBeenCalled();
    expect(onOpenFoodNeeds).toHaveBeenCalled();
    expect(screen.queryByText(/reminder|notification|diet|dislike/i)).toBeNull();
  });
});
