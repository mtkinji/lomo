import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { Combobox } from './Combobox';

type MockUnderKeyboardDrawerProps = {
  visible?: boolean;
  children?: React.ReactNode;
  includeKeyboardSpacer?: boolean;
};

const mockUnderKeyboardDrawerProps: MockUnderKeyboardDrawerProps[] = [];

jest.mock('./UnderKeyboardDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    UnderKeyboardDrawer: (props: MockUnderKeyboardDrawerProps) => {
      mockUnderKeyboardDrawerProps.push(props);
      return props.visible
        ? React.createElement(View, { testID: 'under-keyboard-drawer' }, props.children)
        : null;
    },
  };
});

jest.mock('./BottomDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    BottomDrawerScrollView: (props: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'bottom-drawer-scroll-view' }, props.children),
  };
});

describe('Combobox', () => {
  beforeEach(() => {
    mockUnderKeyboardDrawerProps.length = 0;
  });

  it('uses the keyboard-aware drawer mode for searchable picker drawers', () => {
    renderWithProviders(
      <Combobox
        open
        onOpenChange={jest.fn()}
        value="goal-1"
        onValueChange={jest.fn()}
        options={[
          { value: 'goal-1', label: 'Current goal' },
          { value: 'goal-2', label: 'Goal below the fold' },
        ]}
        presentation="drawer"
        trigger={
          <Pressable>
            <View>
              <Text>Goal picker</Text>
            </View>
          </Pressable>
        }
      />,
    );

    expect(mockUnderKeyboardDrawerProps.at(-1)).toEqual(
      expect.objectContaining({
        dynamicHeightUnderKeyboard: true,
        minVisibleContentHeightPx: 480,
      }),
    );
  });
});
