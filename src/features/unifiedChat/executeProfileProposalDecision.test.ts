import type { UserProfile } from '../../domain/types';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import { executeProfileProposalDecision } from './executeProfileProposalDecision';

function proposal(): Extract<UnifiedChatProposal, { capabilityId: 'profile' }> {
  return {
    id: 'proposal-profile', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'profile', title: 'Update your profile', body: 'Changes the name.',
    status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-profile', proposalId: 'proposal-profile', capabilityId: 'profile', type: 'update_profile',
      targetId: 'profile-1', summary: 'Update profile', idempotencyKey: 'profile-1', sequence: 1,
      payload: { fullName: 'Andy', expectedUpdatedAt: 'before' },
    },
  };
}

test('reserves Profile undo before applying and finalizes the receipt', async () => {
  let profile: UserProfile = {
    id: 'profile-1', fullName: 'Andrew', createdAt: 'before', updatedAt: 'before',
    communication: {}, visuals: {},
  };
  const input = proposal();
  const receipt = (status: UnifiedChatMutationReceipt['status']): UnifiedChatMutationReceipt => ({
    id: 'receipt-profile', proposalId: input.id, operationId: input.operation.id,
    capabilityId: 'profile', idempotencyKey: 'profile-1', status,
    resultingObjectType: 'profile', resultingObjectId: profile.id, resultState: {}, returnTarget: null,
    undoOperation: null, canUndo: false, appliedAt: null, undoneAt: null,
  });
  const repository = {
    decideProposal: jest.fn(async () => ({ id: input.id, status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
    persistMutationReceipt: jest.fn(async () => receipt('reserved')),
    finalizeMutationReceipt: jest.fn(async () => receipt('applied')),
  };
  const store = {
    getProfile: () => profile,
    updateProfileAt: (updater: (current: UserProfile) => UserProfile, updatedAt: string) => {
      profile = { ...updater(profile), updatedAt };
    },
  };

  await executeProfileProposalDecision({ proposal: input, action: 'approve', repository, store, now: () => 'applied' });

  expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
    capabilityId: 'profile', status: 'reserved', undoOperation: expect.objectContaining({ type: 'restore_profile' }),
  }));
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
    'receipt-profile', expect.objectContaining({ undoOperation: expect.objectContaining({ type: 'restore_profile' }) }),
  );
  expect(profile).toMatchObject({ fullName: 'Andy', updatedAt: 'applied' });
});
