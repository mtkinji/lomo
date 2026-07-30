import { defaultPlayerIdentity, normalizePlayerIdentity, type PlayerIdentity } from './playerIdentity';

export type GamePlayerProfile = {
  userId: string;
  displayName: string;
  identity: PlayerIdentity;
  createdAt: string;
  updatedAt: string;
};

export type GamePlayerProfileRow = {
  user_id: string;
  display_name: string;
  color_id: string | null;
  success_sound_id: string | null;
  failure_sound_id: string | null;
  created_at: string;
  updated_at: string;
};

const cleanName = (value: string) => value.trim().replace(/\s+/g, ' ') || 'You';

export function createDefaultGamePlayerProfile(userId: string, displayName: string, now: string): GamePlayerProfile {
  return { userId, displayName: cleanName(displayName), identity: defaultPlayerIdentity(0), createdAt: now, updatedAt: now };
}

export function gamePlayerProfileFromRow(row: GamePlayerProfileRow): GamePlayerProfile {
  return {
    userId: row.user_id,
    displayName: cleanName(row.display_name),
    identity: normalizePlayerIdentity({
      colorId: row.color_id,
      successSoundId: row.success_sound_id,
      failureSoundId: row.failure_sound_id,
    }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function gamePlayerProfileToRow(profile: GamePlayerProfile): GamePlayerProfileRow {
  const identity = normalizePlayerIdentity(profile.identity);
  return {
    user_id: profile.userId,
    display_name: cleanName(profile.displayName),
    color_id: identity.colorId,
    success_sound_id: identity.successSoundId,
    failure_sound_id: identity.failureSoundId,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

export function promoteIdentityToProfile(
  profile: GamePlayerProfile,
  source: { displayName: string; identity?: PlayerIdentity },
  now: string,
): GamePlayerProfile {
  return {
    ...profile,
    displayName: cleanName(source.displayName),
    identity: normalizePlayerIdentity(source.identity),
    updatedAt: now,
  };
}
