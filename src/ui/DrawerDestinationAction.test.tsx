import { StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../test/renderWithProviders';
import { DrawerDestinationAction } from './DrawerDestinationAction';

describe('DrawerDestinationAction', () => {
  it('uses the standard centered icon-and-label button anatomy', () => {
    const onPress = jest.fn();
    const { getAllByTestId, getByTestId, getByText, queryAllByTestId } = renderWithProviders(
      <DrawerDestinationAction
        accessibilityHint="Opens the grocery list compiled from planned meals"
        label="View groceries"
        leadingIcon="cart"
        onPress={onPress}
        testID="view-groceries"
      />,
    );

    expect(getAllByTestId('view-groceries.leading-icon').length).toBeGreaterThan(0);
    expect(queryAllByTestId('view-groceries.trailing-icon')).toHaveLength(0);
    expect(getByText('View groceries')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('view-groceries').props.style)).toMatchObject({
      minHeight: 44,
    });

    fireEvent.press(getByTestId('view-groceries'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
