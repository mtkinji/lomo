import type { UnifiedChatClientAction } from './types';
import { executeClientActionDecision } from './executeClientActionDecision';

const pending: UnifiedChatClientAction = {
  id: 'client-action-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
  capabilityId: 'screenTime', actionType: 'configure_screen_time', targetType: null, targetId: null,
  title: 'Review Screen Time protection', consequenceSummary: 'Review Apple authorization.', payload: {},
  idempotencyKey: 'client-1', status: 'pending_client_action', result: null,
  errorCode: null, errorMessage: null, version: 1, presentedAt: null, completedAt: null,
  createdAt: 'before', updatedAt: 'before',
};

test('persists presenting before opening native review and records only that it opened', async () => {
  const order: string[] = [];
  const repository = {
    transitionClientAction: jest.fn(async (input) => {
      order.push(`persist:${input.toStatus}`);
      return {
        ...pending, status: input.toStatus, version: input.expectedVersion + 1,
        presentedAt: input.presentedAt ?? null, completedAt: input.completedAt ?? null,
      } as UnifiedChatClientAction;
    }),
  };
  const open = jest.fn(async () => { order.push('native:open'); });
  const times = ['presented', 'completed'];

  await executeClientActionDecision({
    clientAction: pending, decision: 'continue', repository, open, now: () => times.shift()!,
  });

  expect(order).toEqual(['persist:presenting', 'native:open', 'persist:completed']);
  expect(repository.transitionClientAction).toHaveBeenLastCalledWith(expect.objectContaining({
    toStatus: 'completed', result: { outcome: 'opened_native_review' },
  }));
});

test('declining never opens the native surface', async () => {
  const repository = {
    transitionClientAction: jest.fn(async (input) => ({
      ...pending, status: input.toStatus, version: 2,
    } as UnifiedChatClientAction)),
  };
  const open = jest.fn();
  await executeClientActionDecision({ clientAction: pending, decision: 'decline', repository, open });
  expect(open).not.toHaveBeenCalled();
  expect(repository.transitionClientAction).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'declined' }));
});

test('resumes an interrupted presenting action without reserving it twice', async () => {
  const presenting = { ...pending, status: 'presenting' as const, version: 2, presentedAt: 'presented' };
  const repository = {
    transitionClientAction: jest.fn(async (input) => ({
      ...presenting, status: input.toStatus, version: input.expectedVersion + 1,
    } as UnifiedChatClientAction)),
  };
  const open = jest.fn();

  await executeClientActionDecision({ clientAction: presenting, decision: 'continue', repository, open });

  expect(open).toHaveBeenCalledWith(presenting);
  expect(repository.transitionClientAction).toHaveBeenCalledTimes(1);
  expect(repository.transitionClientAction).toHaveBeenCalledWith(expect.objectContaining({
    fromStatus: 'presenting', toStatus: 'completed', expectedVersion: 2,
  }));
});
