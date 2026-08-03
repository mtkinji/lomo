import { Alert } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { renderWithProviders } from '../../test/renderWithProviders';
import { GoalTodoTableSection } from './GoalTodoTableSection';
import { parseGoalTodoTableText } from './goalTodoTable';

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: 'activity-1',
    goalId: 'goal-1',
    title: 'Naomi Peak',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    todoTableValues: { county: 'Cache', elevation: '9,984 ft' },
    ...overrides,
  };
}

function table() {
  const parsed = parseGoalTodoTableText(
    'County  High point  Elevation\nCache  Naomi Peak  9,984 ft',
    '2026-08-02T20:00:00.000Z',
  );
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.table;
}

describe('GoalTodoTableSection', () => {
  it('renders active and completed To-dos in the same table and toggles Activity completion', () => {
    const onToggleActivity = jest.fn();
    const activities = [
      activity({ id: 'naomi' }),
      activity({
        id: 'delano',
        title: 'Delano Peak',
        status: 'done',
        completedAt: '2026-07-01T12:00:00.000Z',
        todoTableValues: { county: 'Beaver', elevation: '12,169 ft' },
      }),
    ];
    const { getByText, getByLabelText } = renderWithProviders(
      <GoalTodoTableSection
        table={table()}
        activities={activities}
        editorVisible={false}
        onRequestEdit={jest.fn()}
        onEditorClose={jest.fn()}
        onSave={jest.fn()}
        onToggleActivity={onToggleActivity}
        onRemoveView={jest.fn()}
      />,
    );

    expect(getByText('Cache')).toBeTruthy();
    expect(getByText('Delano Peak')).toBeTruthy();
    expect(getByLabelText('Mark Delano Peak incomplete')).toBeTruthy();
    fireEvent.press(getByLabelText('Mark Naomi Peak complete'));
    expect(onToggleActivity).toHaveBeenCalledWith('naomi');
  });

  it('plans an import that updates matching To-dos and adds new ones', () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText } = renderWithProviders(
      <GoalTodoTableSection
        table={table()}
        activities={[activity({ id: 'naomi' })]}
        editorVisible
        onRequestEdit={jest.fn()}
        onEditorClose={jest.fn()}
        onSave={onSave}
        onToggleActivity={jest.fn()}
        onRemoveView={jest.fn()}
      />,
    );

    fireEvent.changeText(
      getByLabelText('To-do table source'),
      'County  High point  Elevation\nCache  Naomi Peak  9,984 ft\nBeaver  Delano Peak  12,169 ft',
    );
    fireEvent.press(getByText('Save'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        existingUpdates: [{ activityId: 'naomi', values: { county: 'Cache', elevation: '9,984 ft' } }],
        newRows: [{ title: 'Delano Peak', values: { county: 'Beaver', elevation: '12,169 ft' } }],
      }),
    );
  });

  it('shows validation and keeps the drawer open for malformed input', () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText } = renderWithProviders(
      <GoalTodoTableSection
        table={undefined}
        activities={[]}
        editorVisible
        onRequestEdit={jest.fn()}
        onEditorClose={jest.fn()}
        onSave={onSave}
        onToggleActivity={jest.fn()}
        onRemoveView={jest.fn()}
      />,
    );
    fireEvent.changeText(getByLabelText('To-do table source'), 'County  High point');
    fireEvent.press(getByText('Save'));
    expect(getByText('Add at least one To-do beneath the header.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('explains that removing the view keeps the To-dos', () => {
    const onRemoveView = jest.fn();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const { getByText } = renderWithProviders(
      <GoalTodoTableSection
        table={table()}
        activities={[activity({})]}
        editorVisible
        onRequestEdit={jest.fn()}
        onEditorClose={jest.fn()}
        onSave={jest.fn()}
        onToggleActivity={jest.fn()}
        onRemoveView={onRemoveView}
      />,
    );
    fireEvent.press(getByText('Remove table view'));
    expect(alert).toHaveBeenCalledWith(
      'Remove table view?',
      'The To-dos will stay in this goal and return to the normal list.',
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0]?.[2];
    const remove = Array.isArray(buttons) ? buttons.find((button) => button.text === 'Remove') : undefined;
    remove?.onPress?.();
    expect(onRemoveView).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });
});
