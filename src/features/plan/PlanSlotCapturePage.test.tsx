import * as React from 'react';
import type { TextInput } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { Activity, Goal } from '../../domain/types';
import { PlanSlotCapturePage } from './PlanSlotCapturePage';

const mockQuickAddProps: Array<Record<string, unknown>> = [];

jest.mock('../activities/QuickAddDock', () => ({
  QuickAddDock: ({
    value,
    setIsFocused,
    placeholder,
    ...props
  }: {
    value: string;
    setIsFocused: (next: boolean) => void;
    placeholder?: string;
  } & Record<string, unknown>) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    mockQuickAddProps.push({ value, setIsFocused, placeholder, ...props });
    if (props.showCollapsedTrigger === false) return null;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={placeholder || 'Add a to-do'}
        onPress={() => setIsFocused(true)}
      >
        <Text>{value || placeholder || 'Add a to-do'}</Text>
      </Pressable>
    );
  },
}));

jest.mock('../../ui/FilterDrawer', () => ({
  FilterDrawer: ({ visible, onApply }: { visible: boolean; onApply: (filters: unknown[], logic: 'or') => void }) => {
    if (!visible) return null;
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        accessibilityLabel="Apply test filter"
        onPress={() => onApply([
          {
            logic: 'and',
            conditions: [{ id: 'short', field: 'estimateMinutes', operator: 'lte', value: 30 }],
          },
        ], 'or')}
      >
        <Text>Apply test filter</Text>
      </Pressable>
    );
  },
}));

jest.mock('../activities/GroupingDrawer', () => ({
  GroupingDrawer: ({ visible, onApply }: { visible: boolean; onApply: (grouping: unknown) => void }) => {
    if (!visible) return null;
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable accessibilityLabel="Apply goal grouping" onPress={() => onApply({ field: 'goal' })}>
        <Text>Apply goal grouping</Text>
      </Pressable>
    );
  },
}));

jest.mock('../../ui/SortDrawer', () => ({
  SortDrawer: ({ visible, onApply }: { visible: boolean; onApply: (sorts: unknown[]) => void }) => {
    if (!visible) return null;
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        accessibilityLabel="Apply title sort"
        onPress={() => onApply([{ field: 'title', direction: 'asc' }])}
      >
        <Text>Apply title sort</Text>
      </Pressable>
    );
  },
}));

jest.mock('../../ui/BottomDrawer', () => ({
  BottomDrawerFlatList: ({
    data,
    renderItem,
    ListEmptyComponent,
    ListHeaderComponent,
  }: {
    data: unknown[];
    renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
    ListEmptyComponent?: React.ComponentType;
    ListHeaderComponent?: React.ReactNode;
  }) => {
    const React = require('react');
    const { View } = require('react-native');
    if (data.length === 0 && ListEmptyComponent) return <ListEmptyComponent />;
    return (
      <View>
        {ListHeaderComponent}
        {data.map((item, index) => <View key={index}>{renderItem({ item, index })}</View>)}
      </View>
    );
  },
}));

const baseQuickAdd = {
  value: '',
  onChangeText: jest.fn(),
  inputRef: React.createRef<TextInput | null>(),
  isFocused: false,
  setIsFocused: jest.fn(),
  onSubmit: jest.fn(),
  onCollapse: jest.fn(),
  selectedAiActions: ['steps' as const],
  onSelectedAiActionsChange: jest.fn(),
};

function activity(id: string, title: string, estimateMinutes: number, goalId: string | null = null): Activity {
  return {
    id,
    title,
    estimateMinutes,
    goalId,
    type: 'task',
    tags: [],
    status: 'planned',
    orderIndex: Number(id.replace(/\D/g, '')) || 0,
    forceActual: {} as Activity['forceActual'],
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };
}

function goal(id: string, title: string, priority: 1 | 2 | 3): Goal {
  return {
    id,
    arcId: null,
    title,
    status: 'planned',
    priority,
    forceIntent: {},
    metrics: [],
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };
}

const defaultProps = {
  start: new Date(2026, 6, 8, 11, 15),
  end: new Date(2026, 6, 8, 12, 0),
  quickAdd: baseQuickAdd,
  activities: [
    activity('activity-1', 'Buy lumber', 45, 'goal-home'),
    activity('activity-2', 'Send cabinet dimensions', 30, 'goal-work'),
  ],
  goals: [
    goal('goal-home', 'Home', 1),
    goal('goal-work', 'Work', 2),
  ],
  scheduledProposalIds: [],
  selectedActivityId: null,
  createdActivityId: null,
  committingActivityId: null,
  onSelectActivity: jest.fn(),
  onCommitNew: jest.fn(),
  onCommitExisting: jest.fn(),
};

