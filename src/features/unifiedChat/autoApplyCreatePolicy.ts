import type { UnifiedChatProposal, UnifiedChatThreadAggregate } from './types';

export function findAutoApplyCreateProposal(
  aggregate: UnifiedChatThreadAggregate,
  runId: string,
): Extract<UnifiedChatProposal, { capabilityId: 'todos' }> | undefined {
  const run = aggregate.runs.find((candidate) => candidate.id === runId);
  if (run?.requestClass !== 'capability_action') return undefined;
  return (aggregate.proposals ?? []).find((proposal): proposal is Extract<UnifiedChatProposal, { capabilityId: 'todos' }> =>
    proposal.capabilityId === 'todos' &&
    proposal.runId === runId &&
    proposal.status === 'pending' &&
    proposal.operation.type === 'create_activity',
  );
}
