import type { SupabaseClient } from '@supabase/supabase-js';
import { applyApprovedScreenTimeProposal } from './screenTimeProposalExecutor';
import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatThreadAggregate } from './types';

type Repository = Pick<
  UnifiedChatRepository,
  'finalizeMutationReceipt' | 'transitionProposalStatus' | 'loadThread'
>;

export async function recoverScreenTimeMutations({ aggregate, repository, client }: {
  aggregate: UnifiedChatThreadAggregate;
  repository: Repository;
  client: SupabaseClient;
}): Promise<UnifiedChatThreadAggregate> {
  let changed = false;
  for (const proposal of aggregate.proposals ?? []) {
    if (proposal.capabilityId !== 'screenTime' || proposal.status !== 'applying') continue;
    const receipt = (aggregate.receipts ?? []).find((candidate) => (
      candidate.proposalId === proposal.id && (candidate.status === 'reserved' || candidate.status === 'applied')
    ));
    if (!receipt) continue;

    try {
      if (receipt.status === 'reserved') {
        // Every Screen Time write RPC is keyed by the proposal operation ID, so replay
        // confirms the authoritative result without applying the policy twice.
        const appliedAt = receipt.appliedAt ?? new Date().toISOString();
        const result = await applyApprovedScreenTimeProposal({ proposal, client, now: new Date(appliedAt) });
        await repository.finalizeMutationReceipt(receipt.id, {
          capabilityId: 'screenTime',
          resultingObjectType: result.resultingObjectType,
          resultingObjectId: result.resultingObjectId,
          resultState: result.resultState,
          returnTarget: result.returnTarget,
          undoOperation: null,
          appliedAt,
        });
      }
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: proposal.version,
      });
    } catch {
      // A write can commit before its response or follow-up device snapshot fails.
      // Without authoritative evidence that nothing was saved, retain the reserved
      // receipt and applying proposal so the same idempotency key can be retried.
      continue;
    }
    changed = true;
  }
  return changed ? repository.loadThread(aggregate.thread.id) : aggregate;
}
