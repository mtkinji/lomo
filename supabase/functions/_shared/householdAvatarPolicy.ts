export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AvatarMimeType = typeof AVATAR_MIME_TYPES[number];
export type AvatarSource = 'account' | 'dependent';
export type ResolvedAvatarSource = AvatarSource | 'initials';
export type AvatarAction =
  | 'resolve-self'
  | 'resolve-household'
  | 'init-upload'
  | 'confirm-upload'
  | 'remove';

const actions = new Set<AvatarAction>([
  'resolve-self',
  'resolve-household',
  'init-upload',
  'confirm-upload',
  'remove',
]);

export function parseAvatarAction(value: unknown): AvatarAction {
  if (typeof value !== 'string' || !actions.has(value as AvatarAction)) {
    throw new Error('invalid_avatar_action');
  }
  return value as AvatarAction;
}

export function parseAvatarSource(value: unknown): AvatarSource {
  if (value !== 'account' && value !== 'dependent') {
    throw new Error('invalid_avatar_source');
  }
  return value;
}

export function avatarExtensionForMimeType(value: unknown): 'jpg' | 'png' | 'webp' {
  if (value === 'image/jpeg') return 'jpg';
  if (value === 'image/png') return 'png';
  if (value === 'image/webp') return 'webp';
  throw new Error('unsupported_avatar_type');
}

export function validateAvatarObject(input: { mimeType: unknown; sizeBytes: unknown }): void {
  avatarExtensionForMimeType(input.mimeType);
  if (typeof input.sizeBytes !== 'number' || !Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error('invalid_avatar_size');
  }
  if (input.sizeBytes > MAX_AVATAR_BYTES) throw new Error('avatar_too_large');
}

export function resolveAvatarSource(
  accountStoragePath: string | null,
  providerAvatarUrl: string | null,
  dependentStoragePath: string | null,
): { avatarSource: ResolvedAvatarSource; storagePath: string | null; avatarUrl: string | null } {
  if (accountStoragePath) {
    return { avatarSource: 'account', storagePath: accountStoragePath, avatarUrl: null };
  }
  if (providerAvatarUrl) {
    try {
      const parsed = new URL(providerAvatarUrl);
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) {
        return { avatarSource: 'account', storagePath: null, avatarUrl: parsed.toString() };
      }
    } catch {
      // Invalid provider presentation metadata falls through to the managed image.
    }
  }
  if (dependentStoragePath) {
    return { avatarSource: 'dependent', storagePath: dependentStoragePath, avatarUrl: null };
  }
  return { avatarSource: 'initials', storagePath: null, avatarUrl: null };
}
