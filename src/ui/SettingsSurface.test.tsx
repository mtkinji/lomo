import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
  SettingsToggleRow,
} from './SettingsSurface';

describe('SettingsSurface', () => {
  it('renders a grouped title, content, footer, and divider', () => {
    const { getByText, getByTestId } = render(
      <SettingsGroup title="Privacy" footer="Only Money is protected.">
        <Text>Financial controls</Text>
        <SettingsDivider />
      </SettingsGroup>,
    );

    expect(getByText('Privacy')).toBeTruthy();
    expect(getByText('Financial controls')).toBeTruthy();
    expect(getByText('Only Money is protected.')).toBeTruthy();
    expect(getByTestId('settings.divider')).toBeTruthy();
  });

  it('renders values, invokes enabled rows, and blocks disabled rows', () => {
    const enabledPress = jest.fn();
    const disabledPress = jest.fn();
    const { getByLabelText } = render(
      <>
        <SettingsRow title="Connected tools" value="2" onPress={enabledPress} />
        <SettingsRow title="Unavailable" disabled onPress={disabledPress} />
      </>,
    );

    fireEvent.press(getByLabelText('Connected tools'));
    expect(getByLabelText('Unavailable').props.accessibilityState).toMatchObject({ disabled: true });

    expect(enabledPress).toHaveBeenCalledTimes(1);
    expect(disabledPress).not.toHaveBeenCalled();
  });

  it('exposes one switch control and invokes its row callback once', () => {
    const onPress = jest.fn();
    const { getAllByRole } = render(
      <SettingsToggleRow title="Privacy lock" enabled={false} onPress={onPress} />,
    );

    const switches = getAllByRole('switch');
    expect(switches).toHaveLength(1);
    fireEvent.press(switches[0]);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes destructive rows as buttons with their title label', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <SettingsRow destructive title="Log out" onPress={onPress} />,
    );

    fireEvent.press(getByLabelText('Log out'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
