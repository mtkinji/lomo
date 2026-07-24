import type { UserProfile } from '../../domain/types';
import type { UnifiedChatProposal, UnifiedChatThreadAggregate } from './types';
import { recoverProfileMutations } from './recoverProfileMutations';

const before: UserProfile = {
  id: 'profile-1', fullName: 'Andrew', createdAt: 'before', updatedAt: 'before',
  communication: {}, visuals: {},
};
const proposal = {
  id: 'proposal-profile', threadId: 'thread-1', runId: 'run-1', messageId: null,
  capabilityId: 'profile', title: 'Update your profile', body: 'Changes name.',
  status: 'applying', version: 3, createdAt: 'now', updatedAt: 'now',
  operation: {
    id: 'operation-profile', proposalId: 'proposal-profile', capabilityId: 'profile', type: 'update_profile',
    targetId: before.id, summary: 'Update profile', idempotencyKey: 'profile-1', sequence: 1,
    payload: { fullName: 'Andy', expectedUpdatedAt: 'before' },
  },
} as UnifiedChatProposal;

function aggregate(status: 'reserved' | 'applied'): UnifiedChatThreadAggregate {
  return {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal], receipts: [{
      id: 'receipt-profile', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'profile', idempotencyKey: 'profile-1', status,
      resultingObjectType: 'profile', resultingObjectId: before.id,
      resultState: { fullName: 'Andy', ageRange: null, updatedAt: 'applied' }, returnTarget: {},
      undoOperation: { type: 'restore_profile', profile: before, expectedUpdatedAt: 'applied' },
      canUndo: status === 'applied', appliedAt: 'applied', undoneAt: null,
    }],
  };
}

test('finalizes an already-applied reserved Profile mutation without applying twice', async () => {
  let profile: UserProfile = { ...before, fullName: 'Andy', updatedAt: 'applied' };
  const input = aggregate('reserved');
  const loaded = { ...input, proposals: [{ ...proposal, status: 'applied' as const }] } as UnifiedChatThreadAggregate;
  const repository = {
    finalizeMutationReceipt: jest.fn(async () => ({})), failMutationReceipt: jest.fn(),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = {
    getProfile: () => profile,
    updateProfileAt: jest.fn((updater: (current: UserProfile) => UserProfile, updatedAt: string) => {
      profile = { ...updater(profile), updatedAt };
    }),
  };

  await expect(recoverProfileMutations({ aggregate: input, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.updateProfileAt).not.toHaveBeenCalled();
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledTimes(1);
});

test('completes an applying Profile proposal whose receipt was already finalized', async () => {
  const input = aggregate('applied');
  const loaded = { ...input, proposals: [{ ...proposal, status: 'applied' as const }] } as UnifiedChatThreadAggregate;
  const repository = {
    finalizeMutationReceipt: jest.fn(), failMutationReceipt: jest.fn(),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = { getProfile: () => ({ ...before, fullName: 'Andy', updatedAt: 'applied' }), updateProfileAt: jest.fn() };

  await expect(recoverProfileMutations({ aggregate: input, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.updateProfileAt).not.toHaveBeenCalled();
  expect(repository.finalizeMutationReceipt).not.toHaveBeenCalled();
  expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'applied' }));
});
