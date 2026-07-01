import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { UnderKeyboardDrawer } from './UnderKeyboardDrawer';

type MockSnapPoint = number | `${number}%`;

type MockBottomDrawerProps = {
  visible?: boolean;
  children?: React.ReactNode;
  snapPoints?: MockSnapPoint[];
};

const mockBottomDrawerProps: MockBottomDrawerProps[] = [];

jest.mock('./BottomDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    BottomDrawer: (props: MockBottomDrawerProps) => {
      mockBottomDrawerProps.push(props);
      return props.visible
        ? React.createElement(View, { testID: 'bottom-drawer' }, props.children)
        : null;
    },
  };
});

describe('UnderKeyboardDrawer', () => {
  beforeEach(() => {
    mockBottomDrawerProps.length = 0;
  });

  it('shrinks visible content to fit above the keyboard when the snap cap is tighter than the requested height', () => {
    const { getByTestId } = renderWithProviders(
      <UnderKeyboardDrawer
        visible
        onClose={jest.fn()}
        dynamicHeightUnderKeyboard
        defaultKeyboardHeightGuessPx={320}
        visibleContentHeightFallbackPx={1000}
        minVisibleContentHeightPx={480}
        snapPoints={[797]}
      >
        <View>
          <Text>Searchable picker content</Text>
        </View>
      </UnderKeyboardDrawer>,
    );

    expect(mockBottomDrawerProps.at(-1)?.snapPoints).toEqual([797]);
    expect(StyleSheet.flatten(getByTestId('under-keyboard-drawer-visible-content').props.style)?.height).toBe(477);
  });
});
