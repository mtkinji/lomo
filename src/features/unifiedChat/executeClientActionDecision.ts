import type {
  TransitionUnifiedChatClientActionInput,
  UnifiedChatClientAction,
} from './types';

type Repository = {
  transitionClientAction: (input: TransitionUnifiedChatClientActionInput) => Promise<UnifiedChatClientAction>;
};

export async function executeClientActionDecision({
  clientAction,
  decision,
  repository,
  open,
  now = () => new Date().toISOString(),
}: {
  clientAction: UnifiedChatClientAction;
  decision: 'continue' | 'decline';
  repository: Repository;
  open: (action: UnifiedChatClientAction) => void | Promise<void>;
  now?: () => string;
}): Promise<void> {
  if (clientAction.status !== 'pending_client_action' && clientAction.status !== 'presenting') {
    throw new Error('This device action is no longer waiting for review.');
  }
  if (decision === 'decline') {
    const completedAt = now();
    await repository.transitionClientAction({
      actionId: clientAction.id, fromStatus: clientAction.status, toStatus: 'declined',
      expectedVersion: clientAction.version, result: { outcome: 'declined' }, completedAt,
    });
    return;
  }
  const presenting = clientAction.status === 'presenting'
    ? clientAction
    : await repository.transitionClientAction({
        actionId: clientAction.id, fromStatus: 'pending_client_action', toStatus: 'presenting',
        expectedVersion: clientAction.version, presentedAt: now(),
      });
  try {
    await open(presenting);
    const completedAt = now();
    await repository.transitionClientAction({
      actionId: presenting.id, fromStatus: 'presenting', toStatus: 'completed',
      expectedVersion: presenting.version, result: { outcome: 'opened_native_review' },
      presentedAt: presenting.presentedAt, completedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The native review surface could not be opened.';
    await repository.transitionClientAction({
      actionId: presenting.id, fromStatus: 'presenting', toStatus: 'failed',
      expectedVersion: presenting.version, errorCode: 'native_open_failed', errorMessage: message,
      presentedAt: presenting.presentedAt, completedAt: now(),
    });
    throw error;
  }
}
