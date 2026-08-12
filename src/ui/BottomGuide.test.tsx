import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { radii, spacing } from '../theme';
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
    expect(mockBottomDrawerProps.at(-1)?.presentation).toBe('modal');
  });

  it('keeps the underlying canvas interactive when there is no scrim', () => {
    renderWithProviders(
      <BottomGuide visible scrim="none" onClose={jest.fn()}>
        <Text>Guidance</Text>
      </BottomGuide>,
    );

    expect(mockBottomDrawerProps.at(-1)?.hideBackdrop).toBe(true);
    expect(mockBottomDrawerProps.at(-1)?.dismissOnBackdropPress).toBe(false);
    expect(mockBottomDrawerProps.at(-1)?.presentation).toBe('inline');
  });

  it('floats by default with equal clearance from the left, right, and bottom edges', () => {
    renderWithProviders(
      <BottomGuide visible onClose={jest.fn()}>
        <Text>Guidance</Text>
      </BottomGuide>,
    );

    const sheetStyle = StyleSheet.flatten(mockBottomDrawerProps.at(-1)?.sheetStyle as object);
    expect(sheetStyle).toMatchObject({
      borderRadius: radii.deviceSheet + spacing.xs,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
    });
  });

  it('keeps drawer-like guides anchored when inset layout is explicit', () => {
    renderWithProviders(
      <BottomGuide visible layout="inset" onClose={jest.fn()}>
        <Text>Guidance</Text>
      </BottomGuide>,
    );

    const sheetStyle = StyleSheet.flatten(mockBottomDrawerProps.at(-1)?.sheetStyle as object);
    expect(sheetStyle).toMatchObject({
      borderRadius: radii.sheet,
      marginHorizontal: spacing.md,
    });
    expect(sheetStyle).not.toHaveProperty('marginBottom');
  });

  it('can use an explicit close header without rendering drag chrome', () => {
    renderWithProviders(
      <BottomGuide visible showDragHandle={false} onClose={jest.fn()}>
        <Text>Guidance</Text>
      </BottomGuide>,
    );

    const drawerProps = mockBottomDrawerProps.at(-1);
    expect(drawerProps?.dismissable).toBe(true);
    expect(drawerProps?.enableContentPanningGesture).toBe(false);
    expect(StyleSheet.flatten(drawerProps?.handleContainerStyle as object)).toMatchObject({
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
    });
    expect(StyleSheet.flatten(drawerProps?.handleStyle as object)).toMatchObject({
      width: 0,
      height: 0,
      opacity: 0,
    });
  });

  it('can retain a modal guide long enough to animate its close transition', () => {
    renderWithProviders(
      <BottomGuide visible scrim="light" animateOnClose onClose={jest.fn()}>
        <Text>Guidance</Text>
      </BottomGuide>,
    );

    expect(mockBottomDrawerProps.at(-1)?.animateOnHide).toBe(true);
  });

  it('can host the primary action for an in-place progressive form', () => {
    renderWithProviders(
      <BottomGuide visible scrim="light" bottomAccessory={<Text>Done</Text>} onClose={jest.fn()}>
        <Text>Guidance</Text>
      </BottomGuide>,
    );

    expect(mockBottomDrawerProps.at(-1)?.bottomAccessory).toBeTruthy();
    expect(mockBottomDrawerProps.at(-1)?.contentExtendsIntoBottomSafeArea).toBe(true);
  });
});
