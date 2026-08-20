import { Animated, StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../../test/renderWithProviders';
import { getCapabilityOnboardingDoors } from './capabilityOnboardingContracts';
import { CapabilityValueDoorScreen } from './CapabilityValueDoorScreen';

describe('CapabilityValueDoorScreen', () => {
  it('keeps one outcome and one dominant action', () => {
    const door = getCapabilityOnboardingDoors('development')[0];
    const onStart = jest.fn();
    const screen = renderWithProviders(
      <CapabilityValueDoorScreen door={door} onStart={onStart} />,
    );

    expect(screen.getByRole('header', { name: door.story.headline })).toBeTruthy();
    expect(screen.getByText(door.story.body)).toBeTruthy();
    expect(screen.getByLabelText(door.story.illustrationLabel)).toBeTruthy();
    expect(screen.queryByText(/features/i)).toBeNull();
    expect(screen.queryByText(/swipe to choose/i)).toBeNull();
    expect(
      screen.getByTestId('capabilityOnboarding.primaryActionArrow', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(
      screen.getByTestId(`capabilityOnboarding.primaryActionIcon.${door.id}`, {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();

    const primaryAction = screen.getByRole('button', { name: door.story.actionLabel });
    expect(StyleSheet.flatten(primaryAction.props.style).width).not.toBe('100%');
    const timingSpy = jest.spyOn(Animated, 'timing');
    fireEvent(primaryAction, 'pressIn');
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 4, duration: 90, useNativeDriver: true }),
    );
    fireEvent(primaryAction, 'pressOut');
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0, duration: 140, useNativeDriver: true }),
    );
    timingSpy.mockRestore();

    fireEvent.press(primaryAction);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
