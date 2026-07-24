import type { AgeRange, UserProfile } from '../../domain/types';

const AGE_RANGES = new Set<AgeRange>([
  'under-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65-plus', 'prefer-not-to-say',
]);

export type AgentProfileProjectionRow = {
  user_id: string;
  profile_id: string | null;
  full_name: string | null;
  age_range: AgeRange | null;
  profile_updated_at: string | null;
  updated_at: string;
};

export function buildAgentProfileProjectionRow({ userId, profile, now = () => new Date().toISOString() }: {
  userId: string; profile: UserProfile | null; now?: () => string;
}): AgentProfileProjectionRow {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('profile_projection_user_required');
  const profileId = typeof profile?.id === 'string' && profile.id.trim() ? profile.id.trim() : null;
  const profileUpdatedAt = typeof profile?.updatedAt === 'string' && Number.isFinite(Date.parse(profile.updatedAt))
    ? profile.updatedAt
    : null;
  return {
    user_id: normalizedUserId,
    profile_id: profileId,
    full_name: typeof profile?.fullName === 'string' && profile.fullName.trim()
      ? profile.fullName.trim().slice(0, 160)
      : null,
    age_range: profile?.ageRange && AGE_RANGES.has(profile.ageRange) ? profile.ageRange : null,
    profile_updated_at: profileId ? profileUpdatedAt : null,
    updated_at: now(),
  };
}

export function agentProfileProjectionSignature(profile: UserProfile | null): string {
  const row = buildAgentProfileProjectionRow({ userId: 'signature', profile, now: () => '' });
  return JSON.stringify({
    profileId: row.profile_id, fullName: row.full_name,
    ageRange: row.age_range, profileUpdatedAt: row.profile_updated_at,
  });
}
