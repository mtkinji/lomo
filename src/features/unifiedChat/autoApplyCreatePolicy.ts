import type { UnifiedChatProposal, UnifiedChatThreadAggregate } from './types';

export function findAutoApplyCreateProposal(
  aggregate: UnifiedChatThreadAggregate,
  runId: string,
): UnifiedChatProposal | undefined {
  const run = aggregate.runs.find((candidate) => candidate.id === runId);
  if (run?.requestClass !== 'capability_action') return undefined;
  return (aggregate.proposals ?? []).find((proposal) =>
    proposal.runId === runId &&
    proposal.status === 'pending' &&
    proposal.operation.type === 'create_activity',
  );
}
