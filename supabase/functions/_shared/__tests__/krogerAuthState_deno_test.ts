import { assertEquals } from 'jsr:@std/assert@1';
import { validateKrogerStateClaims } from '../krogerAuthState.ts';

Deno.test('accepts a fresh Kroger state bound to a user and nonce', () => {
  assertEquals(validateKrogerStateClaims({ provider: 'kroger', userId: 'user-1', nonce: '11111111-1111-4111-8111-111111111111', issuedAt: 1_000 }, 601_000), {
    userId: 'user-1', nonce: '11111111-1111-4111-8111-111111111111',
  });
});

Deno.test('rejects expired, future, wrong-provider, and malformed state', () => {
  assertEquals(validateKrogerStateClaims({ provider: 'kroger', userId: 'u', nonce: '11111111-1111-4111-8111-111111111111', issuedAt: 1_000 }, 601_001), null);
  assertEquals(validateKrogerStateClaims({ provider: 'kroger', userId: 'u', nonce: '11111111-1111-4111-8111-111111111111', issuedAt: 2_000 }, 1_000), null);
  assertEquals(validateKrogerStateClaims({ provider: 'other', userId: 'u', nonce: '11111111-1111-4111-8111-111111111111', issuedAt: 1_000 }, 2_000), null);
  assertEquals(validateKrogerStateClaims(null, 2_000), null);
});
