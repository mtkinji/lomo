import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  buildKrogerAuthorizationUrl,
  buildKrogerCartPayload,
  exchangeKrogerToken,
  parseKrogerProducts,
  RetailerAdapterError,
} from '../krogerAdapter.ts';

Deno.test('builds the exact customer cart scope and PKCE authorization request', () => {
  const url = new URL(buildKrogerAuthorizationUrl({
    clientId: 'client', redirectUri: 'https://example.supabase.co/functions/v1/kroger-auth', state: 'opaque', challenge: 'challenge',
  }));
  assertEquals(url.origin + url.pathname, 'https://api.kroger.com/v1/connect/oauth2/authorize');
  assertEquals(url.searchParams.get('scope'), 'cart.basic:write');
  assertEquals(url.searchParams.get('code_challenge_method'), 'S256');
});

Deno.test('uses basic auth server-side when exchanging the authorization code', async () => {
  let auth = '';
  let body = '';
  const result = await exchangeKrogerToken({
    clientId: 'client', clientSecret: 'secret', redirectUri: 'https://callback', code: 'code', verifier: 'verifier',
    fetcher: (_url, init) => {
      auth = new Headers(init?.headers).get('authorization') ?? '';
      body = String(init?.body);
      return Promise.resolve(Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 1800, scope: 'cart.basic:write', token_type: 'bearer' }));
    },
  });
  assertEquals(auth.startsWith('Basic '), true);
  assertEquals(body.includes('code_verifier=verifier'), true);
  assertEquals(result.scope, ['cart.basic:write']);
});

Deno.test('refuses a token response missing cart authority', async () => {
  await assertRejects(() => exchangeKrogerToken({
    clientId: 'client', clientSecret: 'secret', redirectUri: 'https://callback', code: 'code', verifier: 'verifier',
    fetcher: () => Promise.resolve(Response.json({ access_token: 'access', scope: 'product.compact' })),
  }), RetailerAdapterError, 'provider_scope_missing');
});

Deno.test('normalizes product proposals and only builds confirmed cart rows', () => {
  assertEquals(parseKrogerProducts({ data: [{ productId: 'p1', upc: '001', description: 'Milk', brand: 'Kroger', items: [{ size: '1 gal', price: { regular: 4, promo: 3.5 }, fulfillment: { curbside: true } }] }] }), [{
    id: 'p1', upc: '001', title: 'Milk', brand: 'Kroger', size: '1 gal', regularPriceCents: 400, promoPriceCents: 350, pickupAvailable: true,
  }]);
  assertEquals(buildKrogerCartPayload([{ upc: '001', quantity: 1 }]), { items: [{ upc: '001', quantity: 1, modality: 'PICKUP' }] });
});
