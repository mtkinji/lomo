import type { UnifiedChatRunStatus } from './types';

export type UnifiedChatProposalStatus =
  | 'pending'
  | 'edited'
  | 'rejected'
  | 'deferred'
  | 'approved'
  | 'applying'
  | 'applied'
  | 'failed'
  | 'undone';

type VersionedState<Status extends string> = {
  status: Status;
  version: number;
};

const RUN_TRANSITIONS: Record<UnifiedChatRunStatus, readonly UnifiedChatRunStatus[]> = {
  queued: ['active', 'stopped', 'failed'],
  active: ['steered', 'partial', 'stopped', 'complete', 'failed'],
  steered: ['active', 'partial', 'stopped', 'complete', 'failed'],
  partial: ['active', 'stopped', 'complete', 'failed'],
  stopped: [],
  complete: [],
  failed: [],
};

const PROPOSAL_TRANSITIONS: Record<
  UnifiedChatProposalStatus,
  readonly UnifiedChatProposalStatus[]
> = {
  pending: ['edited', 'rejected', 'deferred', 'approved'],
  edited: ['edited', 'rejected', 'deferred', 'approved'],
  deferred: ['edited', 'rejected', 'approved'],
  approved: ['applying'],
  applying: ['applied', 'failed'],
  failed: ['approved'],
  applied: ['undone'],
  rejected: [],
  undone: [],
};

export class StaleUnifiedChatVersionError extends Error {
  constructor(expectedVersion: number, actualVersion: number) {
    super(`Stale Unified Chat command: expected version ${expectedVersion}, found ${actualVersion}.`);
    this.name = 'StaleUnifiedChatVersionError';
  }
}

export class InvalidUnifiedChatTransitionError extends Error {
  constructor(entity: 'run' | 'proposal', from: string, to: string) {
    super(`Invalid Unified Chat ${entity} transition: ${from} -> ${to}.`);
    this.name = 'InvalidUnifiedChatTransitionError';
  }
}

function transition<Status extends string>(
  entity: 'run' | 'proposal',
  current: VersionedState<Status>,
  nextStatus: Status,
  expectedVersion: number,
  transitions: Record<Status, readonly Status[]>,
): VersionedState<Status> {
  if (current.version !== expectedVersion) {
    throw new StaleUnifiedChatVersionError(expectedVersion, current.version);
  }
  if (!transitions[current.status].includes(nextStatus)) {
    throw new InvalidUnifiedChatTransitionError(entity, current.status, nextStatus);
  }
  return { status: nextStatus, version: current.version + 1 };
}

export function transitionRun(
  current: VersionedState<UnifiedChatRunStatus>,
  nextStatus: UnifiedChatRunStatus,
  expectedVersion: number,
): VersionedState<UnifiedChatRunStatus> {
  return transition('run', current, nextStatus, expectedVersion, RUN_TRANSITIONS);
}

export function transitionProposal(
  current: VersionedState<UnifiedChatProposalStatus>,
  nextStatus: UnifiedChatProposalStatus,
  expectedVersion: number,
): VersionedState<UnifiedChatProposalStatus> {
  return transition('proposal', current, nextStatus, expectedVersion, PROPOSAL_TRANSITIONS);
}
