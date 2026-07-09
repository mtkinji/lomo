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
  start: new Date('2026-07-08T11:15:00.000-06:00'),
  end: new Date('2026-07-08T12:00:00.000-06:00'),
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

  it('renders new and existing slot placement modes', () => {
    const { getByText, getByLabelText } = renderWithProviders(
      <PlanSlotCapturePage {...defaultProps} />,
    );

    expect(getByText('11:15 AM - 12:00 PM')).toBeTruthy();
    expect(getByText('45 min')).toBeTruthy();
    expect(getByText('New to-do')).toBeTruthy();
    expect(getByText('Existing')).toBeTruthy();
    expect(getByLabelText('Add a to-do')).toBeTruthy();

    fireEvent.press(getByText('Existing'));

    expect(getByText('Buy lumber')).toBeTruthy();
    expect(getByText('Send cabinet dimensions')).toBeTruthy();
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

    fireEvent.press(getByText('Existing'));
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

    fireEvent.press(getByText('Existing'));
    fireEvent.press(getByText('Commit to calendar'));

    expect(onCommitExisting).toHaveBeenCalledTimes(1);
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
