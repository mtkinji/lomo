import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../../../test/renderWithProviders';
import { FoodOnboardingFlow } from './FoodOnboardingFlow';

let mockReduceMotionEnabled = false;

jest.mock('../../../ui/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({ reduceMotionEnabled: mockReduceMotionEnabled, screenReaderEnabled: false }),
}));

describe('FoodOnboardingFlow', () => {
  beforeEach(() => {
    mockReduceMotionEnabled = false;
  });

  it('uses two energetic moments, then opens the real Recipes library', () => {
    const onCheckpoint = jest.fn();
    const onStartChoosing = jest.fn();
    const screen = renderWithProviders(
      <FoodOnboardingFlow
        onCheckpoint={onCheckpoint}
        onChooseAnotherPath={jest.fn()}
        onStartChoosing={onStartChoosing}
      />,
    );

    expect(screen.getByText('Find meals everyone can get behind.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Plan it. Shop it. Cook it.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Browse recipes' }));
    expect(onStartChoosing).toHaveBeenCalledTimes(1);
    expect(onCheckpoint).toHaveBeenLastCalledWith('follow-through');
  });

  it('supports Back and the global path chooser without adding another Food chooser', () => {
    const onChooseAnotherPath = jest.fn();
    const screen = renderWithProviders(
      <FoodOnboardingFlow
        initialMomentId="follow-through"
        onCheckpoint={jest.fn()}
        onChooseAnotherPath={onChooseAnotherPath}
        onStartChoosing={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Find meals everyone can get behind.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Change path' }));
    expect(onChooseAnotherPath).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('What do you need right now?')).toBeNull();
  });

  it('preserves the same sequence and actions with Reduce Motion enabled', () => {
    mockReduceMotionEnabled = true;
    const screen = renderWithProviders(
      <FoodOnboardingFlow
        initialMomentId="follow-through"
        onCheckpoint={jest.fn()}
        onChooseAnotherPath={jest.fn()}
        onStartChoosing={jest.fn()}
      />,
    );

    expect(screen.getByText('Plan it. Shop it. Cook it.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Browse recipes' })).toBeTruthy();
  });
});
