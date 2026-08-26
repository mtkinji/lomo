import type { UserProfile } from '../../../domain/types';

export type ProfileActionStoreBoundary = {
  getProfile: () => UserProfile | null;
  updateProfileAt: (updater: (current: UserProfile) => UserProfile, updatedAt: string) => void;
};

export type ProfileActionReceipt = {
  operationId: 'profile.update';
  status: 'completed';
  resultRefs: readonly [{ kind: 'profile'; id: string }];
  reversible: true;
  result: UserProfile;
  previous: UserProfile;
};

export class ProfileActionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileActionConflictError';
  }
}

export function updateProfile(
  input: {
    profileId: string;
    expectedUpdatedAt?: string;
    updatedAt: string;
    update: (current: UserProfile) => UserProfile;
  },
  store: ProfileActionStoreBoundary,
): ProfileActionReceipt {
  const previous = store.getProfile();
  if (!previous || previous.id !== input.profileId) {
    throw new ProfileActionConflictError('The Profile is no longer available.');
  }
  if (input.expectedUpdatedAt !== undefined && previous.updatedAt !== input.expectedUpdatedAt) {
    throw new ProfileActionConflictError('The Profile changed after this action was prepared.');
  }
  store.updateProfileAt(input.update, input.updatedAt);
  const result = store.getProfile();
  if (!result || result.id !== input.profileId) {
    throw new ProfileActionConflictError('Kwilt could not save that Profile change.');
  }
  return {
    operationId: 'profile.update', status: 'completed',
    resultRefs: [{ kind: 'profile', id: result.id }], reversible: true,
    result, previous,
  };
}
