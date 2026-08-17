import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../../test/renderWithProviders';
import { useAppStore } from '../../store/useAppStore';
import { useHouseholdMealPreferencesStore } from '../household-food/runtime/useHouseholdMealPreferencesStore';
import { MealsSettingsScreen, MealsSettingsView } from './MealsSettingsScreen';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: jest.fn() }),
  };
});

describe('global Meals settings', () => {
  beforeEach(() => {
    useAppStore.getState().clearAuthIdentity();
    useHouseholdMealPreferencesStore.setState({
      userId: null,
      projection: null,
      status: 'idle',
      error: null,
    });
  });

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

  it('loads household meal preferences when Settings opens before Meals', async () => {
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', email: 'user@example.com' });
    const setIdentity = jest.fn().mockResolvedValue(undefined);
    useHouseholdMealPreferencesStore.setState({ setIdentity });

    renderWithProviders(<MealsSettingsScreen />);

    await waitFor(() => expect(setIdentity).toHaveBeenCalledWith('user-1'));
  });
});
