import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { FloatingDockLabeledActionButton } from './FloatingDockLabeledActionButton';

describe('FloatingDockLabeledActionButton', () => {
  it('owns one compact height for both the button and its floating surface', () => {
    const onPress = jest.fn();
    const screen = renderWithProviders(
      <FloatingDockLabeledActionButton
        testID="labeled-dock-action"
        accessibilityLabel="My Rewards"
        accessibilityHint="Shows rewards"
        height={48}
        icon="token"
        isProminent
        label="My Rewards"
        onPress={onPress}
      />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('labeled-dock-action').props.style))
      .toMatchObject({ height: 48 });
    expect(StyleSheet.flatten(screen.getByTestId('labeled-dock-action.surface').props.style))
      .toMatchObject({ height: 48 });
    expect(screen.getByText('My Rewards')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'My Rewards' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
