import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { FocusSetupContent } from './FocusSetupContent';

jest.mock('../../ui/DropdownMenu', () => {
  const { View } = jest.requireActual('react-native');
  return {
    DropdownMenu: ({ children }: any) => <View>{children}</View>,
    DropdownMenuTrigger: ({ children }: any) => <View>{children}</View>,
    DropdownMenuContent: ({ children, ...props }: any) => (
      <View testID="focus-audio-menu" {...props}>{children}</View>
    ),
    DropdownMenuCheckboxItem: ({ children }: any) => <View>{children}</View>,
  };
});

describe('FocusSetupContent', () => {
  it('owns the shared duration, soundscape, and Start controls', () => {
    const onMinutesChange = jest.fn();
    const onStart = jest.fn();

    const { getAllByText, getByLabelText, getByText } = renderWithProviders(
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
        allowNoAudio
        portalHostName="focus-setup-test"
        onStart={onStart}
      />,
    );

    expect(getByText('Minutes')).toBeTruthy();
    expect(getByText('Soundscape')).toBeTruthy();
    expect(getAllByText('Deep Work Drift').length).toBeGreaterThan(0);

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
});
