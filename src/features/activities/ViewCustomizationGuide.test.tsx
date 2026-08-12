import React from 'react';
import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '../../test/renderWithProviders';
import { ViewCustomizationGuide } from './ViewCustomizationGuide';

const mockBottomDrawerProps: Array<Record<string, unknown>> = [];

jest.mock('../../ui/BottomDrawer', () => {
  const { ScrollView } = require('react-native');
  return {
    BottomDrawer: (props: { visible: boolean; children?: React.ReactNode }) => {
      mockBottomDrawerProps.push(props as Record<string, unknown>);
      return props.visible ? props.children : null;
    },
    BottomDrawerScrollView: ScrollView,
  };
});

describe('ViewCustomizationGuide', () => {
  beforeEach(() => mockBottomDrawerProps.splice(0));

  it('uses the standard full-width drawer chrome', () => {
    renderWithProviders(
      <ViewCustomizationGuide
        visible
        onClose={jest.fn()}
        view={{ id: 'week', name: 'Week ahead', filterMode: 'all', sortMode: 'manual' }}
        onApplyPreset={jest.fn()}
        onApplyAiCustomization={jest.fn()}
      />,
    );

    expect(mockBottomDrawerProps.at(-1)).toMatchObject({
      visible: true,
      snapPoints: ['62%'],
    });
    expect(mockBottomDrawerProps.at(-1)).not.toHaveProperty('sheetStyle');
    expect(screen.getByTestId('bottom-drawer.header')).toBeTruthy();
  });
});
