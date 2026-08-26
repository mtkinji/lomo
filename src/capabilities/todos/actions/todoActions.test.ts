import type { Activity } from '../../../domain/types';
import { activityFixture } from '../../../test/storeFixtures';
import {
  createTodo,
  deleteTodo,
  setTodoCompletion,
  updateTodo,
  type TodoActionStoreBoundary,
} from './todoActions';

function harness(initial: Activity[] = []) {
  let activities = [...initial];
  const store: TodoActionStoreBoundary = {
    getActivities: () => activities,
    addActivity: jest.fn((activity) => { activities = [...activities, activity]; }),
    updateActivity: jest.fn((id, updater) => {
      activities = activities.map((activity) => activity.id === id ? updater(activity) : activity);
    }),
    removeActivity: jest.fn((id) => { activities = activities.filter((activity) => activity.id !== id); }),
  };
  return { store, activities: () => activities };
}

const timestamp = '2026-08-26T18:00:00.000Z';

describe('To-do capability actions', () => {
  it('returns the same normalized create receipt for native UI and Chat inputs', () => {
    const activity = activityFixture({
      id: 'todo-1', title: 'Pack lunch', goalId: null, status: 'planned',
      createdAt: timestamp, updatedAt: timestamp,
    });
    const ui = harness();
    const chat = harness();

    const uiReceipt = createTodo({ activity }, ui.store);
    const chatReceipt = createTodo({ activity: { ...activity } }, chat.store);

    expect(uiReceipt).toEqual(chatReceipt);
    expect(uiReceipt).toMatchObject({
      operationId: 'activities.capture', status: 'completed',
      resultRefs: [{ kind: 'activity', id: 'todo-1' }], reversible: true,
    });
    expect(ui.activities()).toEqual([activity]);
  });

  it('completes and reopens through one canonical action', () => {
    const activity = activityFixture({
      id: 'todo-1', title: 'Pack lunch', status: 'planned', completedAt: null,
      updatedAt: 'before',
    });
    const { store, activities } = harness([activity]);

    const completed = setTodoCompletion({
      activityId: activity.id, completed: true, timestamp,
      expectedUpdatedAt: 'before',
    }, store);

    expect(completed.result).toMatchObject({ status: 'done', completedAt: timestamp, updatedAt: timestamp });
    expect(completed.previous).toBe(activity);
    expect(activities()[0]).toEqual(completed.result);

    const reopenedAt = '2026-08-26T18:05:00.000Z';
    const reopened = setTodoCompletion({
      activityId: activity.id, completed: false, timestamp: reopenedAt,
      expectedUpdatedAt: timestamp,
    }, store);
    expect(reopened.result).toMatchObject({ status: 'planned', completedAt: null, updatedAt: reopenedAt });
  });

  it('uses the same update action for a Chat patch and a UI transformation', () => {
    const activity = activityFixture({ id: 'todo-1', title: 'Pack lunch', updatedAt: 'before' });
    const { store } = harness([activity]);

    const receipt = updateTodo({
      activityId: activity.id,
      expectedUpdatedAt: 'before',
      update: (current) => ({ ...current, title: 'Pack lunches', updatedAt: timestamp }),
    }, store);

    expect(receipt.operationId).toBe('activities.update');
    expect(receipt.result.title).toBe('Pack lunches');
    expect(receipt.previous).toBe(activity);
  });

  it('requires an exact review version before delete and returns a reversible receipt', () => {
    const activity = activityFixture({ id: 'todo-1', title: 'Old task', updatedAt: 'before' });
    const { store, activities } = harness([activity]);

    expect(() => deleteTodo({ activityId: activity.id, expectedUpdatedAt: 'stale' }, store))
      .toThrow('changed after this action was prepared');

    const receipt = deleteTodo({ activityId: activity.id, expectedUpdatedAt: 'before' }, store);
    expect(receipt).toMatchObject({
      operationId: 'activities.delete', status: 'completed', result: activity,
      previous: activity, reversible: true,
    });
    expect(activities()).toEqual([]);
  });

  it('rejects a duplicate create instead of overwriting an existing To-do', () => {
    const activity = activityFixture({ id: 'todo-1', title: 'Existing' });
    const { store } = harness([activity]);
    expect(() => createTodo({ activity: { ...activity, title: 'Replacement' } }, store))
      .toThrow('already exists');
  });
});
