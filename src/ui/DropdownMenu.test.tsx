import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

jest.mock('@rn-primitives/dropdown-menu', () => {
  const { Pressable, Text, View: NativeView } = require('react-native');
  return {
    Root: NativeView,
    Trigger: Pressable,
    Group: NativeView,
    Portal: NativeView,
    Overlay: NativeView,
    Content: NativeView,
    Item: Pressable,
    CheckboxItem: Pressable,
    RadioItem: Pressable,
    RadioGroup: NativeView,
    ItemIndicator: NativeView,
    Label: Text,
    Separator: NativeView,
    Sub: NativeView,
    SubTrigger: Pressable,
    SubContent: NativeView,
    useSubContext: () => ({ open: false }),
  };
});

jest.mock('react-native-screens', () => ({ FullWindowOverlay: require('react-native').View }));

jest.mock('./NativeOnlyAnimatedView', () => ({ NativeOnlyAnimatedView: require('react-native').View }));

jest.mock('./Icon', () => {
  const { View } = require('react-native');
  return {
    Icon: ({ name, color }: { name: string; color: string }) => (
      <View testID={`icon-${name}`} accessibilityLabel={color} />
    ),
  };
});

import { DropdownMenuItem } from './DropdownMenu';
import { colors } from '../theme';

describe('DropdownMenuItem', () => {
  it('renders the app-owned label and icon anatomy and handles presses', () => {
    const onPress = jest.fn();
    const { getByRole, getByText } = render(
      <DropdownMenuItem label="Rename" icon="edit" onPress={onPress} />,
    );

    expect(getByText('Rename')).toBeTruthy();
    expect(getByRole('menuitem').props.accessibilityState?.selected).toBeUndefined();
    fireEvent.press(getByRole('menuitem'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('gives destructive items destructive semantics and text treatment', () => {
    const { getByRole, getByText } = render(
      <DropdownMenuItem label="Delete view" icon="trash" variant="destructive" />,
    );

    expect(getByRole('menuitem').props.accessibilityHint).toBe('Destructive action');
    expect(getByText('Delete view')).toHaveStyle({ color: expect.any(String) });
  });

  it('announces the selected state without requiring a custom row', () => {
    const { getByRole, getByTestId } = render(
      <DropdownMenuItem label="List" selected />,
    );

    expect(getByRole('menuitem').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByTestId('icon-check').props.accessibilityLabel).toBe(colors.textPrimary);
  });
});
