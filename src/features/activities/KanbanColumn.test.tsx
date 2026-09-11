import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { renderWithProviders } from '../../test/renderWithProviders';
import { KanbanColumn } from './KanbanColumn';

const activity: Activity = {
  id: 'activity-1',
  goalId: null,
  title: 'Call Jenny',
  status: 'planned',
  type: 'task',
  tags: [],
  steps: [],
  forceActual: {},
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T10:00:00.000Z',
};

describe('KanbanColumn card interactions', () => {
  it('keeps card opening separate from the dedicated move control', () => {
    const onPressActivity = jest.fn();
    const onRequestMove = jest.fn();

    renderWithProviders(
      <KanbanColumn
        title="To Do"
        activities={[activity]}
        goalTitleById={{}}
        onToggleComplete={jest.fn()}
        onTogglePriority={jest.fn()}
        onPressActivity={onPressActivity}
        onRequestMove={onRequestMove}
      />,
    );

    fireEvent.press(screen.getByLabelText('Move Call Jenny'));
    expect(onRequestMove).toHaveBeenCalledWith(activity.id);
    expect(onPressActivity).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Call Jenny'));
    expect(onPressActivity).toHaveBeenCalledWith(activity.id);
    expect(onRequestMove).toHaveBeenCalledTimes(1);
  });
});
