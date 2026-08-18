import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  avatarExtensionForMimeType,
  parseAvatarAction,
  parseAvatarSource,
  resolveAvatarSource,
  validateAvatarObject,
} from '../householdAvatarPolicy.ts';

Deno.test('avatar uploads accept only bounded image types and sizes', () => {
  for (const mimeType of ['image/jpeg', 'image/png', 'image/webp']) {
    assertEquals(validateAvatarObject({ mimeType, sizeBytes: 5 * 1024 * 1024 }), undefined);
  }
  assertThrows(() => validateAvatarObject({ mimeType: 'image/gif', sizeBytes: 10 }), Error, 'unsupported_avatar_type');
  assertThrows(() => validateAvatarObject({ mimeType: 'image/jpeg', sizeBytes: 5 * 1024 * 1024 + 1 }), Error, 'avatar_too_large');
  assertThrows(() => validateAvatarObject({ mimeType: 'image/jpeg', sizeBytes: 0 }), Error, 'invalid_avatar_size');
});

Deno.test('avatar path extensions are derived from accepted MIME, never filenames', () => {
  assertEquals(avatarExtensionForMimeType('image/jpeg'), 'jpg');
  assertEquals(avatarExtensionForMimeType('image/png'), 'png');
  assertEquals(avatarExtensionForMimeType('image/webp'), 'webp');
  assertThrows(() => avatarExtensionForMimeType('image/heic'), Error, 'unsupported_avatar_type');
});

Deno.test('avatar actions and sources use exact allowlists', () => {
  assertEquals(parseAvatarAction('resolve-household'), 'resolve-household');
  assertEquals(parseAvatarAction('confirm-upload'), 'confirm-upload');
  assertEquals(parseAvatarSource('account'), 'account');
  assertEquals(parseAvatarSource('dependent'), 'dependent');
  assertThrows(() => parseAvatarAction('list-all'));
  assertThrows(() => parseAvatarSource('provider'));
});

Deno.test('account source always precedes a managed dependent fallback', () => {
  const resolve = (...args: unknown[]) => Reflect.apply(resolveAvatarSource, null, args);
  assertEquals(resolve('account/path.jpg', 'https://images.example.invalid/provider.jpg', 'dependent/path.jpg'), {
    avatarSource: 'account', storagePath: 'account/path.jpg', avatarUrl: null,
  });
  assertEquals(resolve(null, 'https://images.example.invalid/provider.jpg', 'dependent/path.jpg'), {
    avatarSource: 'account', storagePath: null, avatarUrl: 'https://images.example.invalid/provider.jpg',
  });
  assertEquals(resolve(null, 'http://images.example.invalid/provider.jpg', 'dependent/path.jpg'), {
    avatarSource: 'dependent', storagePath: 'dependent/path.jpg', avatarUrl: null,
  });
  assertEquals(resolve(null, null, null), {
    avatarSource: 'initials', storagePath: null, avatarUrl: null,
  });
});
