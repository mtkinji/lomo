import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PlanCalendarLensPage } from './PlanCalendarLensPage';

const baseProps = {
  targetDayLabel: 'Wednesday, July 8',
  targetDate: new Date('2026-07-08T12:00:00.000-06:00'),
  externalEvents: [],
  calendarColorByRefKey: {},
  proposedBlocks: [],
  kwiltBlocks: [],
  conflictActivityIds: [],
  calendarStatus: 'connected' as const,
  onOpenCalendarSettings: jest.fn(),
};

describe('PlanCalendarLensPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a direct tap callback instead of requiring a long press', () => {
    const onPressEmptyTime = jest.fn();
    const { getByTestId } = renderWithProviders(
      <PlanCalendarLensPage
        {...baseProps}
        onPressEmptyTime={onPressEmptyTime}
        onSlotDraftChange={jest.fn()}
        onSlotDraftComplete={jest.fn()}
      />,
    );

    const emptySlotColumn = getByTestId('plan-empty-slot-column');

    expect(emptySlotColumn.props.onLongPress).toBeUndefined();
    expect(emptySlotColumn.props.delayLongPress).toBeUndefined();

    fireEvent.press(emptySlotColumn, { nativeEvent: { locationY: 640 } });

    expect(onPressEmptyTime).toHaveBeenCalledTimes(1);
    expect(onPressEmptyTime.mock.calls[0][0].date.getHours()).toBe(10);
  });

  it('shows move and resize affordances on the selected time block', () => {
    const onSlotDraftChange = jest.fn();
    const slotStart = new Date(2026, 6, 8, 10);
    const slotEnd = new Date(2026, 6, 8, 11);
    const { getByLabelText } = renderWithProviders(
      <PlanCalendarLensPage
        {...baseProps}
        slotDraft={{
          start: slotStart,
          end: slotEnd,
        }}
        onPressEmptyTime={jest.fn()}
        onSlotDraftChange={onSlotDraftChange}
        onSlotDraftComplete={jest.fn()}
      />,
    );

    expect(getByLabelText('Move selected time, 10:00 AM - 11:00 AM')).toBeTruthy();
    expect(getByLabelText('Change start time')).toBeTruthy();
    const endHandle = getByLabelText('Change end time');
    expect(endHandle).toBeTruthy();

    fireEvent(endHandle, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });

    expect(onSlotDraftChange).toHaveBeenCalledWith({
      start: slotStart,
      end: new Date(2026, 6, 8, 11, 15),
    });
  });

  it('focuses a newly staged slot even without a bottom overlay', () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn());
    const { getByTestId } = renderWithProviders(
      <PlanCalendarLensPage
        {...baseProps}
        slotDraft={{
          start: new Date(2026, 6, 8, 17),
          end: new Date(2026, 6, 8, 17, 30),
        }}
        slotFocusRequestId={1}
        bottomOverlayInset={0}
        onSlotDraftChange={jest.fn()}
        onSlotDraftComplete={jest.fn()}
      />,
    );

    fireEvent(getByTestId('plan-calendar-timeline'), 'layout', {
      nativeEvent: { layout: { height: 320 } },
    });

    expect(scrollTo).toHaveBeenCalledWith({ y: expect.any(Number), animated: true });
    scrollTo.mockRestore();
  });

  it('replaces a selected persisted session with the titled editable overlay', () => {
    const slotStart = new Date(2026, 6, 8, 13);
    const slotEnd = new Date(2026, 6, 8, 17);
    const scheduledBlock = {
      activity: {
        id: 'activity-1',
        goalId: null,
        title: 'Work on Adobe presentation',
        type: 'task' as const,
        tags: [],
        status: 'planned' as const,
        forceActual: {},
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:00:00.000Z',
      },
      sessionId: 'session-1',
      start: slotStart,
      end: slotEnd,
    };

    const { getByLabelText, queryByText } = renderWithProviders(
      <PlanCalendarLensPage
        {...baseProps}
        kwiltBlocks={[scheduledBlock]}
        editingKwiltBlock={{ activityId: 'activity-1', sessionId: 'session-1' }}
        slotDraft={{ start: slotStart, end: slotEnd }}
        slotDraftTitle="Work on Adobe presentation"
        onSlotDraftChange={jest.fn()}
        onSlotDraftComplete={jest.fn()}
      />,
    );

    expect(queryByText(/Hold to move/)).toBeNull();
    expect(getByLabelText('Move Work on Adobe presentation, 1:00 PM - 5:00 PM')).toBeTruthy();
    expect(getByLabelText('Change start time')).toBeTruthy();
    expect(getByLabelText('Change end time')).toBeTruthy();
  });

  it('selects a persisted session with a single tap', () => {
    const onPressKwiltBlock = jest.fn();
    const scheduledBlock = {
      activity: {
        id: 'activity-1',
        goalId: null,
        title: 'Work on Adobe presentation',
        type: 'task' as const,
        tags: [],
        status: 'planned' as const,
        forceActual: {},
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:00:00.000Z',
      },
      sessionId: 'session-1',
      start: new Date(2026, 6, 8, 13),
      end: new Date(2026, 6, 8, 17),
    };

    const { getByLabelText } = renderWithProviders(
      <PlanCalendarLensPage
        {...baseProps}
        kwiltBlocks={[scheduledBlock]}
        onPressKwiltBlock={onPressKwiltBlock}
      />,
    );

    fireEvent.press(getByLabelText('Adjust Work on Adobe presentation'));

    expect(onPressKwiltBlock).toHaveBeenCalledWith('activity-1', 'session-1');
  });
});
