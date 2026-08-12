import { render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { AppShell } from './AppShell';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 0, left: 0 }),
}));

describe('AppShell', () => {
  it('can remove only the horizontal canvas inset while preserving the safe-area top', () => {
    const screen = render(
      <AppShell fullBleedHorizontal>
        <View testID="app-shell-child" />
      </AppShell>,
    );

    expect(StyleSheet.flatten(screen.getByTestId('app-shell-container').props.style)).toMatchObject({
      paddingHorizontal: 0,
      paddingTop: 47,
    });
  });
});
