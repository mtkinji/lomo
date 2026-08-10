import {
  dismissGoalCheckinApproval,
  removePendingGoalCheckinItem,
  skipPendingGoalCheckin,
} from './goalCheckinLifecycleCommands';

function createDependencies(calls: string[]) {
  return {
    recordSkipped: ({ goalId, itemCount }: { goalId: string; itemCount: number }) => {
      calls.push(`skip-analytics:${goalId}:${itemCount}`);
    },
    markSkipped: (goalId: string) => calls.push(`skip-store:${goalId}`),
    recordItemRemoved: ({ goalId, itemId }: { goalId: string; itemId: string }) => {
      calls.push(`remove-analytics:${goalId}:${itemId}`);
    },
    removeItem: ({ goalId, itemId }: { goalId: string; itemId: string }) => {
      calls.push(`remove-store:${goalId}:${itemId}`);
    },
    hideApproval: () => calls.push('hide'),
    markDismissed: (goalId: string) => calls.push(`dismiss-store:${goalId}`),
    recordDismissed: (goalId: string) => calls.push(`dismiss-analytics:${goalId}`),
  };
}

describe('Goal check-in lifecycle commands', () => {
  it('skips with analytics before the store mutation', () => {
    const calls: string[] = [];

    skipPendingGoalCheckin(
      { goalId: 'goal-1', itemCount: 2 },
      createDependencies(calls),
    );

    expect(calls).toEqual(['skip-analytics:goal-1:2', 'skip-store:goal-1']);
  });

  it('removes an item with analytics before the store mutation', () => {
    const calls: string[] = [];

    removePendingGoalCheckinItem(
      { goalId: 'goal-1', itemId: 'item-1' },
      createDependencies(calls),
    );

    expect(calls).toEqual([
      'remove-analytics:goal-1:item-1',
      'remove-store:goal-1:item-1',
    ]);
  });

  it('dismisses by hiding, mutating, then recording analytics', () => {
    const calls: string[] = [];

    dismissGoalCheckinApproval('goal-1', createDependencies(calls));

    expect(calls).toEqual(['hide', 'dismiss-store:goal-1', 'dismiss-analytics:goal-1']);
  });

  it('keeps missing-goal commands inert except for hiding on dismiss', () => {
    const calls: string[] = [];
    const dependencies = createDependencies(calls);

    skipPendingGoalCheckin({ goalId: undefined, itemCount: 2 }, dependencies);
    removePendingGoalCheckinItem({ goalId: undefined, itemId: 'item-1' }, dependencies);
    dismissGoalCheckinApproval(undefined, dependencies);

    expect(calls).toEqual(['hide']);
  });
});
