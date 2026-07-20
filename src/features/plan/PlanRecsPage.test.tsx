import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PlanRecsPage } from './PlanRecsPage';

jest.mock('../../ui/BottomDrawer', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  return {
    BottomDrawerScrollView: ({ children, ...props }: { children?: React.ReactNode }) => (
      <ScrollView {...props}>{children}</ScrollView>
    ),
  };
});

jest.mock('../activities/QuickAddDock', () => ({
  QuickAddDock: ({ setIsFocused }: { setIsFocused: (next: boolean) => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a to-do"
        onPress={() => setIsFocused(true)}
      >
        <Text>Add a to-do</Text>
      </Pressable>
    );
  },
}));

const defaultProps = {
  targetDayLabel: 'Wed, Jul 8',
  recommendations: [],
  emptyState: null,
  showAlreadyPlanned: false,
  entryPoint: 'manual' as const,
  calendarStatus: 'connected' as const,
  onOpenCalendarSettings: jest.fn(),
  onReviewPlan: jest.fn(),
  onRerun: jest.fn(),
  onCommit: jest.fn(),
  onMove: jest.fn(),
  onSkip: jest.fn(),
};

describe('PlanRecsPage', () => {
  it('renders a compact completed state after all recommendations are placed', () => {
    const onReviewPlan = jest.fn();
    const onRerun = jest.fn();
    const { getByText, queryByText } = renderWithProviders(
      <PlanRecsPage
        {...defaultProps}
        showAlreadyPlanned
        targetDayLabel="Thu, Jul 9"
        onReviewPlan={onReviewPlan}
        onRerun={onRerun}
      />,
    );

    expect(getByText('Your plan is set')).toBeTruthy();
    expect(getByText(/The recommendations for Thu, Jul 9 are on your calendar/)).toBeTruthy();
    expect(queryByText('No recommendations remain for this day. Review or adjust your blocks on the calendar.')).toBeNull();

    fireEvent.press(getByText('Review plan'));
    fireEvent.press(getByText('Re-run recommendations'));

    expect(onReviewPlan).toHaveBeenCalledTimes(1);
    expect(onRerun).toHaveBeenCalledTimes(1);
  });

  it('renders the inline quick-add offer in the recommendations sheet', () => {
    const setIsFocused = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <PlanRecsPage
        {...defaultProps}
        quickAdd={{
          value: '',
          onChangeText: jest.fn(),
          inputRef: React.createRef(),
          isFocused: false,
          setIsFocused,
          onSubmit: jest.fn(),
          onCollapse: jest.fn(),
          selectedAiActions: ['steps'],
          onSelectedAiActionsChange: jest.fn(),
        }}
      />,
    );

    fireEvent.press(getByLabelText('Add a to-do'));

    expect(setIsFocused).toHaveBeenCalledWith(true);
  });

  it('offers concrete next actions when a newly created to-do has no safe slot', () => {
    const onPickTimeForCreated = jest.fn();
    const onSaveCreatedWithoutScheduling = jest.fn();
    const onOpenAvailabilitySettings = jest.fn();
    const { getByText } = renderWithProviders(
      <PlanRecsPage
        {...defaultProps}
        unscheduledCreated={[
          {
            activityId: 'activity-1',
            title: 'Buy lumber for the media console',
            estimateMinutes: 45,
          },
        ]}
        onPickTimeForCreated={onPickTimeForCreated}
        onSaveCreatedWithoutScheduling={onSaveCreatedWithoutScheduling}
        onOpenAvailabilitySettings={onOpenAvailabilitySettings}
      />,
    );

    expect(getByText('Buy lumber for the media console')).toBeTruthy();
    expect(getByText('No clear opening in your availability for Wed, Jul 8.')).toBeTruthy();

    fireEvent.press(getByText('Pick a time'));
    fireEvent.press(getByText('Adjust availability'));
    fireEvent.press(getByText('Save without scheduling'));

    expect(onPickTimeForCreated).toHaveBeenCalledWith('activity-1');
    expect(onOpenAvailabilitySettings).toHaveBeenCalledTimes(1);
    expect(onSaveCreatedWithoutScheduling).toHaveBeenCalledWith('activity-1');
  });

  it('keeps scheduled and unscheduled priorities in one user-decided shortlist', () => {
    const onPickTimeForUnplaced = jest.fn();
    const onDismissForToday = jest.fn();
    const onCommit = jest.fn();
    const { getAllByText, getByText, queryByText } = renderWithProviders(
      <PlanRecsPage
        {...defaultProps}
        recommendations={[
          {
            activityId: 'scheduled-task',
            title: 'Call the contractor',
            proposal: {
              startDate: '2026-07-08T16:00:00.000Z',
              endDate: '2026-07-08T16:45:00.000Z',
            },
            priorityPosition: 1,
          },
        ]}
        unplacedPriorities={[
          {
            activityId: 'long-task',
            title: 'Install the media console',
            reason: 'needs_larger_window',
            durationMinutes: 150,
            mode: 'personal',
            priorityPosition: 0,
          },
        ]}
        onPickTimeForUnplaced={onPickTimeForUnplaced}
        onDismissForToday={onDismissForToday}
        onCommit={onCommit}
      />,
    );

    expect(queryByText('Priorities that didn’t fit')).toBeNull();
    expect(getByText('Choose what to make room for on Wed, Jul 8.')).toBeTruthy();
    expect(getByText('No obvious 2 hrs 30 min opening.')).toBeTruthy();
    expect(getByText('Call the contractor')).toBeTruthy();

    fireEvent.press(getByText('Pick a time'));
    fireEvent.press(getAllByText('Not today')[0]);
    fireEvent.press(getByText('Add to plan'));

    expect(onPickTimeForUnplaced).toHaveBeenCalledWith('long-task');
    expect(onDismissForToday).toHaveBeenCalledWith('long-task');
    expect(onCommit).toHaveBeenCalledWith('scheduled-task');
  });
});
