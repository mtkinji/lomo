import * as React from 'react';
import type { TextInput } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
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

jest.mock('../../ui/BottomDrawer', () => ({
  BottomDrawerFlatList: ({
    data,
    renderItem,
    ListEmptyComponent,
  }: {
    data: unknown[];
    renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
    ListEmptyComponent?: React.ComponentType;
  }) => {
    const React = require('react');
    const { View } = require('react-native');
    if (data.length === 0 && ListEmptyComponent) return <ListEmptyComponent />;
    return <View>{data.map((item, index) => <View key={index}>{renderItem({ item, index })}</View>)}</View>;
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

const defaultProps = {
  start: new Date(2026, 6, 8, 11, 15),
  end: new Date(2026, 6, 8, 12, 0),
  quickAdd: baseQuickAdd,
  existingActivities: [
    { activityId: 'activity-1', title: 'Buy lumber', estimateMinutes: 45 },
    { activityId: 'activity-2', title: 'Send cabinet dimensions', estimateMinutes: 30 },
  ],
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

  it('uses a scrollable to-do inventory with Quick Add anchored at the bottom', () => {
    const { getByText, getAllByText, getByLabelText } = renderWithProviders(
      <PlanSlotCapturePage {...defaultProps} />,
    );

    expect(getByText('11:15 AM - 12:00 PM')).toBeTruthy();
    expect(getAllByText('45 min')).toHaveLength(2);
    expect(getByLabelText('Add a new to-do')).toBeTruthy();
    expect(getByText('Buy lumber')).toBeTruthy();
    expect(getByText('Send cabinet dimensions')).toBeTruthy();
    expect(mockQuickAddProps.at(-1)?.placement).toBe('bottomDock');
    expect(mockQuickAddProps.at(-1)?.collapsedBottomOffsetPx).toEqual(expect.any(Number));
    expect(mockQuickAddProps.at(-1)?.floatingHorizontalInsetPx).toBe(0);
    expect(() => getByText('Choose existing to-do')).toThrow();
    expect(() => getByText('New to-do')).toThrow();
    expect(() => getByText('Existing')).toThrow();
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
