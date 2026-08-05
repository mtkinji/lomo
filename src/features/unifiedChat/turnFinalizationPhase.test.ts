import { finalizeUnifiedChatTurnFailurePhase } from './turnFinalizationPhase';
import type { UnifiedChatRun } from './types';

describe('finalizeUnifiedChatTurnFailurePhase', () => {
  test('persists a plain-language action boundary explanation', async () => {
    const run: UnifiedChatRun = {
      id: 'run-1', threadId: 'thread-1', userMessageId: 'message-1', assistantMessageId: null,
      status: 'active', errorCode: null, errorMessage: null,
      requestClass: 'capability_action', participatingCapabilities: ['plan'],
      contextPolicy: { usePrivateContext: true, reason: 'plan-action', clarification: null },
      version: 1, stopRequestedAt: null, steerCount: 0,
      createdAt: '2026-08-05T12:00:00.000Z', updatedAt: '2026-08-05T12:00:00.000Z',
      completedAt: null,
    };
    const transitionRunStatus = jest.fn().mockResolvedValue(undefined);

    await expect(finalizeUnifiedChatTurnFailurePhase({
      run,
      repository: { transitionRunStatus } as never,
      failureCode: 'action_outcome_missing',
      error: (message) => new Error(message),
      now: () => new Date('2026-08-05T12:00:05.000Z'),
    })).rejects.toThrow('Kwilt could not finish that response.');

    expect(transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: 'action_outcome_missing',
      event: expect.objectContaining({
        label: 'Plan change not ready',
        detail: "Kwilt didn't receive a reviewable Plan change, so nothing was changed.",
      }),
    }));
  });
});
