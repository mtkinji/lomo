import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PlanCalendarLensPage } from './PlanCalendarLensPage';
import type { PlanSlotDraft } from './planSlotDraft';

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

  it('opens a 15-minute draft slot from a plain empty-time long press', () => {
    const onSlotDraftChange = jest.fn();
    const onSlotDraftComplete = jest.fn();
    const { getByTestId } = renderWithProviders(
      <PlanCalendarLensPage
        {...baseProps}
        onSlotDraftChange={onSlotDraftChange}
        onSlotDraftComplete={onSlotDraftComplete}
      />,
    );

    fireEvent(getByTestId('plan-empty-slot-column'), 'longPress', {
      nativeEvent: { locationY: 6 * 64 },
    });

    expect(onSlotDraftChange).toHaveBeenCalledTimes(1);
    expect(onSlotDraftComplete).toHaveBeenCalledTimes(1);
    const slot = onSlotDraftComplete.mock.calls[0]?.[0] as PlanSlotDraft;
    expect(slot.start.getHours()).toBe(6);
    expect(slot.start.getMinutes()).toBe(0);
    expect(slot.end.getHours()).toBe(6);
    expect(slot.end.getMinutes()).toBe(15);
  });
});
