import React from 'react';
import type { TextInput } from 'react-native';
import { act } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PlanEventPeekDrawerHost } from './PlanEventPeekDrawerHost';

const mockBottomDrawerProps: Array<Record<string, unknown>> = [];
const mockScrollViewProps: Array<Record<string, unknown>> = [];
const mockActivityPeekProps: Array<Record<string, unknown>> = [];
const mockPlanRecsProps: Array<Record<string, unknown>> = [];

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

jest.mock('./PlanRecsPage', () => ({
  PlanRecsPage: (props: Record<string, unknown>) => {
    mockPlanRecsProps.push(props);
    return null;
  },
}));
jest.mock('./ActivityEventPeek', () => ({
  ActivityEventPeek: (props: Record<string, unknown>) => {
    const React = require('react');
    const { Text } = require('react-native');
    mockActivityPeekProps.push(props);
    return <Text>Activity details content</Text>;
  },
}));
jest.mock('./ExternalEventPeek', () => ({ ExternalEventPeek: () => null }));
jest.mock('./PlanSessionEditPage', () => ({ PlanSessionEditPage: () => null }));
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
  activities: [],
  goals: [],
  scheduledProposalIds: [],
  selectedActivityId: null,
  createdActivityId: null,
  committingActivityId: null,
  onSelectActivity: jest.fn(),
  onCommitNew: jest.fn(),
  onCommitExisting: jest.fn(),
};

const sessionEdit = {
  title: 'Work on Adobe presentation',
  start: new Date(2026, 7, 11, 13, 0),
  end: new Date(2026, 7, 11, 17, 0),
  isSaving: false,
};

const activityPeek = {
  activityId: 'activity-1',
  sessionId: 'session-1',
  start: sessionEdit.start,
  end: sessionEdit.end,
  onOpenFocus: jest.fn(),
  onOpenFullActivity: jest.fn(),
  onMoveCommitment: jest.fn(),
  onUnscheduleCommitment: jest.fn(),
  onRequestClose: jest.fn(),
};

describe('PlanEventPeekDrawerHost slot capture', () => {
  beforeEach(() => {
    mockBottomDrawerProps.length = 0;
    mockScrollViewProps.length = 0;
    mockActivityPeekProps.length = 0;
    mockPlanRecsProps.length = 0;
  });

  it('expands recommendations to the full-height snap when the inline time picker opens', () => {
    renderWithProviders(
      <PlanEventPeekDrawerHost
        visible
        mode="recs"
        onClose={jest.fn()}
        recommendations={{
          recommendationCount: 1,
          targetDayLabel: 'Mon, Aug 17',
          recommendations: [
            {
              activityId: 'activity-1',
              title: 'Refine Screen Time review timing',
              proposal: {
                startDate: '2026-08-17T15:00:00.000Z',
                endDate: '2026-08-17T15:30:00.000Z',
              },
              candidateStartDates: ['2026-08-17T15:00:00.000Z', '2026-08-18T00:00:00.000Z'],
            },
          ],
          emptyState: null,
          showAlreadyPlanned: false,
          entryPoint: 'manual',
          calendarStatus: 'connected',
          onOpenCalendarSettings: jest.fn(),
          onReviewPlan: jest.fn(),
          onRerun: jest.fn(),
          onCommit: jest.fn(),
          onMove: jest.fn(),
          onSkip: jest.fn(),
        }}
      />,
    );

    expect(mockBottomDrawerProps.at(-1)?.snapPoints).toEqual(['85%', '100%']);
    expect(mockBottomDrawerProps.at(-1)?.snapIndex).toBe(0);

    act(() => {
      const onMovePickerExpandedChange = mockPlanRecsProps.at(-1)?.onMovePickerExpandedChange as
        | ((expanded: boolean) => void)
        | undefined;
      onMovePickerExpandedChange?.(true);
    });

    expect(mockBottomDrawerProps.at(-1)?.snapIndex).toBe(1);
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
    expect(mockBottomDrawerProps.at(-1)?.snapPoints).toEqual(['18%', '56%', '82%']);
    expect(mockBottomDrawerProps.at(-1)?.initialSnapIndex).toBe(1);
    expect(mockBottomDrawerProps.at(-1)?.snapIndex).toBe(1);
    expect(mockBottomDrawerProps.at(-1)?.sheetStyle).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ borderTopLeftRadius: expect.any(Number) }),
      ]),
    );
    expect(mockScrollViewProps).toHaveLength(0);
    expect(queryByText('Drag the block or its handles to adjust the time.')).toBeNull();
  });

  it('collapses the slot tray while the user adjusts the calendar block', () => {
    renderWithProviders(
      <PlanEventPeekDrawerHost
        visible
        mode="slotCapture"
        onClose={jest.fn()}
        slotCapture={slotCapture}
        slotAdjustmentActive
      />,
    );

    expect(mockBottomDrawerProps.at(-1)?.snapIndex).toBe(0);
  });

  it('hosts an existing-session edit as the compact state of one progressive drawer', () => {
    renderWithProviders(
      <PlanEventPeekDrawerHost
        visible
        mode="sessionEdit"
        onClose={jest.fn()}
        sessionEdit={sessionEdit}
        activityPeek={activityPeek}
      />,
    );

    expect(mockBottomDrawerProps.at(-1)?.presentation).toBe('inline');
    expect(mockBottomDrawerProps.at(-1)?.hideBackdrop).toBe(true);
    expect(mockBottomDrawerProps.at(-1)?.contentExtendsIntoBottomSafeArea).toBe(true);
    expect(mockBottomDrawerProps.at(-1)?.snapPoints).toEqual(['14%', '25%', '85%']);
    expect(mockBottomDrawerProps.at(-1)?.initialSnapIndex).toBe(1);
    expect(mockBottomDrawerProps.at(-1)?.snapIndex).toBe(1);
    expect(mockActivityPeekProps.at(-1)?.embedded).toBe(true);
    expect(mockActivityPeekProps.at(-1)?.managementHidden).toBe(true);
  });

  it('reveals a backdrop when the unified session drawer expands to details', () => {
    renderWithProviders(
      <PlanEventPeekDrawerHost
        visible
        mode="sessionEdit"
        onClose={jest.fn()}
        sessionEdit={sessionEdit}
        activityPeek={activityPeek}
      />,
    );

    act(() => {
      const onSnapIndexChange = mockBottomDrawerProps.at(-1)?.onSnapIndexChange as
        | ((index: number, change: { previousIndex: number; direction: 'up' | 'down' | 'none' }) => void)
        | undefined;
      onSnapIndexChange?.(2, { previousIndex: 1, direction: 'up' });
    });

    expect(mockBottomDrawerProps.at(-1)?.snapIndex).toBe(2);
    expect(mockBottomDrawerProps.at(-1)?.hideBackdrop).toBe(false);
    expect(mockBottomDrawerProps.at(-1)?.dismissOnBackdropPress).toBe(true);
    expect(mockActivityPeekProps.at(-1)?.embedded).toBe(true);
    expect(mockActivityPeekProps.at(-1)?.managementHidden).toBe(false);
  });

  it('collapses the session editor while the user moves or resizes the block', () => {
    renderWithProviders(
      <PlanEventPeekDrawerHost
        visible
        mode="sessionEdit"
        onClose={jest.fn()}
        sessionEdit={sessionEdit}
        activityPeek={activityPeek}
        slotAdjustmentActive
      />,
    );

    expect(mockBottomDrawerProps.at(-1)?.snapIndex).toBe(0);
  });
});
