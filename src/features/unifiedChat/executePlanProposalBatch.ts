import type { UnifiedChatProposal } from './types';

type PlanProposal = Extract<UnifiedChatProposal, { capabilityId: 'plan' }>;

export type PlanProposalBatchItem = {
  proposalId: string;
  action: 'approve';
  expectedVersion: number;
};

export type PlanProposalBatchResult = {
  applied: string[];
  failed: Array<{ proposalId: string; message: string }>;
};

export async function executePlanProposalBatch({
  proposals,
  items,
  execute,
}: {
  proposals: UnifiedChatProposal[];
  items: PlanProposalBatchItem[];
  execute: (proposal: PlanProposal) => Promise<void>;
}): Promise<PlanProposalBatchResult> {
  const selected: PlanProposal[] = items.map((item) => {
    const proposal = proposals.find((candidate) => candidate.id === item.proposalId);
    if (
      !proposal ||
      proposal.capabilityId !== 'plan' ||
      proposal.status !== 'pending' ||
      proposal.version !== item.expectedVersion
    ) {
      throw new Error('One or more Plan recommendations changed. Review the latest suggestions and try again.');
    }
    return proposal;
  });

  const result: PlanProposalBatchResult = { applied: [], failed: [] };
  for (const proposal of selected) {
    try {
      await execute(proposal);
      result.applied.push(proposal.id);
    } catch (error) {
      result.failed.push({
        proposalId: proposal.id,
        message: error instanceof Error ? error.message : 'Kwilt could not add this item to Plan.',
      });
    }
  }
  return result;
}
