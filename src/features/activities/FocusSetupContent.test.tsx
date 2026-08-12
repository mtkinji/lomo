import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { renderWithProviders } from '../../test/renderWithProviders';
import { FocusSetupContent } from './FocusSetupContent';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));

jest.mock('../../ui/BottomDrawer', () => {
  const React = jest.requireActual('react');
  const { ScrollView } = jest.requireActual('react-native');
  return {
    BottomDrawerScrollView: (props: React.ComponentProps<typeof ScrollView>) => (
      <ScrollView testID="focus-drawer-scroll" {...props} />
    ),
  };
});

jest.mock('../../ui/DropdownMenu', () => {
  const { View } = jest.requireActual('react-native');
  return {
    DropdownMenu: ({ children }: any) => <View>{children}</View>,
    DropdownMenuTrigger: ({ children }: any) => <View>{children}</View>,
    DropdownMenuContent: ({ children, ...props }: any) => (
      <View testID="focus-audio-menu" {...props}>{children}</View>
    ),
    DropdownMenuCheckboxItem: ({ children, style, testID }: any) => (
      <View style={style} testID={testID}>{children}</View>
    ),
  };
});

describe('FocusSetupContent', () => {
  it('owns the shared duration, soundscape, and Start controls', () => {
    const onMinutesChange = jest.fn();
    const onStart = jest.fn();

    const { getAllByText, getByLabelText, getByTestId, getByText, queryByText } = renderWithProviders(
      <FocusSetupContent
        minutes={25}
        presets={[10, 25, 50]}
        customExpanded={false}
        isCustomValue={false}
        customOptions={[5, 10, 15, 20, 25, 30]}
        onMinutesChange={onMinutesChange}
        onCustomExpandedChange={jest.fn()}
        audio="default"
        onAudioChange={jest.fn()}
        portalHostName="focus-setup-test"
        onStart={onStart}
      />,
    );

    expect(getByText('Minutes')).toBeTruthy();
    expect(getByText('Environment')).toBeTruthy();
    expect(queryByText('Music')).toBeNull();
    expect(queryByText('Nature')).toBeNull();
    expect(getAllByText('Deep Work Drift').length).toBeGreaterThan(0);
    expect(getByText('Quiet Rain')).toBeTruthy();
    expect(getByText('Canyon Spring')).toBeTruthy();
    expect(getByText('Quiet')).toBeTruthy();
    expect(queryByText('Forest Stream')).toBeNull();
    expect(queryByText('No audio')).toBeNull();
    expect(getByTestId('focus-soundscape-menu-scroll')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('focus-soundscape-option-default').props.style)).toMatchObject({
      minHeight: 44,
      paddingVertical: spacing.xs,
    });

    fireEvent.press(getByText('50m'));
    fireEvent.press(getByLabelText('Start Focus'));

    expect(onMinutesChange).toHaveBeenCalledWith(50);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('opens audio below the trigger on the full-page host', () => {
    const props = {
      minutes: 25,
      presets: [10, 25, 50],
      customExpanded: false,
      isCustomValue: false,
      customOptions: [5, 10, 15, 20, 25, 30],
      onMinutesChange: jest.fn(),
      onCustomExpandedChange: jest.fn(),
      audio: 'default' as const,
      onAudioChange: jest.fn(),
      portalHostName: 'focus-setup-test',
      onStart: jest.fn(),
    };
    const { getByTestId } = renderWithProviders(<FocusSetupContent {...props} scrollMode="page" />);

    expect(getByTestId('focus-audio-menu').props.side).toBe('bottom');
  });

  it('does not duplicate the shared drawer gutters above and beside its content', () => {
    const { getByTestId } = renderWithProviders(
      <FocusSetupContent
        minutes={25}
        presets={[10, 25, 50]}
        customExpanded={false}
        isCustomValue={false}
        customOptions={[5, 10, 15, 20, 25, 30]}
        onMinutesChange={jest.fn()}
        onCustomExpandedChange={jest.fn()}
        audio="quietRain"
        onAudioChange={jest.fn()}
        portalHostName="focus-setup-test"
        onStart={jest.fn()}
        scrollMode="drawer"
      />,
    );

    expect(StyleSheet.flatten(getByTestId('focus-drawer-scroll').props.contentContainerStyle)).toMatchObject({
      paddingTop: 0,
      paddingHorizontal: 0,
    });
  });
});
