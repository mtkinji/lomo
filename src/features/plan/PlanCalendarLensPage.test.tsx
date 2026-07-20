import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
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
  onMoveCommitment: jest.fn(),
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
});
