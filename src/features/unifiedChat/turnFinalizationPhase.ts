import type { AppControlOutcome } from '@kwilt/agent-runtime';
import type { UnifiedChatRepository } from './threadRepository';
import { transitionRun } from './runStateMachine';
import type { UnifiedChatRun } from './types';
import { getUnifiedChatFailureCopy } from './chatFailure';

type FinalizationRepository = Pick<UnifiedChatRepository, 'transitionRunStatus'>;

export async function finalizeUnifiedChatTurnPhase({
  run,
  assistantMessageId,
  outcome,
  repository,
  now = () => new Date(),
}: {
  run: UnifiedChatRun;
  assistantMessageId: string;
  outcome: AppControlOutcome;
  repository: FinalizationRepository;
  now?: () => Date;
}): Promise<void> {
  transitionRun(run, 'complete', run.version);
  await repository.transitionRunStatus({
    runId: run.id,
    fromStatus: 'active',
    toStatus: 'complete',
    expectedVersion: run.version,
    assistantMessageId,
    errorCode: null,
    errorMessage: null,
    completedAt: now().toISOString(),
    event: {
      type: 'response',
      status: 'complete',
      visibility: 'user',
      label: outcome.type === 'answer'
        ? 'Response ready'
        : outcome.type === 'clarification'
          ? 'Clarification needed'
        : outcome.type === 'applied'
          ? 'Change applied'
          : outcome.type === 'native_handoff'
            ? 'Ready for you'
            : 'Prepared a change for review',
      payload: { outcomeType: outcome.type },
    },
  });
}

export async function finalizeUnifiedChatTurnFailurePhase({
  run,
  repository,
  failureCode,
  signal,
  abortDisposition,
  error,
  now = () => new Date(),
  publicErrorMessage = 'Kwilt could not finish that response.',
}: {
  run: UnifiedChatRun;
  repository: FinalizationRepository;
  failureCode: string;
  signal?: AbortSignal;
  abortDisposition?: () => { type: 'stop' } | { type: 'steer'; prompt: string };
  error: (message: string) => Error;
  now?: () => Date;
  publicErrorMessage?: string;
}): Promise<never> {
  if (signal?.aborted) {
    const disposition = abortDisposition?.() ?? { type: 'stop' as const };
    const completedAt = now().toISOString();
    if (disposition.type === 'steer') {
      transitionRun(run, 'steered', run.version);
      await repository.transitionRunStatus({
        runId: run.id,
        fromStatus: 'active',
        toStatus: 'steered',
        expectedVersion: run.version,
        errorCode: null,
        errorMessage: null,
        completedAt,
        steerCount: (run.steerCount ?? 0) + 1,
        event: {
          type: 'instruction',
          status: 'warning',
          visibility: 'user',
          label: 'Direction updated',
          detail: 'Continuing with your new instruction.',
          payload: { prompt: disposition.prompt },
        },
      });
      throw error('Response steered.');
    }
    transitionRun(run, 'stopped', run.version);
    await repository.transitionRunStatus({
      runId: run.id,
      fromStatus: 'active',
      toStatus: 'stopped',
      expectedVersion: run.version,
      errorCode: null,
      errorMessage: null,
      completedAt,
      stopRequestedAt: completedAt,
      event: {
        type: 'response',
        status: 'warning',
        visibility: 'user',
        label: 'Response stopped',
      },
    });
    throw error('Response stopped.');
  }

  const failureCopy = getUnifiedChatFailureCopy({
    failureCode,
    participatingCapabilities: run.participatingCapabilities,
  });
  transitionRun(run, 'failed', run.version);
  await repository.transitionRunStatus({
    runId: run.id,
    fromStatus: 'active',
    toStatus: 'failed',
    expectedVersion: run.version,
    errorCode: failureCode,
    errorMessage: 'Kwilt could not finish that response.',
    completedAt: now().toISOString(),
    event: {
      type: 'response',
      status: 'failed',
      visibility: 'user',
      label: failureCopy.label,
      detail: failureCopy.detail,
    },
  });
  throw error(publicErrorMessage);
}
