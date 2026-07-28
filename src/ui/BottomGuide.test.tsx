import React from 'react';
import { Text, View } from 'react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { BottomGuide } from './BottomGuide';

const mockBottomDrawerProps: Array<Record<string, unknown>> = [];

jest.mock('./BottomDrawer', () => ({
  BottomDrawer: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => {
    const React = require('react');
    const { View } = require('react-native');
    mockBottomDrawerProps.push(props);
    return <View>{children}</View>;
  },
}));

describe('BottomGuide interaction semantics', () => {
  beforeEach(() => {
    mockBottomDrawerProps.length = 0;
  });

  it('uses a blocking, dismissible backdrop when a scrim is visible', () => {
    renderWithProviders(
      <BottomGuide visible scrim="light" onClose={jest.fn()}>
        <Text>Guidance</Text>
      </BottomGuide>,
    );

    expect(mockBottomDrawerProps.at(-1)?.hideBackdrop).toBe(false);
    expect(mockBottomDrawerProps.at(-1)?.dismissOnBackdropPress).toBe(true);
    expect(mockBottomDrawerProps.at(-1)?.scrimToken).toBe('pineSubtle');
  });

  it('keeps the underlying canvas interactive when there is no scrim', () => {
    renderWithProviders(
      <BottomGuide visible scrim="none" onClose={jest.fn()}>
        <Text>Guidance</Text>
      </BottomGuide>,
    );

    expect(mockBottomDrawerProps.at(-1)?.hideBackdrop).toBe(true);
    expect(mockBottomDrawerProps.at(-1)?.dismissOnBackdropPress).toBe(false);
  });
});
