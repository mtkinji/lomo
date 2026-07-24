import type { UserProfile } from '../../domain/types';
import type { UnifiedChatProposal } from './types';
import { applyApprovedProfileProposal, undoAppliedProfileProposal } from './profileProposalExecutor';

test('updates explicit profile fields and restores the whole prior profile', () => {
  const before: UserProfile = {
    id: 'profile-1', fullName: 'Andrew', ageRange: '35-44', createdAt: 'before', updatedAt: 'before',
    communication: {}, visuals: {},
  };
  let profile = before;
  const store = {
    getProfile: () => profile,
    updateProfileAt: (updater: (current: UserProfile) => UserProfile, updatedAt: string) => {
      profile = { ...updater(profile), updatedAt };
    },
  };
  const proposal = {
    id: 'proposal-profile', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'profile', title: 'Update your profile', body: 'Reviews profile changes.',
    status: 'approved', version: 2, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-profile', proposalId: 'proposal-profile', capabilityId: 'profile', type: 'update_profile',
      targetId: before.id, summary: 'Update profile', idempotencyKey: 'profile-1', sequence: 1,
      payload: { fullName: 'Andy', ageRange: null, expectedUpdatedAt: before.updatedAt },
    },
  } as UnifiedChatProposal;

  const receipt = applyApprovedProfileProposal({ proposal, store, now: () => 'applied' });
  expect(profile).toEqual({
    id: 'profile-1', fullName: 'Andy', createdAt: 'before', updatedAt: 'applied',
    communication: {}, visuals: {},
  });
  undoAppliedProfileProposal({ receipt, store, now: () => 'undone' });
  expect(profile).toEqual({ ...before, updatedAt: 'undone' });
});
