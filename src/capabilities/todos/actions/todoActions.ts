import type { Activity } from '../../../domain/types';

type TodoReadBoundary = {
  getActivities: () => readonly Activity[];
};

export type TodoCreateStoreBoundary = TodoReadBoundary & {
  addActivity: (activity: Activity) => void;
};

export type TodoUpdateStoreBoundary = TodoReadBoundary & {
  updateActivity: (activityId: string, updater: (current: Activity) => Activity) => void;
};

export type TodoDeleteStoreBoundary = TodoReadBoundary & {
  removeActivity: (activityId: string) => void;
};

export type TodoActionStoreBoundary = TodoCreateStoreBoundary & TodoUpdateStoreBoundary & TodoDeleteStoreBoundary;

export type TodoActionReceipt = {
  operationId: 'activities.capture' | 'activities.update' | 'activities.delete';
  status: 'completed';
  resultRefs: readonly [{ kind: 'activity'; id: string }];
  reversible: true;
  result: Activity;
  previous: Activity | null;
};

export class TodoActionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TodoActionConflictError';
  }
}

function receipt(
  operationId: TodoActionReceipt['operationId'],
  result: Activity,
  previous: Activity | null,
): TodoActionReceipt {
  return {
    operationId,
    status: 'completed',
    resultRefs: [{ kind: 'activity', id: result.id }],
    reversible: true,
    result,
    previous,
  };
}

function findRequiredActivity(store: TodoReadBoundary, activityId: string): Activity {
  const activity = store.getActivities().find((candidate) => candidate.id === activityId);
  if (!activity) throw new TodoActionConflictError('The To-do is no longer available.');
  return activity;
}

function assertExpectedVersion(activity: Activity, expectedUpdatedAt?: string): void {
  if (expectedUpdatedAt !== undefined && activity.updatedAt !== expectedUpdatedAt) {
    throw new TodoActionConflictError('The To-do changed after this action was prepared.');
  }
}

export function createTodo(
  input: { activity: Activity },
  store: TodoCreateStoreBoundary,
): TodoActionReceipt {
  const existing = store.getActivities().find((candidate) => candidate.id === input.activity.id);
  if (existing) {
    if (existing.title !== input.activity.title) {
      throw new TodoActionConflictError('A different To-do already exists with this id.');
    }
    return receipt('activities.capture', existing, null);
  }
  store.addActivity(input.activity);
  const created = findRequiredActivity(store, input.activity.id);
  return receipt('activities.capture', created, null);
}

export function updateTodo(
  input: {
    activityId: string;
    expectedUpdatedAt?: string;
    update: (current: Activity) => Activity;
  },
  store: TodoUpdateStoreBoundary,
): TodoActionReceipt {
  const previous = findRequiredActivity(store, input.activityId);
  assertExpectedVersion(previous, input.expectedUpdatedAt);
  store.updateActivity(input.activityId, input.update);
  const result = findRequiredActivity(store, input.activityId);
  return receipt('activities.update', result, previous);
}

export function setTodoCompletion(
  input: {
    activityId: string;
    completed: boolean;
    timestamp: string;
    expectedUpdatedAt?: string;
  },
  store: TodoUpdateStoreBoundary,
): TodoActionReceipt {
  return updateTodo({
    activityId: input.activityId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    update: (current) => ({
      ...current,
      status: input.completed ? 'done' : 'planned',
      completedAt: input.completed ? (current.completedAt ?? input.timestamp) : null,
      updatedAt: input.timestamp,
    }),
  }, store);
}

export function deleteTodo(
  input: { activityId: string; expectedUpdatedAt?: string },
  store: TodoDeleteStoreBoundary,
): TodoActionReceipt {
  const previous = findRequiredActivity(store, input.activityId);
  assertExpectedVersion(previous, input.expectedUpdatedAt);
  store.removeActivity(input.activityId);
  if (store.getActivities().some((candidate) => candidate.id === input.activityId)) {
    throw new TodoActionConflictError('The To-do could not be deleted.');
  }
  return receipt('activities.delete', previous, previous);
}
