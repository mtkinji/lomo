import React from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { Activity } from '../../domain/types';
import { ActivityInventoryRow } from './ActivityInventoryRow';

const mockActivityListItemRender = jest.fn((_props: unknown) => null);

jest.mock('../../ui/ActivityListItem', () => ({
  ActivityListItem: (props: unknown) => mockActivityListItemRender(props),
}));

const activity = {
  id: 'activity-1',
  title: 'Call Jenny',
  status: 'planned',
  createdAt: '2026-07-21T12:00:00.000Z',
  updatedAt: '2026-07-21T12:00:00.000Z',
} as Activity;

const handlers = {
  onToggleComplete: jest.fn(),
  onTogglePriority: jest.fn(),
  onStartFocus: jest.fn(),
  onSchedule: jest.fn(),
  onEditDueDate: jest.fn(),
  onEditDuration: jest.fn(),
  onPressActivity: jest.fn(),
  onDeleteActivity: jest.fn(),
};

describe('ActivityInventoryRow', () => {
  beforeEach(() => {
    mockActivityListItemRender.mockClear();
    handlers.onEditDueDate.mockClear();
    handlers.onEditDuration.mockClear();
  });

  it('does not rebuild an unchanged row when its inventory parent rerenders', () => {
    const props = {
      activity,
      meta: 'Today',
      estimateMeta: '~30 min',
      metaTone: 'future' as const,
      priorityIndicator: undefined,
      metaLoading: false,
      isDueToday: false,
      rowGap: 2,
      rowOuterGap: 0,
      isDragging: false,
      isGhost: false,
      ...handlers,
    };
    const { rerender } = renderWithProviders(<ActivityInventoryRow {...props} />);

    rerender(<ActivityInventoryRow {...props} />);

    expect(mockActivityListItemRender).toHaveBeenCalledTimes(1);
  });

  it('makes the timing pill editable only when it represents a due date', () => {
    renderWithProviders(
      <ActivityInventoryRow
        activity={{ ...activity, scheduledDate: '2026-08-02' }}
        meta="Aug 2"
        metaTone="future"
        estimateMeta={undefined}
        priorityIndicator={undefined}
        metaLoading={false}
        isDueToday={false}
        rowGap={2}
        rowOuterGap={0}
        isDragging={false}
        isGhost={false}
        {...handlers}
      />,
    );

    const renderedProps = mockActivityListItemRender.mock.calls[0]?.[0] as {
      onMetaPress?: () => void;
      metaAccessibilityLabel?: string;
    };
    expect(renderedProps.metaAccessibilityLabel).toBe(
      'Edit due date for Call Jenny, currently Aug 2',
    );

    renderedProps.onMetaPress?.();
    expect(handlers.onEditDueDate).toHaveBeenCalledWith('activity-1');
  });

  it('leaves reminder-only timing metadata non-interactive', () => {
    renderWithProviders(
      <ActivityInventoryRow
        activity={{ ...activity, scheduledDate: null, reminderAt: '2026-08-02T09:00:00.000Z' }}
        meta="Aug 2"
        metaTone="future"
        estimateMeta={undefined}
        priorityIndicator={undefined}
        metaLoading={false}
        isDueToday={false}
        rowGap={2}
        rowOuterGap={0}
        isDragging={false}
        isGhost={false}
        {...handlers}
      />,
    );

    const renderedProps = mockActivityListItemRender.mock.calls[0]?.[0] as {
      onMetaPress?: () => void;
      metaAccessibilityLabel?: string;
    };
    expect(renderedProps.onMetaPress).toBeUndefined();
    expect(renderedProps.metaAccessibilityLabel).toBeUndefined();
  });

  it('makes a visible duration estimate directly editable', () => {
    renderWithProviders(
      <ActivityInventoryRow
        activity={{ ...activity, estimateMinutes: 30 }}
        meta={undefined}
        metaTone={undefined}
        estimateMeta="~30 min"
        priorityIndicator={undefined}
        metaLoading={false}
        isDueToday={false}
        rowGap={2}
        rowOuterGap={0}
        isDragging={false}
        isGhost={false}
        {...handlers}
      />,
    );

    const renderedProps = mockActivityListItemRender.mock.calls[0]?.[0] as {
      onEstimatePress?: () => void;
      estimateAccessibilityLabel?: string;
    };
    expect(renderedProps.estimateAccessibilityLabel).toBe(
      'Edit duration for Call Jenny, currently ~30 min',
    );

    renderedProps.onEstimatePress?.();
    expect(handlers.onEditDuration).toHaveBeenCalledWith('activity-1');
  });
});
