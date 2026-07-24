import type { UserProfile } from '../../domain/types';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import { parseProfileMutationPatch } from './profileProposal';

type ProfileProposal = Extract<UnifiedChatProposal, { capabilityId: 'profile' }>;

export type ProfileStoreBoundary = {
  getProfile: () => UserProfile | null;
  updateProfileAt: (updater: (current: UserProfile) => UserProfile, updatedAt: string) => void;
};

export type ProfileMutationReceipt = {
  proposalId: string;
  operationId: string;
  idempotencyKey: string;
  resultingObjectId: string;
  resultState: { fullName: string | null; ageRange: UserProfile['ageRange'] | null; updatedAt: string };
  returnTarget: Record<string, unknown>;
  undoOperation: { type: 'restore_profile'; profile: UserProfile; expectedUpdatedAt: string };
  appliedAt: string;
};

export class ProfileMutationConflictError extends Error {}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.id === 'string' && typeof profile.createdAt === 'string' &&
    typeof profile.updatedAt === 'string';
}

function computeProfileMutation(proposal: UnifiedChatProposal, store: ProfileStoreBoundary, appliedAt: string) {
  if (proposal.capabilityId !== 'profile' || proposal.operation.type !== 'update_profile' || proposal.status !== 'approved') {
    throw new ProfileMutationConflictError('This Profile proposal is not approved.');
  }
  const current = store.getProfile();
  if (!current || current.id !== proposal.operation.targetId ||
      current.updatedAt !== proposal.operation.payload.expectedUpdatedAt) {
    throw new ProfileMutationConflictError('The Profile changed after this proposal was prepared.');
  }
  const { expectedUpdatedAt: _expected, ...patch } = proposal.operation.payload;
  const next: UserProfile = { ...current, updatedAt: appliedAt };
  if ('fullName' in patch) {
    if (patch.fullName === null) delete next.fullName;
    else next.fullName = patch.fullName;
  }
  if ('ageRange' in patch) {
    if (patch.ageRange === null) delete next.ageRange;
    else next.ageRange = patch.ageRange;
  }
  return { current, next };
}

function receiptFor(proposal: ProfileProposal, current: UserProfile, next: UserProfile, appliedAt: string): ProfileMutationReceipt {
  return {
    proposalId: proposal.id,
    operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey,
    resultingObjectId: current.id,
    resultState: {
      fullName: next.fullName ?? null,
      ageRange: next.ageRange ?? null,
      updatedAt: next.updatedAt,
    },
    returnTarget: {
      capabilityId: 'profile', object: { type: 'profile', id: current.id }, label: 'Profile',
      route: { name: 'MainTabs', params: { screen: 'MoreTab', params: { screen: 'SettingsProfile' } } },
    },
    undoOperation: { type: 'restore_profile', profile: current, expectedUpdatedAt: next.updatedAt },
    appliedAt,
  };
}

export function prepareApprovedProfileProposal({ proposal, store, appliedAt }: {
  proposal: UnifiedChatProposal; store: ProfileStoreBoundary; appliedAt: string;
}): ProfileMutationReceipt {
  const { current, next } = computeProfileMutation(proposal, store, appliedAt);
  return receiptFor(proposal as ProfileProposal, current, next, appliedAt);
}

export function applyApprovedProfileProposal({ proposal, store, now = () => new Date().toISOString() }: {
  proposal: UnifiedChatProposal; store: ProfileStoreBoundary; now?: () => string;
}): ProfileMutationReceipt {
  const appliedAt = now();
  const { current, next } = computeProfileMutation(proposal, store, appliedAt);
  store.updateProfileAt(() => next, appliedAt);
  return receiptFor(proposal as ProfileProposal, current, next, appliedAt);
}

export function undoAppliedProfileProposal({ receipt, store, now = () => new Date().toISOString() }: {
  receipt: ProfileMutationReceipt; store: ProfileStoreBoundary; now?: () => string;
}): { undoneAt: string } {
  const current = store.getProfile();
  if (!current || current.id !== receipt.resultingObjectId ||
      current.updatedAt !== receipt.undoOperation.expectedUpdatedAt) {
    throw new ProfileMutationConflictError('The Profile changed after apply, so Kwilt will not overwrite it during undo.');
  }
  const undoneAt = now();
  store.updateProfileAt(() => ({ ...receipt.undoOperation.profile, updatedAt: undoneAt }), undoneAt);
  return { undoneAt };
}

export function hydrateProfileMutationReceipt(stored: UnifiedChatMutationReceipt): ProfileMutationReceipt | null {
  const undo = stored.undoOperation;
  const state = stored.resultState;
  if (stored.capabilityId !== 'profile' || stored.status !== 'applied' || undo?.type !== 'restore_profile' ||
      !isUserProfile(undo.profile) || typeof undo.expectedUpdatedAt !== 'string' ||
      typeof state.updatedAt !== 'string' ||
      !parseProfileMutationPatch({ ageRange: state.ageRange ?? null })) return null;
  return {
    proposalId: stored.proposalId, operationId: stored.operationId,
    idempotencyKey: stored.idempotencyKey, resultingObjectId: stored.resultingObjectId ?? '',
    resultState: {
      fullName: typeof state.fullName === 'string' ? state.fullName : null,
      ageRange: typeof state.ageRange === 'string' ? state.ageRange as UserProfile['ageRange'] : null,
      updatedAt: state.updatedAt,
    },
    returnTarget: stored.returnTarget ?? {},
    undoOperation: {
      type: 'restore_profile', profile: undo.profile as UserProfile,
      expectedUpdatedAt: undo.expectedUpdatedAt,
    },
    appliedAt: stored.appliedAt ?? state.updatedAt,
  };
}

export function recoverReservedProfileProposal({ receipt, proposal, store }: {
  receipt: UnifiedChatMutationReceipt; proposal: UnifiedChatProposal; store: ProfileStoreBoundary;
}): ProfileMutationReceipt {
  if (proposal.capabilityId !== 'profile' || receipt.status !== 'reserved' ||
      receipt.undoOperation?.type !== 'restore_profile' ||
      !isUserProfile(receipt.undoOperation.profile) ||
      typeof receipt.undoOperation.expectedUpdatedAt !== 'string') {
    throw new ProfileMutationConflictError('This Profile receipt cannot be recovered safely.');
  }
  const prior = receipt.undoOperation.profile as UserProfile;
  const existing = store.getProfile();
  const appliedAt = receipt.appliedAt ?? receipt.undoOperation.expectedUpdatedAt;
  if (existing?.id === proposal.operation.targetId &&
      existing.updatedAt === receipt.undoOperation.expectedUpdatedAt) {
    return receiptFor({ ...proposal, status: 'approved' } as ProfileProposal, prior, existing, appliedAt);
  }
  return applyApprovedProfileProposal({ proposal: { ...proposal, status: 'approved' }, store, now: () => appliedAt });
}
