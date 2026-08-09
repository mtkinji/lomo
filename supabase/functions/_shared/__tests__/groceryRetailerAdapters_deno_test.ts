import { assertEquals, assertRejects, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildInstacartListPayload,
  createInstacartListLink,
  parseInstacartListLinkResponse,
  RetailerAdapterError,
} from '../groceryRetailerAdapters.ts';

const items = [
  { concept: 'whole milk', quantityMin: 1, quantityMax: 1, unit: 'gallon', note: null },
  { concept: 'apples', quantityMin: 4, quantityMax: 6, unit: 'each', note: 'Honeycrisp if available' },
];

Deno.test('builds a conservative Instacart list-link payload without choosing products', () => {
  assertEquals(buildInstacartListPayload('Kwilt groceries', items), {
    title: 'Kwilt groceries',
    link_type: 'shopping_list',
    expires_in: 30,
    line_items: [
      { name: 'whole milk', line_item_measurements: [{ quantity: 1, unit: 'gallon' }] },
      {
        name: 'apples',
        display_text: 'apples · Honeycrisp if available · Need 4–6 each',
        line_item_measurements: [{ quantity: 4, unit: 'each' }],
      },
    ],
  });
});

Deno.test('normalizes Kwilt units to supported Instacart measurements', () => {
  assertEquals(buildInstacartListPayload('List', [
    { concept: 'eggs', quantityMin: 6, quantityMax: null, unit: 'count', note: null },
    { concept: 'garlic', quantityMin: 2, quantityMax: null, unit: 'clove', note: null },
    { concept: 'olive oil', quantityMin: 30, quantityMax: null, unit: 'ml', note: null },
  ]).line_items, [
    { name: 'eggs', line_item_measurements: [{ quantity: 6, unit: 'each' }] },
    { name: 'garlic', display_text: '2 clove garlic' },
    { name: 'olive oil', line_item_measurements: [{ quantity: 30, unit: 'milliliter' }] },
  ]);
});

Deno.test('accepts only an https product link and captures provider request id', () => {
  assertEquals(parseInstacartListLinkResponse({ products_link_url: 'https://www.instacart.com/store/recipes/abc', request_id: 'req_1' }), {
    url: 'https://www.instacart.com/store/recipes/abc', providerRequestId: 'req_1',
  });
  assertThrows(() => parseInstacartListLinkResponse({ products_link_url: 'javascript:alert(1)' }), RetailerAdapterError, 'malformed_provider_response');
});

Deno.test('remote disable prevents a provider request', async () => {
  let called = false;
  await assertRejects(() => createInstacartListLink({ enabled: false, apiKey: 'secret', payload: buildInstacartListPayload('List', items), fetcher: () => { called = true; throw new Error('unexpected'); } }), RetailerAdapterError, 'provider_disabled');
  assertEquals(called, false);
});

Deno.test('maps rate limit, provider failure, malformed response, and timeout to safe errors', async () => {
  const payload = buildInstacartListPayload('List', items);
  await assertRejects(() => createInstacartListLink({ enabled: true, apiKey: 'secret', payload, fetcher: () => Promise.resolve(new Response('{}', { status: 429, headers: { 'retry-after': '30' } })) }), RetailerAdapterError, 'provider_rate_limited');
  await assertRejects(() => createInstacartListLink({ enabled: true, apiKey: 'secret', payload, fetcher: () => Promise.resolve(new Response('{}', { status: 500 })) }), RetailerAdapterError, 'provider_failed');
  await assertRejects(() => createInstacartListLink({ enabled: true, apiKey: 'secret', payload, fetcher: () => Promise.resolve(new Response('{}', { status: 200 })) }), RetailerAdapterError, 'malformed_provider_response');
  await assertRejects(() => createInstacartListLink({
    enabled: true, apiKey: 'secret', payload, timeoutMs: 1,
    fetcher: (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }),
  }), RetailerAdapterError, 'provider_timeout');
});

Deno.test('sends a server credential and returns the reviewed-product link', async () => {
  let authorization = '';
  let sentPayload: unknown = null;
  const before = Date.now();
  const result = await createInstacartListLink({
    enabled: true, apiKey: 'server-secret', payload: buildInstacartListPayload('List', items),
    fetcher: (_url, init) => {
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      sentPayload = JSON.parse(String(init?.body));
      return Promise.resolve(Response.json({ products_link_url: 'https://www.instacart.com/store/recipes/abc' }));
    },
  });
  assertEquals(authorization, 'Bearer server-secret');
  assertEquals(sentPayload, buildInstacartListPayload('List', items));
  assertEquals(result.url, 'https://www.instacart.com/store/recipes/abc');
  const expiresAt = Date.parse(result.expiresAt);
  assertEquals(expiresAt >= before + 29 * 24 * 60 * 60 * 1000, true);
  assertEquals(expiresAt <= before + 31 * 24 * 60 * 60 * 1000, true);
});
