import type { AgeRange } from '../../domain/types';

export type ProfileMutationPatch = {
  fullName?: string | null;
  ageRange?: AgeRange | null;
};

export type ProfileProposalOperation = {
  type: 'update_profile'; targetId: string; expectedUpdatedAt: string; payload: ProfileMutationPatch;
};

const AGE_RANGES: readonly AgeRange[] = [
  'under-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65-plus', 'prefer-not-to-say',
];

export function parseProfileMutationPatch(value: unknown): ProfileMutationPatch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set(['fullName', 'ageRange']);
  if (Object.keys(input).length === 0 || Object.keys(input).some((key) => !allowed.has(key))) return null;
  const patch: ProfileMutationPatch = {};
  if ('fullName' in input) {
    if (input.fullName !== null &&
        (typeof input.fullName !== 'string' || input.fullName.trim().length > 160)) return null;
    patch.fullName = typeof input.fullName === 'string' ? input.fullName.trim() || null : null;
  }
  if ('ageRange' in input) {
    if (input.ageRange !== null && !AGE_RANGES.includes(input.ageRange as AgeRange)) return null;
    patch.ageRange = input.ageRange as AgeRange | null;
  }
  return patch;
}
