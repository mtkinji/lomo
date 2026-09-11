import React from 'react';
import { render } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { KanbanCard } from './KanbanCard';

const activity: Activity = {
  id: 'activity-1',
  title: 'Review the family calendar',
  status: 'planned',
  type: 'task',
  tags: [],
  forceActual: {},
  priority: 1,
  scheduledDate: '2000-01-01',
  estimateMinutes: 30,
  goalId: null,
  createdAt: '2026-09-10T00:00:00.000Z',
  updatedAt: '2026-09-10T00:00:00.000Z',
};

describe('KanbanCard metadata', () => {
  it('uses the standard activity-list timing and duration language', () => {
    const screen = render(<KanbanCard activity={activity} />);

    expect(screen.getByText('Past due')).toBeTruthy();
    expect(screen.getByText('~30 min')).toBeTruthy();
  });

  it('keeps the completion circle visually unchanged in the drag preview', () => {
    const screen = render(<KanbanCard activity={activity} onToggleComplete={jest.fn()} />);

    expect(screen.getByTestId('kanban-card-leading-control')).toBeTruthy();
    expect(screen.getByTestId('kanban-card-completion-control')).toHaveStyle({
      width: 20,
      height: 20,
      borderRadius: 10,
    });
    expect(screen.queryByTestId('kanban-card-move-feedback')).toBeNull();

    screen.rerender(<KanbanCard activity={activity} showCompletionControl />);
    expect(screen.getByTestId('kanban-card-leading-control')).toBeTruthy();
    expect(screen.getByTestId('kanban-card-completion-control')).toHaveStyle({
      width: 20,
      height: 20,
      borderRadius: 10,
    });
    expect(screen.queryByTestId('kanban-card-move-feedback')).toBeNull();
  });
});
