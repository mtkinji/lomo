import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { registerProviderToken } from './providerTokenRegistration.ts';

Deno.test('provider token registration validates and stores a refresh token', async () => {
  let stored: unknown = null;
  const result = await registerProviderToken({ userId: 'user-1', token: 'refresh-secret', tokenKind: 'refresh_token' }, {
    encrypt: async () => ({ ciphertext: 'encrypted' }),
    store: async (record) => { stored = record; },
  });
  assertEquals(result, { ok: true });
  assertEquals(stored, { userId: 'user-1', tokenKind: 'refresh_token', tokenPayload: { ciphertext: 'encrypted' } });
});

Deno.test('provider token registration rejects missing or unsupported material', async () => {
  await assertRejects(() => registerProviderToken({ userId: '', token: 'x', tokenKind: 'refresh_token' }, {
    encrypt: async () => ({}), store: async () => undefined,
  }), Error, 'invalid_provider_token');
  await assertRejects(() => registerProviderToken({ userId: 'user-1', token: 'x', tokenKind: 'access_token' as never }, {
    encrypt: async () => ({}), store: async () => undefined,
  }), Error, 'invalid_provider_token');
});
