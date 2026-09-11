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
});
