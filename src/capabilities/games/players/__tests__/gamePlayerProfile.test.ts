import {
  createDefaultGamePlayerProfile,
  gamePlayerProfileFromRow,
  gamePlayerProfileToRow,
  promoteIdentityToProfile,
} from '../gamePlayerProfile';

describe('game player profile', () => {
  test('maps owner-scoped rows and normalizes legacy identity values', () => {
    const profile = gamePlayerProfileFromRow({
      user_id: 'user-1', display_name: 'Olive', color_id: 'not-valid',
      success_sound_id: 'hawk', failure_sound_id: null,
      created_at: '2026-07-12T10:00:00.000Z', updated_at: '2026-07-12T10:00:00.000Z',
    });

    expect(profile).toEqual({
      userId: 'user-1', displayName: 'Olive',
      identity: { colorId: 'turmeric', successSoundId: 'hawk', failureSoundId: 'trombone' },
      createdAt: '2026-07-12T10:00:00.000Z', updatedAt: '2026-07-12T10:00:00.000Z',
    });
    expect(gamePlayerProfileToRow(profile)).toEqual({
      user_id: 'user-1', display_name: 'Olive', color_id: 'turmeric',
      success_sound_id: 'hawk', failure_sound_id: 'trombone',
      created_at: profile.createdAt, updated_at: profile.updatedAt,
    });
  });

  test('creates a usable self profile and explicitly promotes local choices', () => {
    const initial = createDefaultGamePlayerProfile('user-1', '', '2026-07-12T10:00:00.000Z');
    const promoted = promoteIdentityToProfile(initial, {
      displayName: '  Olive  ',
      identity: { colorId: 'rose', successSoundId: 'sparkle', failureSoundId: 'bonk' },
    }, '2026-07-12T11:00:00.000Z');

    expect(initial.displayName).toBe('You');
    expect(promoted).toMatchObject({
      userId: 'user-1', displayName: 'Olive',
      identity: { colorId: 'rose', successSoundId: 'sparkle', failureSoundId: 'bonk' },
      createdAt: initial.createdAt, updatedAt: '2026-07-12T11:00:00.000Z',
    });
  });
});
