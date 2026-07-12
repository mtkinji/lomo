import * as React from 'react';
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

  it('leaves touch long-press handling exclusively to the drag gesture', () => {
    const { getByTestId } = renderWithProviders(
      <PlanCalendarLensPage
        {...baseProps}
        onSlotDraftChange={jest.fn()}
        onSlotDraftComplete={jest.fn()}
      />,
    );

    const emptySlotColumn = getByTestId('plan-empty-slot-column');

    expect(emptySlotColumn.props.onLongPress).toBeUndefined();
    expect(emptySlotColumn.props.delayLongPress).toBeUndefined();
  });
});
