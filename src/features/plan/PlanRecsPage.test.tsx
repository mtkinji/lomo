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
});
