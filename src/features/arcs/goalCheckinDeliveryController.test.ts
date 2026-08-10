import { deliverGoalCheckin } from './goalCheckinDeliveryController';

function createDependencies(calls: string[]) {
  return {
    setBusy: (busy: boolean) => calls.push(`busy:${busy}`),
    submit: async ({ goalId, text }: { goalId: string; text: string }) => {
      calls.push(`submit:${goalId}:${text}`);
    },
    recordSuccess: ({ goalId, itemCount }: { goalId: string; itemCount: number }) => {
      calls.push(`success:${goalId}:${itemCount}`);
    },
    markDraftSent: (goalId: string) => calls.push(`mark:${goalId}`),
    recordCheckin: (goalId: string) => calls.push(`record:${goalId}`),
    refreshFeed: () => calls.push('refresh'),
    showSuccess: () => calls.push('toast'),
    recordFailure: ({ goalId, error }: { goalId: string; error: string }) => {
      calls.push(`failure:${goalId}:${error}`);
    },
    showFailure: (message: string) => calls.push(`alert:${message}`),
  };
}

describe('deliverGoalCheckin', () => {
  const request = { goalId: 'goal-1', text: 'A good day', itemCount: 2 };

  it('runs successful delivery effects in order and clears busy state', async () => {
    const calls: string[] = [];

    await deliverGoalCheckin(request, createDependencies(calls));

    expect(calls).toEqual([
      'busy:true',
      'submit:goal-1:A good day',
      'success:goal-1:2',
      'mark:goal-1',
      'record:goal-1',
      'refresh',
      'toast',
      'busy:false',
    ]);
  });

  it('reports submission failures and clears busy state', async () => {
    const calls: string[] = [];
    const dependencies = createDependencies(calls);
    dependencies.submit = async () => {
      calls.push('submit');
      throw new Error('Offline');
    };

    await deliverGoalCheckin(request, dependencies);

    expect(calls).toEqual([
      'busy:true',
      'submit',
      'failure:goal-1:Offline',
      'alert:Offline',
      'busy:false',
    ]);
  });

  it('normalizes non-Error failures', async () => {
    const calls: string[] = [];
    const dependencies = createDependencies(calls);
    dependencies.submit = async () => {
      throw 'offline';
    };

    await deliverGoalCheckin(request, dependencies);

    expect(calls).toContain('failure:goal-1:Failed to send check-in');
    expect(calls).toContain('alert:Failed to send check-in');
    expect(calls.at(-1)).toBe('busy:false');
  });
});
