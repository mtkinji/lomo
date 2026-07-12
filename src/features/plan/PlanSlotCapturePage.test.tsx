import * as React from 'react';
import type { TextInput } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PlanSlotCapturePage } from './PlanSlotCapturePage';

jest.mock('../activities/QuickAddDock', () => ({
  QuickAddDock: ({
    value,
    setIsFocused,
  }: {
    value: string;
    setIsFocused: (next: boolean) => void;
  }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a to-do"
        onPress={() => setIsFocused(true)}
      >
        <Text>{value || 'Add a to-do'}</Text>
      </Pressable>
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
  onSaveNewToTodos: jest.fn(),
};

describe('PlanSlotCapturePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('combines quick add and existing to-dos without a mode switcher', () => {
    const { getByText, getAllByText, getByLabelText } = renderWithProviders(
      <PlanSlotCapturePage {...defaultProps} />,
    );

    expect(getByText('11:15 AM - 12:00 PM')).toBeTruthy();
    expect(getAllByText('45 min')).toHaveLength(2);
    expect(getByLabelText('Add a to-do')).toBeTruthy();
    expect(getByText('Or choose an existing to-do')).toBeTruthy();
    expect(getByText('Buy lumber')).toBeTruthy();
    expect(getByText('Send cabinet dimensions')).toBeTruthy();
    expect(() => getByText('New to-do')).toThrow();
    expect(() => getByText('Existing')).toThrow();
  });

  it('selects an existing to-do and commits it', () => {
    const onSelectActivity = jest.fn();
    const onCommitExisting = jest.fn();
    const { getByText, rerender } = renderWithProviders(
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

    fireEvent.press(getByText('Commit to calendar'));

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

    fireEvent.press(getByText('Commit to calendar'));

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

    fireEvent.press(getByLabelText('Add a to-do'));

    expect(setIsFocused).toHaveBeenCalledWith(true);
  });
});
