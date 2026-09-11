import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
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

const secondActivity: Activity = {
  ...activity,
  id: 'activity-2',
  title: 'Write the proposal',
  orderIndex: 2,
};

function ActiveDragColumn({ hidden = false }: { hidden?: boolean }) {
  return (
    <KanbanColumn
      title="To Do"
      activities={[activity]}
      goalTitleById={{}}
      onToggleComplete={jest.fn()}
      onTogglePriority={jest.fn()}
      onPressActivity={jest.fn()}
      hiddenActivityId={hidden ? activity.id : null}
    />
  );
}

describe('KanbanColumn card interactions', () => {
  it('renders an explicit insertion marker at the exact drop position', () => {
    renderWithProviders(
      <KanbanColumn
        columnId="planned"
        title="To Do"
        activities={[activity, secondActivity]}
        goalTitleById={{}}
        onToggleComplete={jest.fn()}
        onTogglePriority={jest.fn()}
        onPressActivity={jest.fn()}
        dropIndicatorBeforeActivityId={secondActivity.id}
        dropIndicatorHeight={80}
      />,
    );

    expect(
      screen.getByTestId(`kanban-drop-indicator-before-${secondActivity.id}`, {
        includeHiddenElements: true,
      }),
    ).toHaveStyle({ height: 80 });
    expect(
      screen.getByText('Drop here', { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it('does not lift or strand a card when the delayed drag fails before activation', () => {
    const onBeginDrag = jest.fn();
    const onEndDrag = jest.fn();

    renderWithProviders(
      <KanbanColumn
        title="To Do"
        activities={[activity]}
        goalTitleById={{}}
        onToggleComplete={jest.fn()}
        onTogglePriority={jest.fn()}
        onPressActivity={jest.fn()}
        onBeginDrag={onBeginDrag}
        onEndDrag={onEndDrag}
      />,
    );

    const dragGesture = getByGestureTestId(
      `kanban-card-drag-${activity.id}`,
    ) as unknown as {
      handlers: {
        onBegin?: unknown;
        onStart?: unknown;
        onFinalize?: () => void;
      };
    };
    expect(dragGesture.handlers.onBegin).toBeUndefined();
    expect(dragGesture.handlers.onStart).toEqual(expect.any(Function));

    // RNGH's fireGestureHandler helper synthesizes ACTIVE even when given
    // BEGAN -> FAILED, so exercise the pre-activation finalizer directly.
    dragGesture.handlers.onFinalize?.();

    expect(onBeginDrag).not.toHaveBeenCalled();
    expect(onEndDrag).not.toHaveBeenCalled();
  });

  it('uses the delayed pan start as the single drag activation point', () => {
    renderWithProviders(
      <KanbanColumn
        title="To Do"
        activities={[activity]}
        goalTitleById={{}}
        onToggleComplete={jest.fn()}
        onTogglePriority={jest.fn()}
        onPressActivity={jest.fn()}
        onBeginDrag={jest.fn()}
        onEndDrag={jest.fn()}
      />,
    );

    const dragGesture = getByGestureTestId(
      `kanban-card-drag-${activity.id}`,
    ) as unknown as {
      handlers: {
        onStart?: () => void;
        onTouchesMove?: unknown;
      };
    };
    expect(dragGesture.handlers.onStart).toEqual(expect.any(Function));
    expect(dragGesture.handlers.onTouchesMove).toBeUndefined();
  });

  it('clears an activated drag when the native gesture is cancelled', () => {
    const onEndDrag = jest.fn();

    renderWithProviders(
      <KanbanColumn
        title="To Do"
        activities={[activity]}
        goalTitleById={{}}
        onToggleComplete={jest.fn()}
        onTogglePriority={jest.fn()}
        onPressActivity={jest.fn()}
        onBeginDrag={jest.fn()}
        onEndDrag={onEndDrag}
      />,
    );

    const dragGesture = getByGestureTestId(
      `kanban-card-drag-${activity.id}`,
    ) as unknown as {
      handlers: { onStart?: () => void; onFinalize?: () => void };
    };
    dragGesture.handlers.onStart?.();
    dragGesture.handlers.onFinalize?.();

    expect(onEndDrag).toHaveBeenCalledWith(activity.id, null);
  });

  it('keeps the source visible until lift, then collapses its stale empty space', () => {
    const screen = renderWithProviders(<ActiveDragColumn />);

    expect(screen.getByTestId(`kanban-card-source-${activity.id}`)).toHaveStyle(
      { opacity: 1 },
    );

    screen.rerender(<ActiveDragColumn hidden />);

    expect(screen.getByTestId(`kanban-card-source-${activity.id}`)).toHaveStyle(
      {
        opacity: 0,
        height: 0,
      },
    );
  });

  it('keeps the resting card handle-free while exposing an accessible move action', () => {
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

    expect(screen.queryByLabelText('Move Call Jenny')).toBeNull();

    fireEvent(screen.getByLabelText('Call Jenny'), 'accessibilityAction', {
      nativeEvent: { actionName: 'move' },
    });
    expect(onRequestMove).toHaveBeenCalledWith(activity.id);
    expect(onPressActivity).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Call Jenny'));
    expect(onPressActivity).toHaveBeenCalledWith(activity.id);
    expect(onRequestMove).toHaveBeenCalledTimes(1);
  });
});