describe('PlanSlotCapturePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuickAddProps.length = 0;
  });

  it('uses a scrollable full inventory with organization controls at the top and Quick Add docked below', () => {
    const { getByText, getAllByText, getByLabelText } = renderWithProviders(
      <PlanSlotCapturePage {...defaultProps} />,
    );

    expect(getByText('11:15 AM - 12:00 PM')).toBeTruthy();
    expect(getAllByText('45 min')).toHaveLength(1);
    expect(getByText('~45 min')).toBeTruthy();
    expect(getByLabelText('Add a new to-do')).toBeTruthy();
    expect(getByLabelText('Search to-dos')).toBeTruthy();
    expect(getByLabelText('Filter to-dos')).toBeTruthy();
    expect(getByLabelText('Group to-dos')).toBeTruthy();
    expect(getByLabelText('Sort to-dos')).toBeTruthy();
    expect(() => getByText('Recommended')).toThrow();
    expect(getByText('#1')).toBeTruthy();
    expect(getByText('#2')).toBeTruthy();
    expect(getByText('Buy lumber')).toBeTruthy();
    expect(getByText('Send cabinet dimensions')).toBeTruthy();
    expect(mockQuickAddProps.at(-1)?.placement).toBe('bottomDock');
    expect(mockQuickAddProps.at(-1)?.collapsedBottomOffsetPx).toEqual(expect.any(Number));
    expect(mockQuickAddProps.at(-1)?.floatingHorizontalInsetPx).toBe(0);
    expect(mockQuickAddProps.at(-1)?.onReservedHeightChange).toEqual(expect.any(Function));
    expect(() => getByText('Choose existing to-do')).toThrow();
    expect(() => getByText('New to-do')).toThrow();
    expect(() => getByText('Existing')).toThrow();
  });

  it('shows the top ten recommendations by default', () => {
    const activities = Array.from({ length: 18 }, (_, index) =>
      ({
        ...activity(`activity-${index + 1}`, `Inventory item ${index + 1}`, 30),
        priority: 2 as const,
      }),
    );
    const { getByText, queryByText } = renderWithProviders(
      <PlanSlotCapturePage {...defaultProps} activities={activities} />,
    );

    expect(getByText('Inventory item 1')).toBeTruthy();
    expect(getByText('Inventory item 10')).toBeTruthy();
    expect(queryByText('Inventory item 11')).toBeNull();
  });

  it('searches and applies the existing filter and grouping controls locally', () => {
    const { getByLabelText, getByText, queryByText } = renderWithProviders(
      <PlanSlotCapturePage {...defaultProps} />,
    );

    fireEvent.changeText(getByLabelText('Search to-dos'), 'cabinet');
    expect(getByText('All to-dos')).toBeTruthy();
    expect(getByText('Send cabinet dimensions')).toBeTruthy();
    expect(queryByText('Buy lumber')).toBeNull();

    fireEvent.press(getByLabelText('Filter to-dos'));
    fireEvent.press(getByLabelText('Apply test filter'));
    expect(getByLabelText('Filter to-dos (1)')).toBeTruthy();

    fireEvent.press(getByLabelText('Group to-dos'));
    fireEvent.press(getByLabelText('Apply goal grouping'));
    expect(getByText('Work')).toBeTruthy();
  });

  it('selects an existing to-do and commits it', () => {
    const onSelectActivity = jest.fn();
    const onCommitExisting = jest.fn();
    const { getByText, queryByText, rerender } = renderWithProviders(
      <PlanSlotCapturePage
        {...defaultProps}
        onSelectActivity={onSelectActivity}
        onCommitExisting={onCommitExisting}
      />,
    );

    fireEvent.press(getByText('Buy lumber'));

    expect(onSelectActivity).toHaveBeenCalledWith('activity-1');

    rerender(
      <PlanSlotCapturePage
        {...defaultProps}
        selectedActivityId="activity-1"
        onSelectActivity={onSelectActivity}
        onCommitExisting={onCommitExisting}
      />,
    );

    expect(getByText('Selected: Buy lumber')).toBeTruthy();
    expect(queryByText('Save without time')).toBeNull();

    fireEvent.press(getByText('Add to calendar'));

    expect(onCommitExisting).toHaveBeenCalledTimes(1);
  });

  it('commits a newly created to-do through the same primary action', () => {
    const onCommitNew = jest.fn();
    const { getByText } = renderWithProviders(
      <PlanSlotCapturePage
        {...defaultProps}
        createdActivityId="activity-new"
        selectedActivityId="activity-new"
        onCommitNew={onCommitNew}
      />,
    );

    fireEvent.press(getByText('Add to calendar'));

    expect(onCommitNew).toHaveBeenCalledTimes(1);
  });

  it('passes the slot-specific quick add model into the composer', () => {
    const setIsFocused = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <PlanSlotCapturePage
        {...defaultProps}
        quickAdd={{
          ...baseQuickAdd,
          value: 'Frame cabinet doors',
          setIsFocused,
        }}
      />,
    );

    fireEvent.press(getByLabelText('Add a new to-do'));

    expect(setIsFocused).toHaveBeenCalledWith(true);
  });
});
