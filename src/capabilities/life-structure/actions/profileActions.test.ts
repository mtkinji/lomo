import type { UserProfile } from '../../../domain/types';
import { updateProfile, type ProfileActionStoreBoundary } from './profileActions';

const before: UserProfile = {
  id: 'profile-1', fullName: 'Andrew', createdAt: 'before', updatedAt: 'before',
  communication: {}, visuals: {},
};

function harness() {
  let profile: UserProfile | null = before;
  const store: ProfileActionStoreBoundary = {
    getProfile: () => profile,
    updateProfileAt: jest.fn((updater, updatedAt) => {
      if (profile) profile = { ...updater(profile), updatedAt };
    }),
  };
  return { store, profile: () => profile };
}

describe('Profile capability actions', () => {
  it('returns one normalized receipt for native and Chat callers', () => {
    const ui = harness();
    const chat = harness();
    const input = {
      profileId: before.id, expectedUpdatedAt: 'before', updatedAt: 'after',
      update: (profile: UserProfile) => ({ ...profile, fullName: 'Andy' }),
    };
    expect(updateProfile(input, ui.store)).toEqual(updateProfile(input, chat.store));
    expect(ui.profile()).toMatchObject({ fullName: 'Andy', updatedAt: 'after' });
  });

  it('rejects stale profile writes', () => {
    const { store } = harness();
    expect(() => updateProfile({
      profileId: before.id, expectedUpdatedAt: 'stale', updatedAt: 'after', update: (value) => value,
    }, store)).toThrow('changed after this action was prepared');
    expect(store.updateProfileAt).not.toHaveBeenCalled();
  });
});
