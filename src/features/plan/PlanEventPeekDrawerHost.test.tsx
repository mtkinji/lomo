import React from 'react';
import type { TextInput } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PlanEventPeekDrawerHost } from './PlanEventPeekDrawerHost';

const mockBottomDrawerProps: Array<Record<string, unknown>> = [];
const mockScrollViewProps: Array<Record<string, unknown>> = [];

jest.mock('../../ui/BottomDrawer', () => ({
  BottomDrawer: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => {
    const React = require('react');
    const { View } = require('react-native');
    mockBottomDrawerProps.push(props);
    return <View>{children}</View>;
  },
  BottomDrawerScrollView: ({
    children,
    ...props
  }: { children?: React.ReactNode } & Record<string, unknown>) => {
    const React = require('react');
    const { View } = require('react-native');
    mockScrollViewProps.push(props);
    return <View>{children}</View>;
  },
}));

jest.mock('../../ui/layout/BottomDrawerHeader', () => ({
  BottomDrawerHeader: ({ title, subtitle }: { title?: React.ReactNode; subtitle?: React.ReactNode }) => {
    const React = require('react');
    const { Text, View } = require('react-native');
    return (
      <View>
        {title}
        {subtitle ? <Text>{subtitle}</Text> : null}
      </View>
    );
  },
}));

jest.mock('./PlanRecsPage', () => ({ PlanRecsPage: () => null }));
jest.mock('./ActivityEventPeek', () => ({ ActivityEventPeek: () => null }));
jest.mock('./ExternalEventPeek', () => ({ ExternalEventPeek: () => null }));
jest.mock('./PlanSlotCapturePage', () => ({
  PlanSlotCapturePage: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text>Slot capture content</Text>;
  },
}));

const slotCapture = {
  start: new Date(2026, 6, 13, 13, 0),
  end: new Date(2026, 6, 13, 14, 0),
  quickAdd: {
    value: '',
    onChangeText: jest.fn(),
    inputRef: React.createRef<TextInput | null>(),
    isFocused: false,
    setIsFocused: jest.fn(),
    onSubmit: jest.fn(),
    onCollapse: jest.fn(),
    selectedAiActions: ['steps' as const],
    onSelectedAiActionsChange: jest.fn(),
  },
  existingActivities: [],
  selectedActivityId: null,
  createdActivityId: null,
  committingActivityId: null,
  onSelectActivity: jest.fn(),
  onCommitNew: jest.fn(),
  onCommitExisting: jest.fn(),
};

describe('PlanEventPeekDrawerHost slot capture', () => {
  beforeEach(() => {
    mockBottomDrawerProps.length = 0;
    mockScrollViewProps.length = 0;
  });

  it('lets content use the bottom safe-area region without explanatory header copy', () => {
    const { queryByText } = renderWithProviders(
      <PlanEventPeekDrawerHost
        visible
        mode="slotCapture"
        onClose={jest.fn()}
        slotCapture={slotCapture}
      />,
    );

    expect(mockBottomDrawerProps.at(-1)?.contentExtendsIntoBottomSafeArea).toBe(true);
    expect(mockBottomDrawerProps.at(-1)?.snapPoints).toEqual(['56%', '82%']);
    expect(mockBottomDrawerProps.at(-1)?.initialSnapIndex).toBe(0);
    expect(mockScrollViewProps).toHaveLength(0);
    expect(queryByText('Drag the block or its handles to adjust the time.')).toBeNull();
  });
});
