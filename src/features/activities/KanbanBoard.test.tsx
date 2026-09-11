import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, screen } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { renderWithProviders } from '../../test/renderWithProviders';
import { KanbanBoard } from './KanbanBoard';

const boardSource = readFileSync(
  path.join(__dirname, 'KanbanBoard.tsx'),
  'utf8',
);

jest.mock('../../ui/hooks/useAccessibilityPreferences', () => ({
  getAccessibleAnimationDuration: (durationMs: number) => durationMs,
  useAccessibilityPreferences: () => ({
    reduceMotionEnabled: false,
    screenReaderEnabled: false,
  }),
}));

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

describe('KanbanBoard move picker', () => {
  it('leaves the board scroll view direct so a delayed card pan can yield normal swipes', () => {
    expect(boardSource).not.toContain('horizontalScrollGesture');
    expect(boardSource).not.toContain('scrollableGesture=');
  });

  it('offers every destination without opening the card', () => {
    const onMoveActivity = jest.fn();
    const onPressActivity = jest.fn();

    renderWithProviders(
      <KanbanBoard
        activities={[activity]}
        goals={[]}
        groupBy="status"
        onToggleComplete={jest.fn()}
        onTogglePriority={jest.fn()}
        onPressActivity={onPressActivity}
        onMoveActivity={onMoveActivity}
      />,
    );

    expect(
      screen.getByLabelText('Show To Do column').props.accessibilityState,
    ).toEqual({
      selected: true,
    });
    expect(screen.getByLabelText('Show In Progress column')).toBeTruthy();

    expect(screen.queryByLabelText('Move Call Jenny')).toBeNull();
    fireEvent(screen.getByLabelText('Call Jenny'), 'accessibilityAction', {
      nativeEvent: { actionName: 'move' },
    });
    expect(screen.getByLabelText('To Do, current column')).toBeDisabled();
    expect(screen.getByLabelText('Move to In Progress')).toBeTruthy();
    expect(screen.getByLabelText('Move to Done')).toBeTruthy();
    expect(screen.getByLabelText('Move to Skipped')).toBeTruthy();
    expect(screen.getByLabelText('Move to Cancelled')).toBeTruthy();
    expect(onPressActivity).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Move to In Progress'));
    expect(onMoveActivity).toHaveBeenCalledWith(activity.id, {
      groupBy: 'status',
      toColumnId: 'in_progress',
      toColumnTitle: 'In Progress',
    });
  });
});
