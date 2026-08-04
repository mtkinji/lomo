import type { UnifiedChatProposal } from './types';

export type ProposalOutcomeBatchItem = {
  proposalId: string;
  action: 'approve';
  expectedVersion: number;
};

export type ProposalOutcomeBatchResult = {
  applied: string[];
  failed: Array<{ proposalId: string; message: string }>;
  skipped: Array<{ proposalId: string; reason: string }>;
};

export async function executeProposalOutcomeBatch({
  proposals,
  items,
  execute,
}: {
  proposals: UnifiedChatProposal[];
  items: ProposalOutcomeBatchItem[];
  execute: (proposal: UnifiedChatProposal) => Promise<void>;
}): Promise<ProposalOutcomeBatchResult> {
  const selected = items.map((item) => {
    const proposal = proposals.find((candidate) => candidate.id === item.proposalId);
    if (!proposal || proposal.status !== 'pending' || proposal.version !== item.expectedVersion) {
      throw new Error('One or more changes changed. Review the latest outcome and try again.');
    }
    return proposal;
  });
  const runIds = new Set(selected.map((proposal) => proposal.runId));
  if (runIds.size > 1) {
    throw new Error('Selected changes must belong to the same outcome.');
  }

  const ordered = selected.map((proposal, index) => ({ proposal, index })).sort((left, right) =>
    (left.proposal.operation.outcomeStep?.sequence ?? left.index + 1) -
      (right.proposal.operation.outcomeStep?.sequence ?? right.index + 1));
  const selectedSequences = new Set(ordered.map(({ proposal, index }) =>
    proposal.operation.outcomeStep?.sequence ?? index + 1));
  const stateBySequence = new Map<number, 'applied' | 'failed' | 'skipped'>();
  const result: ProposalOutcomeBatchResult = { applied: [], failed: [], skipped: [] };

  for (const { proposal, index } of ordered) {
    const sequence = proposal.operation.outcomeStep?.sequence ?? index + 1;
    const dependency = proposal.operation.outcomeStep?.dependsOnSequence ?? null;
    if (dependency !== null && !selectedSequences.has(dependency)) {
      result.skipped.push({
        proposalId: proposal.id,
        reason: 'Select its prerequisite to apply this change.',
      });
      stateBySequence.set(sequence, 'skipped');
      continue;
    }
    if (dependency !== null && stateBySequence.get(dependency) !== 'applied') {
      result.skipped.push({ proposalId: proposal.id, reason: 'Its prerequisite did not complete.' });
      stateBySequence.set(sequence, 'skipped');
      continue;
    }
    try {
      await execute(proposal);
      result.applied.push(proposal.id);
      stateBySequence.set(sequence, 'applied');
    } catch (error) {
      result.failed.push({
        proposalId: proposal.id,
        message: error instanceof Error ? error.message : 'Kwilt could not apply this change.',
      });
      stateBySequence.set(sequence, 'failed');
    }
  }
  return result;
}
