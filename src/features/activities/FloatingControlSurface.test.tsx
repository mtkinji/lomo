import React from 'react';
import { StyleSheet, View } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { FloatingControlSurface } from './FloatingControlSurface';

describe('FloatingControlSurface', () => {
  it('keeps the broad floating shadow and adds a tighter contact shadow', () => {
    const { getByTestId } = renderWithProviders(
      <FloatingControlSurface
        testID="floating-control"
        borderRadius={24}
        isProminent
        style={{ width: 48, height: 48 }}
      >
        <View />
      </FloatingControlSurface>,
    );

    expect(StyleSheet.flatten(getByTestId('floating-control').props.style)).toMatchObject({
      shadowOpacity: 0.11,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 3 },
    });
    expect(
      StyleSheet.flatten(getByTestId('floating-control.contactShadow').props.style),
    ).toMatchObject({
      shadowColor: '#0F172A',
      shadowOpacity: 0.21,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 1 },
    });
  });

  it('uses a quieter contact shadow without an ambient shadow when embedded', () => {
    const { getByTestId } = renderWithProviders(
      <FloatingControlSurface
        testID="embedded-control"
        borderRadius={24}
        isProminent
        variant="embedded"
        style={{ width: 48, height: 48 }}
      >
        <View />
      </FloatingControlSurface>,
    );

    expect(StyleSheet.flatten(getByTestId('embedded-control').props.style)).toMatchObject({
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
    });
    expect(StyleSheet.flatten(getByTestId('embedded-control').props.style)).not.toHaveProperty(
      'shadowOpacity',
    );
    expect(
      StyleSheet.flatten(getByTestId('embedded-control.contactShadow').props.style),
    ).toMatchObject({
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    });
  });
});
