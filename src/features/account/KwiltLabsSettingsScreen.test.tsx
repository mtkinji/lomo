import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useKwiltLabsStore } from '../../labs/useKwiltLabsStore';
import { KwiltLabsSettingsSurface } from './KwiltLabsSettingsScreen';

jest.mock('../../ui/layout/AppShell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    AppShell: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('../../ui/KwiltSwitch', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    KwiltSwitch: ({ accessibilityLabel, accessible, disabled, onPress, value }: {
      accessibilityLabel?: string;
      accessible?: boolean;
      disabled?: boolean;
      onPress: () => void;
      value: boolean;
    }) =>
      React.createElement(Pressable, {
        accessibilityLabel,
        accessibilityRole: accessible === false ? undefined : 'switch',
        accessibilityState: { checked: value, disabled },
        disabled,
        onPress,
      }),
  };
});

describe('KwiltLabsSettingsScreen', () => {
  beforeEach(() => {
    useKwiltLabsStore.setState({ enabledCapabilities: [] });
  });

  it('shows Explore off by default and lets the user opt in', () => {
    const screen = renderWithProviders(
      <KwiltLabsSettingsSurface onBack={jest.fn()} />,
    );

    const explore = screen.getByRole('switch', { name: 'Explore' });
    expect(explore.props.accessibilityState.checked).toBe(false);
    expect(screen.getByText('Build a private map of the places and paths you discover.')).toBeTruthy();

    fireEvent.press(explore);
    expect(useKwiltLabsStore.getState().enabledCapabilities).toEqual(['explore']);
    expect(screen.getByRole('switch', { name: 'Explore' }).props.accessibilityState.checked).toBe(true);
  });
});
