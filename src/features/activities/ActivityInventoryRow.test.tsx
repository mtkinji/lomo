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
  onPressActivity: jest.fn(),
  onDeleteActivity: jest.fn(),
};

describe('ActivityInventoryRow', () => {
  beforeEach(() => {
    mockActivityListItemRender.mockClear();
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
});
